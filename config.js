// ============================================
// UNITY GAME BUILDER CONFIGURATION
// ============================================
// 
// IMPORTANT: All values below are PLACEHOLDERS
// You MUST update these with actual values from your Unity developer
// before using this system in production.
//
// ============================================

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  // UNITY PROJECT SETTINGS (used by build worker)
  UNITY_PROJECT_PATH: process.env.UNITY_PROJECT_PATH || 'D:/New folder (40)/My project (1)',
  UNITY_EDITOR_PATH: process.env.UNITY_EDITOR_PATH || 'C:/Program Files/Unity/Hub/Editor/2022.3.0f1/Editor/Unity.exe',
  MODEL_TARGET_BASE: process.env.MODEL_TARGET_BASE || 'Assets/Resources/Character/Character',
  BUILD_OUTPUT_PATH: process.env.BUILD_OUTPUT_PATH || 'Builds/MyGame.exe',
  BUILD_METHOD: process.env.BUILD_METHOD || 'BuildScript.BuildGame',
  WEBGL_BUILD_OUTPUT_PATH: process.env.WEBGL_BUILD_OUTPUT_PATH || 'Builds/WebGL',
  WEBGL_BUILD_METHOD: process.env.WEBGL_BUILD_METHOD || 'BuildScript.BuildWebGL',
  BUILD_TYPE_EXE: 'exe',
  BUILD_TYPE_WEBGL: 'webgl',

  // AWS / INFRASTRUCTURE SETTINGS
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  UPLOADS_BUCKET: process.env.UPLOADS_BUCKET || 'your-uploads-bucket-name',
  BUILDS_BUCKET: process.env.BUILDS_BUCKET || 'your-builds-bucket-name',
  JOBS_TABLE_NAME: process.env.JOBS_TABLE_NAME || 'unity_build_jobs',
  JOBS_QUEUE_URL: process.env.JOBS_QUEUE_URL || 'https://sqs.your-region.amazonaws.com/123456789012/unity-build-jobs',
  UPLOAD_URL_TTL: parseNumber(process.env.UPLOAD_URL_TTL, 900), // seconds
  DOWNLOAD_URL_TTL: parseNumber(process.env.DOWNLOAD_URL_TTL, 900),

  // WORKER SETTINGS
  WORKER_POLL_INTERVAL: parseNumber(process.env.WORKER_POLL_INTERVAL, 5000), // ms
  WORKER_MAX_CONCURRENT_JOBS: parseNumber(process.env.WORKER_MAX_CONCURRENT_JOBS, 1),

  // Prebuilt executable (optional). When set, worker skips Unity build and uploads this file instead.
  PREBUILT_EXECUTABLE: process.env.PREBUILT_EXECUTABLE || null,
  
  // Prebuilt WebGL file (optional). When set, worker skips Unity WebGL build and uploads this file instead.
  // This is a temporary workaround until WebGL builds are fixed.
  PREBUILT_WEBGL: process.env.PREBUILT_WEBGL || 'D:/New folder (43).rar',

  // SERVER SETTINGS
  PORT: parseNumber(process.env.PORT, 3000)
};

