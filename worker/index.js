require('dotenv').config();
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { exec } = require('child_process');
const archiver = require('archiver');
const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const { s3Client } = require('../aws/clients');
const { receiveJobMessages, deleteJobMessage } = require('../services/queueService');
const { getJob, markJobStatus } = require('../services/jobService');

const TEMP_DIR = path.join(os.tmpdir(), 'unity-build-worker');
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

async function processJobMessage(message) {
  let jobId;
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
    const buildType = job.buildType || 'exe'; // Default to 'exe' for backward compatibility
    const assetExt = path.extname(assetKey) || '.fbx';
    const tempAssetPath = path.join(TEMP_DIR, `${jobId}${assetExt}`);

    await downloadS3Object(config.UPLOADS_BUCKET, assetKey, tempAssetPath);

    let buildKey;
    if (config.PREBUILT_EXECUTABLE && buildType === 'exe') {
      const prebuiltPath = path.resolve(config.PREBUILT_EXECUTABLE);
      if (!(await fs.pathExists(prebuiltPath))) {
        throw new Error(`Prebuilt executable not found at ${prebuiltPath}`);
      }

      const tempOutputPath = path.join(TEMP_DIR, `${jobId}-${path.basename(prebuiltPath)}`);
      await fs.copy(prebuiltPath, tempOutputPath);

      buildKey = `builds/${jobId}/${path.basename(prebuiltPath)}`;
      await uploadS3Object(config.BUILDS_BUCKET, buildKey, tempOutputPath, 'application/vnd.microsoft.portable-executable');

      await markJobStatus(jobId, 'completed', {
        buildKey,
        completedAt: new Date().toISOString(),
        buildStrategy: 'prebuilt',
        prebuiltSource: prebuiltPath,
        buildType: 'exe'
      });
      await fs.remove(tempOutputPath).catch(() => {});
    } else {
      const targetBasePath = path.join(config.UNITY_PROJECT_PATH, config.MODEL_TARGET_BASE);
      const targetDir = path.dirname(targetBasePath);
      const targetFilePath = `${targetBasePath}${assetExt}`;

      await fs.ensureDir(targetDir);

      if (await fs.pathExists(targetFilePath)) {
        await fs.copy(targetFilePath, `${targetFilePath}.backup`);
      }

      await fs.copy(tempAssetPath, targetFilePath);

      const siblingFiles = await fs.readdir(targetDir);
      const configuredBaseName = path.basename(targetBasePath);
      for (const name of siblingFiles) {
        if (!name.startsWith(configuredBaseName)) continue;
        if (name === path.basename(targetFilePath)) continue;
        const filePath = path.join(targetDir, name);
        await fs.remove(filePath).catch(() => {});
      }

      const unityLogPath = path.join(config.UNITY_PROJECT_PATH, 'BuildWorker.log');

      if (buildType === 'webgl') {
        // WebGL build process
        const webglOutputPath = path.join(config.UNITY_PROJECT_PATH, config.WEBGL_BUILD_OUTPUT_PATH);
        
        // Normalize paths for Windows (convert forward slashes to backslashes)
        const unityEditorPath = path.normalize(config.UNITY_EDITOR_PATH);
        const unityProjectPath = path.normalize(config.UNITY_PROJECT_PATH);
        const normalizedLogPath = path.normalize(unityLogPath);
        
        // Verify Unity executable exists
        if (!(await fs.pathExists(unityEditorPath))) {
          throw new Error(`Unity executable not found at: ${unityEditorPath}. Please check UNITY_EDITOR_PATH in your environment variables.`);
        }
        
        // Verify project path exists
        if (!(await fs.pathExists(unityProjectPath))) {
          throw new Error(`Unity project path not found at: ${unityProjectPath}. Please check UNITY_PROJECT_PATH in your environment variables.`);
        }
        
        console.log(`[Worker] Starting WebGL build for job ${jobId}`);
        console.log(`[Worker] Unity Editor: ${unityEditorPath}`);
        console.log(`[Worker] Project Path: ${unityProjectPath}`);
        await execAsync(
          `"${unityEditorPath}" -quit -batchmode -projectPath "${unityProjectPath}" -executeMethod ${config.WEBGL_BUILD_METHOD} -logFile "${normalizedLogPath}"`,
          { env: process.env }
        );

        if (!(await fs.pathExists(webglOutputPath))) {
          throw new Error('Unity WebGL build completed but output folder was not found');
        }

        // Check if the WebGL folder has content
        const webglFiles = await fs.readdir(webglOutputPath);
        if (webglFiles.length === 0) {
          throw new Error('Unity WebGL build folder is empty');
        }

        // Create zip file from WebGL folder
        const zipFileName = `MyGame-WebGL-${jobId}.zip`;
        const zipOutputPath = path.join(TEMP_DIR, zipFileName);
        console.log(`[Worker] Creating zip archive from WebGL build...`);
        await zipDirectory(webglOutputPath, zipOutputPath);

        if (!(await fs.pathExists(zipOutputPath))) {
          throw new Error('Failed to create zip file from WebGL build');
        }

        buildKey = `builds/${jobId}/${zipFileName}`;
        await uploadS3Object(config.BUILDS_BUCKET, buildKey, zipOutputPath, 'application/zip');

        await markJobStatus(jobId, 'completed', {
          buildKey,
          completedAt: new Date().toISOString(),
          buildStrategy: 'unity-build',
          buildType: 'webgl'
        });

        // Clean up zip file
        await fs.remove(zipOutputPath).catch(() => {});
      } else {
        // EXE build process (existing logic)
        const buildOutputPath = path.join(config.UNITY_PROJECT_PATH, config.BUILD_OUTPUT_PATH);

        // Normalize paths for Windows (convert forward slashes to backslashes)
        const unityEditorPath = path.normalize(config.UNITY_EDITOR_PATH);
        const unityProjectPath = path.normalize(config.UNITY_PROJECT_PATH);
        const normalizedLogPath = path.normalize(unityLogPath);

        await execAsync(
          `"${unityEditorPath}" -quit -batchmode -projectPath "${unityProjectPath}" -executeMethod ${config.BUILD_METHOD} -logFile "${normalizedLogPath}"`,
          { env: process.env }
        );

        if (!(await fs.pathExists(buildOutputPath))) {
          throw new Error('Unity build completed but output file was not found');
        }

        buildKey = `builds/${jobId}/${path.basename(buildOutputPath)}`;
        await uploadS3Object(config.BUILDS_BUCKET, buildKey, buildOutputPath, 'application/vnd.microsoft.portable-executable');

        await markJobStatus(jobId, 'completed', {
          buildKey,
          completedAt: new Date().toISOString(),
          buildStrategy: 'unity-build',
          buildType: 'exe'
        });
      }
    }

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

console.log('Unity build worker started. Polling queue...');
setInterval(pollQueue, config.WORKER_POLL_INTERVAL);
pollQueue();

