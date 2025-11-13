// State
let selectedFile = null;
let uploadedAssetKey = null;
let currentJobId = null;
let statusPollInterval = null;
let selectedBuildType = 'exe'; // Default to 'exe'

// Elements
const fileInput = document.getElementById('fileInput');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInfo = document.getElementById('fileInfo');
const fileNameEl = document.getElementById('fileName');
const fileSizeEl = document.getElementById('fileSize');
const uploadBtn = document.getElementById('uploadBtn');
const buildSection = document.getElementById('buildSection');
const buildBtn = document.getElementById('buildBtn');
const buildStatus = document.getElementById('buildStatus');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const statusDiv = document.getElementById('status');
const downloadSection = document.getElementById('downloadSection');
const downloadLink = document.getElementById('downloadLink');

const ACCEPTED_FORMATS = ['.fbx', '.obj'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Initialise
window.addEventListener('DOMContentLoaded', () => {
  initListeners();
});

function initListeners() {
  chooseFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) processSelectedFile(file);
  });

  uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = event.dataTransfer.files[0];
    if (file) processSelectedFile(file);
  });

  uploadBtn.addEventListener('click', handleUploadClicked);
  buildBtn.addEventListener('click', handleBuildClicked);
  
  // Build type selector listeners
  const buildTypeRadios = document.querySelectorAll('input[name="buildType"]');
  buildTypeRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
      selectedBuildType = event.target.value;
    });
  });
}

function processSelectedFile(file) {
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ACCEPTED_FORMATS.includes(ext)) {
    showStatus('Invalid file type. Please upload .fbx or .obj files.', 'error');
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showStatus('File too large. Maximum size is 100MB.', 'error');
    return;
  }

  selectedFile = file;
  uploadedAssetKey = null;
  currentJobId = null;
  fileNameEl.textContent = file.name;
  fileSizeEl.textContent = formatFileSize(file.size);
  fileInfo.style.display = 'flex';
  buildSection.style.display = 'none';
  downloadSection.style.display = 'none';
  clearInterval(statusPollInterval);
  buildBtn.disabled = true;
  buildBtn.textContent = 'Build Game';
  hideStatus();
}

async function handleUploadClicked() {
  if (!selectedFile) {
    showStatus('Please select a file first.', 'error');
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  showStatus('Requesting upload URL...', 'info');

  try {
    const uploadUrlResponse = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/octet-stream'
      })
    });

    const uploadUrlData = await uploadUrlResponse.json();
    if (!uploadUrlResponse.ok || !uploadUrlData.success) {
      throw new Error(uploadUrlData.error || 'Failed to get upload URL');
    }

    showStatus('Uploading model to storage...', 'info');

    const s3UploadResponse = await fetch(uploadUrlData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': selectedFile.type || 'application/octet-stream'
      },
      body: selectedFile
    });

    if (!s3UploadResponse.ok) {
      throw new Error('Upload to S3 failed');
    }

    uploadedAssetKey = uploadUrlData.assetKey;
    showStatus('Model uploaded successfully! You can now start a build.', 'success');
    buildSection.style.display = 'block';
    buildBtn.disabled = false;
  } catch (error) {
    console.error('Upload error:', error);
    showStatus(`Upload failed: ${error.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Model';
  }
}

async function handleBuildClicked() {
  if (!uploadedAssetKey) {
    showStatus('Please upload a model before starting a build.', 'error');
    return;
  }

  buildBtn.disabled = true;
  buildBtn.textContent = 'Building...';
  buildStatus.style.display = 'block';
  progressBar.style.width = '15%';
  statusText.textContent = 'Queuing build job...';
  showStatus('Build started. This may take several minutes.', 'info');

  try {
    // Get selected build type
    const buildTypeRadio = document.querySelector('input[name="buildType"]:checked');
    const buildType = buildTypeRadio ? buildTypeRadio.value : 'exe';
    
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetKey: uploadedAssetKey,
        originalFileName: selectedFile ? selectedFile.name : null,
        buildType: buildType
      })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to create build job');
    }

    currentJobId = result.job.jobId;
    startStatusPolling();
  } catch (error) {
    console.error('Build start error:', error);
    showStatus(`Failed to start build: ${error.message}`, 'error');
    buildBtn.disabled = false;
    buildBtn.textContent = 'Build Game';
    buildStatus.style.display = 'none';
  }
}

function startStatusPolling() {
  clearInterval(statusPollInterval);
  statusPollInterval = setInterval(checkJobStatus, 4000);
  checkJobStatus();
}

async function checkJobStatus() {
  if (!currentJobId) return;

  try {
    const response = await fetch(`/api/jobs?jobId=${encodeURIComponent(currentJobId)}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch job status');
    }

    const job = result.job;
    updateProgress(job);

    if (job.status === 'completed') {
      clearInterval(statusPollInterval);
      await handleCompletedJob(job);
    } else if (job.status === 'failed') {
      clearInterval(statusPollInterval);
      handleFailedJob(job);
    }
  } catch (error) {
    console.error('Status polling error:', error);
  }
}

