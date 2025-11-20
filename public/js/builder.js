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
          <div class="builder-logo" id="logoBtn" style="cursor: pointer;">gg.play</div>
          <div class="builder-nav">
            <button class="nav-tab active" id="gameBuilderTab">Game Builder</button>
            <button class="nav-tab disabled" id="dashboardTab">Dashboard</button>
          </div>
          <div class="builder-user">
            <span id="userEmail">${window.AppState.user?.email || ''}</span>
            <button id="logoutBtn" class="logout-btn">Logout</button>
          </div>
        </div>

        <div class="builder-content">
          <div class="view-mode-toggle">
            <button class="view-mode-btn disabled" id="view2DBtn">2D</button>
            <button class="view-mode-btn active" id="view3DBtn">3D</button>
          </div>

          <div class="game-builder-panel">
            <h2 class="panel-title">Game asset management</h2>

            <!-- Character Models Section -->
            <div class="asset-section">
              <h3 class="section-label">Upload your game character 3D models</h3>
              <div class="character-grid">
                <div class="asset-box upload-box" id="characterUploadBox">
                  <div id="uploadBoxContent" class="upload-box-content">
                    <div class="plus-icon">+</div>
                  </div>
                  <div id="previewBoxContent" class="preview-box-content" style="display: none;">
                    <div class="model-preview-icon">📦</div>
                    <div class="model-preview-name"></div>
                  </div>
                  <input type="file" id="fileInput" accept=".glb,.obj" style="display: none;">
                </div>
                <div class="asset-box placeholder-box"></div>
                <div class="asset-box placeholder-box"></div>
                <div class="asset-box placeholder-box"></div>
                <div class="asset-box placeholder-box"></div>
                <div class="asset-box placeholder-box"></div>
              </div>
            </div>

            <!-- Character Skins Section -->
            <div class="asset-section">
              <h3 class="section-label">Upload your game character skins</h3>
              <div class="skin-upload-bar disabled">
                <div class="plus-icon">+</div>
              </div>
            </div>

            <!-- Game Mode Section -->
            <div class="asset-section">
              <h3 class="section-label">Select the game mode</h3>
              <div class="game-mode-selector">
                <button class="game-mode-btn disabled">RPG</button>
                <button class="game-mode-btn disabled">Platformer</button>
                <button class="game-mode-btn active" id="shooterModeBtn">3rd person shooter</button>
              </div>
            </div>

            <!-- Game World Section -->
            <div class="asset-section">
              <h3 class="section-label">Select / Upload a game world</h3>
              <div class="world-grid">
                <div class="asset-box placeholder-box disabled"></div>
                <div class="asset-box placeholder-box disabled"></div>
                <div class="asset-box placeholder-box disabled"></div>
              </div>
            </div>

            <!-- File Info (shown after file selected) -->
            <div id="fileInfo" class="file-info-inline" style="display: none;">
              <div class="file-details">
                <span class="file-icon">📄</span>
                <div>
                  <div id="fileName" class="file-name"></div>
                  <div id="fileSize" class="file-size"></div>
                </div>
              </div>
              <button id="uploadBtn" class="upload-btn">Upload Model</button>
            </div>

            <!-- Build Section -->
            <div id="buildSection" class="build-section-inline" style="display: none;">
              <h3 class="section-label">Select Build Type</h3>
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

            <!-- Build Status -->
            <div id="buildStatus" class="build-status" style="display: none;">
              <h3>Build Progress</h3>
              <div class="progress-container">
                <div id="progressBar" class="progress-bar"></div>
              </div>
              <p id="statusText" class="status-text">Preparing...</p>
            </div>

            <!-- Download Section -->
            <div id="downloadSection" class="download-section" style="display: none;">
              <h3>✅ Build Complete!</h3>
              <a id="downloadLink" href="#" class="download-btn">Download Game</a>
            </div>

            <!-- Status Messages -->
            <div id="status" class="status-message" style="display: none;"></div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  },

  attachEventListeners() {
    const fileInput = document.getElementById('fileInput');
    const characterUploadBox = document.getElementById('characterUploadBox');
    const uploadBtn = document.getElementById('uploadBtn');
    const buildBtn = document.getElementById('buildBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const logoBtn = document.getElementById('logoBtn');

    // Logo click - go to landing
    if (logoBtn) {
      logoBtn.addEventListener('click', () => {
        window.AppState.navigateTo('landing');
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.AppState.logout();
      });
    }

    // Character upload box click
    if (characterUploadBox) {
      characterUploadBox.addEventListener('click', () => fileInput?.click());
    }

    // File selection
    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
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

    // Update first box to show preview
    const uploadBoxContent = document.getElementById('uploadBoxContent');
    const previewBoxContent = document.getElementById('previewBoxContent');
    const modelPreviewName = document.querySelector('.model-preview-name');
    const characterUploadBox = document.getElementById('characterUploadBox');
    
    if (uploadBoxContent) uploadBoxContent.style.display = 'none';
    if (previewBoxContent) previewBoxContent.style.display = 'flex';
    if (modelPreviewName) {
      const shortName = file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name;
      modelPreviewName.textContent = shortName;
    }
    if (characterUploadBox) characterUploadBox.classList.add('has-file');

    // Update bottom file info section
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
