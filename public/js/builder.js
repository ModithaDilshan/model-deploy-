// Builder view - Game builder functionality
const BuilderView = {
  state: {
    selectedFile: null,
    uploadedAssetKey: null,
    currentJobId: null,
    statusPollInterval: null,
    selectedBuildType: 'exe'
  },

  ACCEPTED_FORMATS: ['.glb', '.obj'],
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB

  render(container) {
    container.innerHTML = `
      <div class="builder-page">
        <div class="builder-header">
          <div class="builder-logo">gg.play</div>
          <div class="builder-user">
            <span id="userEmail">${window.AppState.user?.email || ''}</span>
            <button id="logoutBtn" class="logout-btn">Logout</button>
          </div>
        </div>

        <div class="builder-container">
          <h1>Godot Game Builder</h1>
          <p class="subtitle">Upload your 3D character model and build a custom game</p>

          <div id="uploadArea" class="upload-area">
            <div class="upload-icon">📁</div>
            <p>Drag & drop your model file here</p>
            <p class="upload-hint">or</p>
            <button id="chooseFileBtn" class="choose-file-btn">Choose File</button>
            <input type="file" id="fileInput" accept=".glb,.obj" style="display: none;">
            <p class="file-requirements">Supported formats: .glb, .obj (max 100MB)</p>
          </div>

          <div id="fileInfo" class="file-info" style="display: none;">
            <div class="file-details">
              <span class="file-icon">📄</span>
              <div>
                <div id="fileName" class="file-name"></div>
                <div id="fileSize" class="file-size"></div>
              </div>
            </div>
            <button id="uploadBtn" class="upload-btn">Upload Model</button>
          </div>

          <div id="buildSection" class="build-section" style="display: none;">
            <h3>Select Build Type</h3>
            <div class="build-type-selector">
              <label class="build-type-option">
                <input type="radio" name="buildType" value="exe" checked>
                <span>Windows EXE</span>
              </label>
              <label class="build-type-option">
                <input type="radio" name="buildType" value="webgl">
                <span>WebGL (Browser)</span>
              </label>
            </div>
            <button id="buildBtn" class="build-btn">Build Game</button>
          </div>

          <div id="buildStatus" class="build-status" style="display: none;">
            <h3>Build Progress</h3>
            <div class="progress-container">
              <div id="progressBar" class="progress-bar"></div>
            </div>
            <p id="statusText" class="status-text">Preparing...</p>
          </div>

          <div id="downloadSection" class="download-section" style="display: none;">
            <h3>✅ Build Complete!</h3>
            <a id="downloadLink" href="#" class="download-btn">Download Game</a>
          </div>

          <div id="status" class="status-message" style="display: none;"></div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  },

  attachEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    const uploadArea = document.getElementById('uploadArea');
    const uploadBtn = document.getElementById('uploadBtn');
    const buildBtn = document.getElementById('buildBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.AppState.logout();
      });
    }

    // File selection
    if (chooseFileBtn) {
      chooseFileBtn.addEventListener('click', () => fileInput?.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) this.processSelectedFile(file);
      });
    }

    // Drag & drop
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', (event) => {
        event.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = event.dataTransfer.files[0];
        if (file) this.processSelectedFile(file);
      });
    }

    // Upload button
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.handleUploadClicked());
    }

    // Build button
    if (buildBtn) {
      buildBtn.addEventListener('click', () => this.handleBuildClicked());
    }

    // Build type selector
    const buildTypeRadios = document.querySelectorAll('input[name="buildType"]');
    buildTypeRadios.forEach(radio => {
      radio.addEventListener('change', (event) => {
        this.state.selectedBuildType = event.target.value;
      });
    });
  },

  processSelectedFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.ACCEPTED_FORMATS.includes(ext)) {
      this.showStatus('Invalid file type. Please upload .glb or .obj files.', 'error');
      return;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.showStatus('File too large. Maximum size is 100MB.', 'error');
      return;
    }

    this.state.selectedFile = file;
    this.state.uploadedAssetKey = null;
    this.state.currentJobId = null;

    const fileNameEl = document.getElementById('fileName');
    const fileSizeEl = document.getElementById('fileSize');
    const fileInfo = document.getElementById('fileInfo');
    const buildSection = document.getElementById('buildSection');
    const downloadSection = document.getElementById('downloadSection');
    const buildBtn = document.getElementById('buildBtn');

    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = this.formatFileSize(file.size);
    if (fileInfo) fileInfo.style.display = 'flex';
    if (buildSection) buildSection.style.display = 'none';
    if (downloadSection) downloadSection.style.display = 'none';
    if (buildBtn) {
      buildBtn.disabled = true;
      buildBtn.textContent = 'Build Game';
    }

    clearInterval(this.state.statusPollInterval);
    this.hideStatus();
  },

  async handleUploadClicked() {
    if (!this.state.selectedFile) {
      this.showStatus('Please select a file first.', 'error');
      return;
    }

    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';
    }

    this.showStatus('Requesting upload URL...', 'info');

    try {
      const uploadUrlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.AppState.token}`
        },
        body: JSON.stringify({
          fileName: this.state.selectedFile.name,
          fileType: this.state.selectedFile.type || 'application/octet-stream'
        })
      });

      const uploadUrlData = await uploadUrlResponse.json();
      if (!uploadUrlResponse.ok || !uploadUrlData.success) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      this.showStatus('Uploading model to storage...', 'info');

      const s3UploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': this.state.selectedFile.type || 'application/octet-stream'
        },
        body: this.state.selectedFile
      });

      if (!s3UploadResponse.ok) {
        throw new Error('Upload to S3 failed');
      }

      this.state.uploadedAssetKey = uploadUrlData.assetKey;
      this.showStatus('Model uploaded successfully! You can now start a build.', 'success');

      const buildSection = document.getElementById('buildSection');
      const buildBtn = document.getElementById('buildBtn');
      if (buildSection) buildSection.style.display = 'block';
      if (buildBtn) buildBtn.disabled = false;
    } catch (error) {
      console.error('Upload error:', error);
      this.showStatus(`Upload failed: ${error.message}`, 'error');
    } finally {
      if (uploadBtn) {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload Model';
      }
    }
  },

  async handleBuildClicked() {
    if (!this.state.uploadedAssetKey) {
      this.showStatus('Please upload a model before starting a build.', 'error');
      return;
    }

    const buildBtn = document.getElementById('buildBtn');
    const buildStatus = document.getElementById('buildStatus');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');

    if (buildBtn) {
      buildBtn.disabled = true;
      buildBtn.textContent = 'Building...';
    }

    if (buildStatus) buildStatus.style.display = 'block';
    if (progressBar) progressBar.style.width = '15%';
    if (statusText) statusText.textContent = 'Queuing build job...';

    this.showStatus('Build started. This may take several minutes.', 'info');

    try {
      const buildTypeRadio = document.querySelector('input[name="buildType"]:checked');
      const buildType = buildTypeRadio ? buildTypeRadio.value : 'exe';

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.AppState.token}`
        },
        body: JSON.stringify({
          assetKey: this.state.uploadedAssetKey,
          originalFileName: this.state.selectedFile ? this.state.selectedFile.name : null,
          buildType: buildType
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create build job');
      }

      this.state.currentJobId = result.job.jobId;
      this.startStatusPolling();
    } catch (error) {
      console.error('Build start error:', error);
      this.showStatus(`Failed to start build: ${error.message}`, 'error');
      if (buildBtn) {
        buildBtn.disabled = false;
        buildBtn.textContent = 'Build Game';
      }
      if (buildStatus) buildStatus.style.display = 'none';
    }
  },

  startStatusPolling() {
    clearInterval(this.state.statusPollInterval);
    this.state.statusPollInterval = setInterval(() => this.checkJobStatus(), 4000);
    this.checkJobStatus();
  },

  async checkJobStatus() {
    if (!this.state.currentJobId) return;

    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(this.state.currentJobId)}`, {
        headers: {
          'Authorization': `Bearer ${window.AppState.token}`
        }
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch job status');
      }

      const job = result.job;
      this.updateProgress(job);

      if (job.status === 'completed') {
        clearInterval(this.state.statusPollInterval);
        await this.handleCompletedJob(job);
      } else if (job.status === 'failed') {
        clearInterval(this.state.statusPollInterval);
        this.handleFailedJob(job);
      }
    } catch (error) {
      console.error('Status polling error:', error);
    }
  },

  updateProgress(job) {
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');
    const buildType = job.buildType || 'exe';
    const buildTypeLabel = buildType === 'webgl' ? 'Web' : 'EXE';

    let statusMessage = 'Preparing build...';
    let progress = '15%';

    switch (job.status) {
      case 'queued':
        statusMessage = `Waiting in queue... (${buildTypeLabel})`;
        progress = '25%';
        break;
      case 'processing':
        statusMessage = `Building ${buildTypeLabel}...`;
        progress = '65%';
        break;
      case 'completed':
        statusMessage = 'Build completed!';
        progress = '100%';
        break;
      case 'failed':
        statusMessage = 'Build failed';
        progress = '0%';
        break;
    }

    if (statusText) statusText.textContent = statusMessage;
    if (progressBar) progressBar.style.width = progress;
  },

  async handleCompletedJob(job) {
    const buildBtn = document.getElementById('buildBtn');
    if (buildBtn) {
      buildBtn.disabled = false;
      buildBtn.textContent = 'Build Game';
    }

    this.showStatus('Build completed! Preparing your download...', 'success');

    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(job.jobId)}/download`, {
        headers: {
          'Authorization': `Bearer ${window.AppState.token}`
        }
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to generate download link');
      }

      const downloadLink = document.getElementById('downloadLink');
      const downloadSection = document.getElementById('downloadSection');
      const statusText = document.getElementById('statusText');

      if (downloadLink) {
        downloadLink.href = result.downloadUrl;

        const buildType = job.buildType || 'exe';
        if (buildType === 'webgl') {
          downloadLink.textContent = 'Download Web Build (ZIP)';
          downloadLink.download = 'MyGame-Web.zip';

          // Add WebGL instructions
          const existingInstructions = downloadSection?.querySelector('.webgl-instructions');
          if (existingInstructions) existingInstructions.remove();

          const instructionsDiv = document.createElement('div');
          instructionsDiv.className = 'webgl-instructions';
          instructionsDiv.innerHTML = `
            <strong>📦 Web Hosting Instructions:</strong><br>
            1. Extract the ZIP file after downloading<br>
            2. Upload the folder contents to any static web host<br>
            3. Launch the game via the included index.html<br>
            4. Ensure your host serves .wasm, .pck, and .data files with correct MIME types
          `;
          downloadSection?.appendChild(instructionsDiv);
        } else {
          downloadLink.textContent = 'Download Game (EXE)';
          downloadLink.download = 'MyGame.exe';

          const existingInstructions = downloadSection?.querySelector('.webgl-instructions');
          if (existingInstructions) existingInstructions.remove();
        }
      }

      if (downloadSection) downloadSection.style.display = 'block';
      if (statusText) statusText.textContent = 'Ready to download';
    } catch (error) {
      console.error('Download link error:', error);
      this.showStatus(`Build completed but download link failed: ${error.message}`, 'error');
    }
  },

  handleFailedJob(job) {
    const buildBtn = document.getElementById('buildBtn');
    const buildStatus = document.getElementById('buildStatus');

    if (buildBtn) {
      buildBtn.disabled = false;
      buildBtn.textContent = 'Build Game';
    }
    if (buildStatus) buildStatus.style.display = 'none';

    const errorMessage = job.errorMessage || 'Unknown error';
    this.showStatus(`Build failed: ${errorMessage}`, 'error');
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  },

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message ${type}`;
      statusDiv.style.display = 'block';
    }
  },

  hideStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }
};

// Export to window
window.BuilderView = BuilderView;