function updateProgress(job) {
  const buildType = job.buildType || 'exe';
  const buildTypeLabel = buildType === 'webgl' ? 'WebGL' : 'EXE';
  
  switch (job.status) {
    case 'queued':
      statusText.textContent = `Waiting in queue... (${buildTypeLabel})`;
      progressBar.style.width = '25%';
      break;
    case 'processing':
      statusText.textContent = `Building ${buildTypeLabel}...`;
      progressBar.style.width = '65%';
      break;
    case 'completed':
      statusText.textContent = 'Build completed!';
      progressBar.style.width = '100%';
      break;
    case 'failed':
      statusText.textContent = 'Build failed';
      progressBar.style.width = '0%';
      break;
    default:
      statusText.textContent = 'Preparing build...';
      progressBar.style.width = '15%';
  }
}

async function handleCompletedJob(job) {
  buildBtn.disabled = false;
  buildBtn.textContent = 'Build Game';
  showStatus('Build completed! Preparing your download...', 'success');

  try {
    const response = await fetch(`/api/jobs/download?jobId=${encodeURIComponent(job.jobId)}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to generate download link');
    }

    downloadLink.href = result.downloadUrl;
    
    // Update download link text and add instructions based on build type
    const buildType = job.buildType || 'exe';
    if (buildType === 'webgl') {
      downloadLink.textContent = 'Download Web Build (ZIP)';
      downloadLink.download = 'MyGame-WebGL.zip';
      
      // Add WebGL hosting instructions
      const instructionsDiv = document.createElement('div');
      instructionsDiv.className = 'webgl-instructions';
      instructionsDiv.style.marginTop = '20px';
      instructionsDiv.style.padding = '15px';
      instructionsDiv.style.background = '#e3f2fd';
      instructionsDiv.style.borderRadius = '8px';
      instructionsDiv.style.fontSize = '0.9em';
      instructionsDiv.style.color = '#1565c0';
      instructionsDiv.innerHTML = `
        <strong>📦 WebGL Hosting Instructions:</strong><br>
        1. Extract the ZIP file after downloading<br>
        2. Upload all extracted files to your web server<br>
        3. Access the game via the index.html file<br>
        4. Make sure your server supports serving .wasm and .data files
      `;
      
      // Remove existing instructions if any
      const existingInstructions = downloadSection.querySelector('.webgl-instructions');
      if (existingInstructions) {
        existingInstructions.remove();
      }
      
      downloadSection.appendChild(instructionsDiv);
    } else {
      downloadLink.textContent = 'Download Game (EXE)';
      downloadLink.download = 'MyGame.exe';
      
      // Remove WebGL instructions if present
      const existingInstructions = downloadSection.querySelector('.webgl-instructions');
      if (existingInstructions) {
        existingInstructions.remove();
      }
    }
    
    downloadSection.style.display = 'block';
    buildSection.scrollIntoView({ behavior: 'smooth' });
    statusText.textContent = 'Ready to download';
  } catch (error) {
    console.error('Download link error:', error);
    showStatus(`Build completed but download link failed: ${error.message}`, 'error');
  }
}

function handleFailedJob(job) {
  buildBtn.disabled = false;
  buildBtn.textContent = 'Build Game';
  buildStatus.style.display = 'none';
  const errorMessage = job.errorMessage || 'Unknown error';
  showStatus(`Build failed: ${errorMessage}`, 'error');
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';
}

function hideStatus() {
  statusDiv.style.display = 'none';
}

