require('dotenv').config();
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { exec } = require('child_process');
const obj2gltf = require('obj2gltf');
const archiver = require('archiver');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const { s3Client } = require('../aws/clients');
const { receiveJobMessages, deleteJobMessage } = require('../services/queueService');
const { getJob, markJobStatus } = require('../services/jobService');

const TEMP_DIR = path.join(os.tmpdir(), 'godot-build-worker');
fs.ensureDirSync(TEMP_DIR);

async function downloadS3Object(bucket, key, destination) {
  const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await fs.ensureDir(path.dirname(destination));

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(destination);
    response.Body.pipe(writeStream);
    response.Body.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('close', resolve);
  });
}

async function uploadS3Object(bucket, key, filePath, contentType = 'application/octet-stream') {
  const fileStats = await fs.stat(filePath);
  const fileSize = fileStats.size;
  
  // For files larger than 100MB, use multipart upload
  if (fileSize > 100 * 1024 * 1024) {
    console.log(`[Worker] Using multipart upload for large file (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    const { Upload } = require('@aws-sdk/lib-storage');
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType
      },
      partSize: 10 * 1024 * 1024, // 10MB parts
      leavePartsOnError: false
    });
    
    await upload.done();
    console.log(`[Worker] Multipart upload completed for ${key}`);
  } else {
    // For smaller files, use regular upload
    const fileStream = fs.createReadStream(filePath);
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: contentType
    }));
  }
}

function execAsync(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { maxBuffer: 1024 * 1024 * 50, ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function zipDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log(`[Worker] Archive created: ${archive.pointer()} total bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function ensureGodotEnvironment() {
  const godotEditorPath = path.normalize(config.GODOT_EDITOR_PATH);
  const godotProjectPath = path.normalize(config.GODOT_PROJECT_PATH);

  if (!(await fs.pathExists(godotEditorPath))) {
    throw new Error(`Godot executable not found at: ${godotEditorPath}. Set GODOT_EDITOR_PATH to a valid file.`);
  }

  if (!(await fs.pathExists(godotProjectPath))) {
    throw new Error(`Godot project path not found at: ${godotProjectPath}. Set GODOT_PROJECT_PATH to the project directory.`);
  }

  return { godotEditorPath, godotProjectPath };
}

async function forceGodotReimport(projectModelPath) {
  const importMetadata = `${projectModelPath}.import`;
  await fs.remove(importMetadata).catch(() => {});

  const importedDir = path.join(config.GODOT_PROJECT_PATH, '.godot', 'imported');
  if (await fs.pathExists(importedDir)) {
    const importedFiles = await fs.readdir(importedDir);
    const baseName = path.basename(projectModelPath);
    for (const file of importedFiles) {
      if (file.includes(baseName)) {
        await fs.remove(path.join(importedDir, file)).catch(() => {});
      }
    }
  }
}

async function prepareModelForGodot(sourcePath) {
  const ext = path.extname(sourcePath).toLowerCase() || '.glb';
  const normalizedExt = ext.replace('.', '');
  let workingPath = sourcePath;
  let convertedPath = null;

  if (!(await fs.pathExists(config.GODOT_PROJECT_PATH))) {
    throw new Error(`Godot project path not found at: ${config.GODOT_PROJECT_PATH}`);
  }

  if (!config.SUPPORTED_MODEL_FORMATS.includes(normalizedExt)) {
    throw new Error(
      `Unsupported model format ".${normalizedExt}". Supported formats: ${config.SUPPORTED_MODEL_FORMATS.join(', ')}`
    );
  }

  if (normalizedExt !== 'glb') {
    if (normalizedExt === 'obj') {
      convertedPath = path.join(
        path.dirname(sourcePath),
        `${path.basename(sourcePath, path.extname(sourcePath))}.glb`
      );
      console.log(`[Worker] Converting OBJ to glb for Godot: ${convertedPath}`);
      const glbBuffer = await obj2gltf(sourcePath, { binary: true });
      await fs.writeFile(convertedPath, Buffer.from(glbBuffer));
      workingPath = convertedPath;
    } else {
      throw new Error(`Unsupported model format ".${normalizedExt}". Supported formats: ${config.SUPPORTED_MODEL_FORMATS.join(', ')}`);
    }
  }

  const projectModelPath = path.join(config.GODOT_PROJECT_PATH, config.GODOT_IMPORTED_MODEL_PATH);
  await fs.ensureDir(path.dirname(projectModelPath));
  await fs.copy(workingPath, projectModelPath);
  await forceGodotReimport(projectModelPath);
  console.log(`[Worker] Model copied to Godot project: ${projectModelPath}`);

  return { projectModelPath, convertedPath };
}

async function runGodotExport(presetName, outputPath) {
  const { godotEditorPath, godotProjectPath } = await ensureGodotEnvironment();
  await fs.ensureDir(path.dirname(outputPath));

  const command = `"${godotEditorPath}" --headless --path "${godotProjectPath}" --export-release "${presetName}" "${outputPath}" --quit`;
  console.log(`[Worker] Running Godot export (${presetName})...`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      env: process.env,
      maxBuffer: 1024 * 1024 * 50,
      timeout: 600000 // 10 minutes
    });

    if (stdout) {
      console.log(`[Godot stdout]\n${stdout}`);
    }
    if (stderr) {
      console.log(`[Godot stderr]\n${stderr}`);
    }
  } catch (error) {
    const stderr = error.stderr || '';
    throw new Error(`Godot export failed for preset "${presetName}": ${stderr || error.message}`);
  }
}

async function buildGodotWindows(jobId) {
  const buildDir = path.join(TEMP_DIR, jobId, 'windows');
  await fs.emptyDir(buildDir);

  const exportPath = path.join(buildDir, config.GODOT_WINDOWS_OUTPUT_NAME);
  await runGodotExport(config.GODOT_EXPORT_PRESET_WIN, exportPath);

  if (!(await fs.pathExists(exportPath))) {
    throw new Error('Godot Windows export did not produce the expected executable.');
  }

  return {
    artifactPath: exportPath,
    cleanupPaths: [buildDir],
    buildKey: `builds/${jobId}/${path.basename(exportPath)}`,
    contentType: 'application/vnd.microsoft.portable-executable',
    buildType: config.BUILD_TYPE_EXE
  };
}

async function buildGodotWeb(jobId) {
  const buildDir = path.join(TEMP_DIR, jobId, 'web');
  await fs.emptyDir(buildDir);

  const exportPath = path.join(buildDir, config.GODOT_WEB_OUTPUT_NAME);
  await runGodotExport(config.GODOT_EXPORT_PRESET_WEB, exportPath);

  if (!(await fs.pathExists(exportPath))) {
    throw new Error('Godot web export did not produce index.html.');
  }

  const files = await fs.readdir(buildDir);
  if (!files.length) {
    throw new Error('Godot web export folder is empty.');
  }

  const zipFileName = `MyGame-Web-${jobId}.zip`;
  const zipPath = path.join(TEMP_DIR, zipFileName);
  await zipDirectory(buildDir, zipPath);

  return {
    artifactPath: zipPath,
    cleanupPaths: [buildDir, zipPath],
    buildKey: `builds/${jobId}/${zipFileName}`,
    contentType: 'application/zip',
    buildType: config.BUILD_TYPE_WEBGL
  };
}

async function processJobMessage(message) {
  let jobId;
  const cleanupPaths = [];
  try {
    const body = JSON.parse(message.Body || '{}');
    jobId = body.jobId;
    if (!jobId) {
      throw new Error('Job ID missing from message');
    }

    const job = await getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`[Worker] Processing job ${jobId}`);
    await markJobStatus(jobId, 'processing', { startedAt: new Date().toISOString() });

    const assetKey = job.assetKey;
    const buildType = job.buildType || config.BUILD_TYPE_EXE;
    const assetExt = path.extname(assetKey) || '.glb';
    const tempAssetPath = path.join(TEMP_DIR, `${jobId}${assetExt}`);
    cleanupPaths.push(tempAssetPath);

    console.log(`[Worker] Build type: ${buildType}`);
    console.log(`[Worker] Processing job with uploaded model: ${assetKey}`);

    // Download the uploaded model from S3
    await downloadS3Object(config.UPLOADS_BUCKET, assetKey, tempAssetPath);

    const { convertedPath } = await prepareModelForGodot(tempAssetPath);
    if (convertedPath) {
      cleanupPaths.push(convertedPath);
    }

    const buildResult =
      buildType === config.BUILD_TYPE_WEBGL ? await buildGodotWeb(jobId) : await buildGodotWindows(jobId);

    await uploadS3Object(config.BUILDS_BUCKET, buildResult.buildKey, buildResult.artifactPath, buildResult.contentType);

    await markJobStatus(jobId, 'completed', {
      buildKey: buildResult.buildKey,
      completedAt: new Date().toISOString(),
      buildStrategy: 'godot-build',
      buildType: buildResult.buildType
    });

    cleanupPaths.push(...(buildResult.cleanupPaths || []));

    console.log(`[Worker] Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`[Worker] Job processing failed: ${error.message}`);
    if (jobId) {
      await markJobStatus(jobId, 'failed', {
        errorMessage: error.message,
        failedAt: new Date().toISOString()
      }).catch((updateErr) => {
        console.error('[Worker] Failed to update job status:', updateErr.message);
      });
    }
  } finally {
    for (const filePath of cleanupPaths) {
      if (!filePath) continue;
      await fs.remove(filePath).catch(() => {});
    }

    if (message.ReceiptHandle) {
      await deleteJobMessage(message.ReceiptHandle).catch((err) => {
        console.error('[Worker] Failed to delete SQS message:', err.message);
      });
    }
  }
}

async function pollQueue() {
  try {
    const messages = await receiveJobMessages({
      maxNumber: config.WORKER_MAX_CONCURRENT_JOBS,
      waitTimeSeconds: 20,
      visibilityTimeout: 300
    });

    if (!messages.length) {
      return;
    }

    for (const message of messages) {
      await processJobMessage(message);
    }
  } catch (error) {
    console.error('[Worker] Poll error:', error.message);
  }
}

console.log('Godot build worker started. Polling queue...');
setInterval(pollQueue, config.WORKER_POLL_INTERVAL);
pollQueue();

