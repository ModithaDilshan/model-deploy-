// ============================================
// GODOT GAME BUILDER CONFIGURATION
// ============================================
//
// IMPORTANT: All values below are PLACEHOLDERS.
// Update them with the real paths/IDs used by your Godot build worker.
//
// ============================================

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseList = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback;
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

module.exports = {
  // GODOT PROJECT SETTINGS (used by build worker)
  GODOT_PROJECT_PATH: process.env.GODOT_PROJECT_PATH || 'D:/New folder (40)/new-game-project',
  GODOT_EDITOR_PATH: process.env.GODOT_EDITOR_PATH || 'C:/Program Files/Godot/Godot_v4.3-stable_win64.exe',
  GODOT_IMPORTED_MODEL_PATH: process.env.GODOT_IMPORTED_MODEL_PATH || 'Imported/user_model.glb',
  GODOT_EXPORT_PRESET_WIN: process.env.GODOT_EXPORT_PRESET_WIN || 'Windows Desktop',
  GODOT_EXPORT_PRESET_WEB: process.env.GODOT_EXPORT_PRESET_WEB || 'Web',
  GODOT_WINDOWS_OUTPUT_NAME: process.env.GODOT_WINDOWS_OUTPUT_NAME || 'MyGame.exe',
  GODOT_WEB_OUTPUT_NAME: process.env.GODOT_WEB_OUTPUT_NAME || 'index.html',
  SUPPORTED_MODEL_FORMATS: parseList(process.env.SUPPORTED_MODEL_FORMATS, ['glb', 'obj']),
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

  // MONGODB SETTINGS
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://ggplay_user:Vy0wUwcBuplLkrGg@cluster01.66soisj.mongodb.net/ggplay',

  // AUTHENTICATION SETTINGS
  JWT_SECRET: process.env.JWT_SECRET || '9dd2650e6060dda4f64ee125c6967de700e42d1a3555f6e43ae0625a19aecd2e19eca2a0729b62c7ce33888eda257d4f2df5b1e9f98c0fbdb27a2fcbe447db5a',

  // SERVER SETTINGS
  PORT: parseNumber(process.env.PORT, 3000)
};

