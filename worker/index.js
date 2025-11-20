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

    console.log(`[Worker] Build type: ${buildType}`);
    console.log(`[Worker] Processing job with uploaded model: ${assetKey}`);

    // Download the uploaded model from S3
    await downloadS3Object(config.UPLOADS_BUCKET, assetKey, tempAssetPath);

    // Copy uploaded model to Unity project
    const targetBasePath = path.join(config.UNITY_PROJECT_PATH, config.MODEL_TARGET_BASE);
    const targetDir = path.dirname(targetBasePath);
    const targetFilePath = `${targetBasePath}${assetExt}`;

    console.log(`[Worker] Copying model to Unity project: ${targetFilePath}`);
    await fs.ensureDir(targetDir);

    if (await fs.pathExists(targetFilePath)) {
      await fs.copy(targetFilePath, `${targetFilePath}.backup`);
    }

    await fs.copy(tempAssetPath, targetFilePath);

    // Clean up old model files with the same base name
    const siblingFiles = await fs.readdir(targetDir);
    const configuredBaseName = path.basename(targetBasePath);
    for (const name of siblingFiles) {
      if (!name.startsWith(configuredBaseName)) continue;
      if (name === path.basename(targetFilePath)) continue;
      const filePath = path.join(targetDir, name);
      await fs.remove(filePath).catch(() => {});
    }

    const unityLogPath = path.join(config.UNITY_PROJECT_PATH, 'BuildWorker.log');
    let buildKey;

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
        
        try {
          // Wait a moment for any previous Unity processes to finish
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Execute the build method directly (Unity will compile scripts automatically)
          // Skip separate compilation check as it causes Unity to exit early in batch mode
          console.log(`[Worker] Executing build method: ${config.WEBGL_BUILD_METHOD}`);
          console.log(`[Worker] Unity will compile scripts automatically during build`);
          
          const result = await execAsync(
            `"${unityEditorPath}" -quit -batchmode -projectPath "${unityProjectPath}" -executeMethod ${config.WEBGL_BUILD_METHOD} -logFile "${normalizedLogPath}"`,
            { 
              env: process.env, 
              maxBuffer: 1024 * 1024 * 100, // 100MB buffer for Unity output
              timeout: 600000 // 10 minutes timeout for WebGL builds
            }
          );
          
          // Wait longer for Unity to finish writing the log file
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Check for test files that indicate method execution
          const testFile = path.join(config.UNITY_PROJECT_PATH, '..', 'build_webgl_started.txt');
          const errorFile = path.join(config.UNITY_PROJECT_PATH, '..', 'build_webgl_error.txt');
          
          // Check if build method was executed
          const methodExecuted = await fs.pathExists(testFile);
          const hasErrorFile = await fs.pathExists(errorFile);
          
          if (hasErrorFile) {
            const errorContent = await fs.readFile(errorFile, 'utf-8');
            console.log(`[Worker] Build error file found. Content:\n${errorContent}`);
            
            // Also check the Unity log for more details
            let fullError = `Build method executed but failed:\n${errorContent}`;
            if (await fs.pathExists(normalizedLogPath)) {
              const logContent = await fs.readFile(normalizedLogPath, 'utf-8');
              // Look for detailed error messages in the log
              const errorLines = logContent.split('\n').filter(line => 
                line.toLowerCase().includes('error') || 
                line.toLowerCase().includes('exception') ||
                line.toLowerCase().includes('failed') ||
                line.toLowerCase().includes('build report')
              );
              if (errorLines.length > 0) {
                fullError += '\n\nUnity Log Errors:\n' + errorLines.slice(-50).join('\n');
              }
            }
            
            throw new Error(fullError);
          }
          
          if (methodExecuted) {
            const testContent = await fs.readFile(testFile, 'utf-8');
            console.log(`[Worker] Build method was called: ${testContent}`);
          } else {
            console.log(`[Worker] Warning: build_webgl_started.txt not found - checking if build succeeded anyway`);
          }
          
          // Check if Unity log file exists and read it for errors
          if (await fs.pathExists(normalizedLogPath)) {
            const logContent = await fs.readFile(normalizedLogPath, 'utf-8');
            
            // Check if build method was mentioned in log
            const buildMethodCalled = logContent.includes('BuildScript') || 
                                     logContent.includes('BuildWebGL') ||
                                     logContent.includes('Starting WebGL build') ||
                                     logContent.includes('Build completed successfully');
            
            if (!buildMethodCalled && !methodExecuted) {
              // Method didn't execute - check for compilation errors
              const compileErrors = logContent.match(/error CS\d+[^\n]*|CompilationFailedException[^\n]*/gi);
              if (compileErrors && compileErrors.length > 0) {
                throw new Error(`Unity build method did not execute. Compilation errors found:\n${compileErrors.slice(0, 10).join('\n')}`);
              }
              
              // Check for other errors
              const errors = logContent.match(/(?:error|Error|Exception|Failed)[^\n]*/gi);
              if (errors && errors.length > 0) {
                const uniqueErrors = [...new Set(errors)].slice(0, 20);
                throw new Error(`Unity build method did not execute. Errors found:\n${uniqueErrors.join('\n')}`);
              }
              
              // If no errors but method didn't execute, Unity might have exited early
              console.log(`[Worker] Warning: Build method may not have executed. Checking Unity Editor.log...`);
            }
            
            // Check for compilation errors or build failures
            if (logContent.includes('error CS') || logContent.includes('CompilationFailedException')) {
              const compileErrors = logContent.match(/error CS\d+[^\n]*/gi);
              if (compileErrors && compileErrors.length > 0) {
                throw new Error(`Unity script compilation failed:\n${compileErrors.slice(0, 10).join('\n')}`);
              }
            }
            
            // Check for build failures
            if (logContent.includes('Build failed') || logContent.includes('BuildResult.Failed')) {
              const buildErrors = logContent.match(/Build failed[^\n]*|BuildResult\.Failed[^\n]*/gi);
              if (buildErrors && buildErrors.length > 0) {
                throw new Error(`Unity build failed:\n${buildErrors.join('\n')}`);
              }
            }
          } else {
            // Log file doesn't exist - check Editor.log
            console.log(`[Worker] Unity log file not found. Checking Editor.log...`);
          }
          
          // Check Unity's Editor.log for additional errors (this has more detailed info)
          const editorLogPath = path.join(os.homedir(), 'AppData', 'LocalLow', 'Unity', 'Editor', 'Editor.log');
          if (await fs.pathExists(editorLogPath)) {
            const editorLog = await fs.readFile(editorLogPath, 'utf-8');
            const recentLog = editorLog.split('\n').slice(-200).join('\n'); // Last 200 lines
            
            // Check for compilation errors in Editor.log
            const compileErrors = recentLog.match(/error CS\d+[^\n]*/gi);
            if (compileErrors && compileErrors.length > 0) {
              throw new Error(`Unity script compilation failed (from Editor.log):\n${compileErrors.slice(0, 10).join('\n')}`);
            }
            
            // Check for other errors
            if (recentLog.includes('error') || recentLog.includes('Error') || recentLog.includes('Exception')) {
              const errors = recentLog.match(/(?:error|Error|Exception)[^\n]*/gi);
              if (errors && errors.length > 0) {
                const uniqueErrors = [...new Set(errors)].slice(0, 15);
                console.log(`[Worker] Unity Editor.log contains errors (last 200 lines):`);
                console.log(uniqueErrors.join('\n'));
              }
            }
            
            // Check if build method was called in Editor.log
            if (recentLog.includes('BuildScript.BuildWebGL') || recentLog.includes('BuildWebGL called')) {
              console.log(`[Worker] Build method execution confirmed in Editor.log`);
            }
          }
          
          // Check if build output exists (even if Unity exited with code 1, build might have succeeded)
          if (await fs.pathExists(webglOutputPath)) {
            const webglFiles = await fs.readdir(webglOutputPath);
            if (webglFiles.length > 0) {
              console.log(`[Worker] WebGL build output found (${webglFiles.length} files) - build may have succeeded despite exit code`);
              // Continue with build processing
            }
          }
        } catch (error) {
          // Check if build actually succeeded despite the error (Unity sometimes exits with code 1 even on success)
          if (await fs.pathExists(webglOutputPath)) {
            const webglFiles = await fs.readdir(webglOutputPath);
            if (webglFiles.length > 0) {
              console.log(`[Worker] Build output exists despite error - checking if build actually succeeded`);
              // If build output exists and has files, the build might have succeeded
              // Continue processing instead of throwing error
              console.log(`[Worker] Proceeding with build output (${webglFiles.length} files found)`);
            } else {
              // Build output exists but is empty - this is an error
              throw new Error('Unity WebGL build output folder exists but is empty');
            }
          } else {
            // Build output doesn't exist - this is a real error
            // Read Unity log for detailed error information
            let errorDetails = error.message;
            
            // Wait a moment for log file to be written
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check both BuildWorker.log and Editor.log
            if (await fs.pathExists(normalizedLogPath)) {
              const logContent = await fs.readFile(normalizedLogPath, 'utf-8');
              
              // Extract specific error patterns
              const errorPatterns = [
                /error CS\d+[^\n]*/gi,  // Compilation errors
                /(?:error|Error|Exception|Failed)[^\n]*/gi,
                /BuildScript[^\n]*/gi,
                /WebGL[^\n]*/gi,
                /not supported[^\n]*/gi,
                /module[^\n]*/gi
              ];
              
              const allErrors = [];
              errorPatterns.forEach(pattern => {
                const matches = logContent.match(pattern);
                if (matches) {
                  allErrors.push(...matches);
                }
              });
              
              if (allErrors.length > 0) {
                const uniqueErrors = [...new Set(allErrors)].slice(0, 30);
                errorDetails += '\n\nUnity Log Errors:\n' + uniqueErrors.join('\n');
              }
            }
            
            // Check Editor.log for more details
            const editorLogPath = path.join(os.homedir(), 'AppData', 'LocalLow', 'Unity', 'Editor', 'Editor.log');
            if (await fs.pathExists(editorLogPath)) {
              const editorLog = await fs.readFile(editorLogPath, 'utf-8');
              const recentLog = editorLog.split('\n').slice(-200).join('\n');
              
              // Extract compilation errors from Editor.log
              const compileErrors = recentLog.match(/error CS\d+[^\n]*/gi);
              if (compileErrors && compileErrors.length > 0) {
                errorDetails += '\n\nEditor.log Compilation Errors:\n' + compileErrors.slice(0, 10).join('\n');
              }
              
              // Check for other errors
              const otherErrors = recentLog.match(/(?:error|Error|Exception)[^\n]*/gi);
              if (otherErrors && otherErrors.length > 0) {
                const uniqueErrors = [...new Set(otherErrors)].slice(0, 15);
                errorDetails += '\n\nEditor.log Errors:\n' + uniqueErrors.join('\n');
              }
            } else {
              errorDetails += '\n\nUnity Editor.log not found. This might indicate Unity failed to start.';
            }
            
            // Add diagnostic information
            errorDetails += '\n\nDiagnostics:';
            errorDetails += '\n- Unity Editor: ' + unityEditorPath;
            errorDetails += '\n- Project Path: ' + unityProjectPath;
            errorDetails += '\n- Build Method: ' + config.WEBGL_BUILD_METHOD;
            
            // Check for common WebGL issues
            if (errorDetails.toLowerCase().includes('webgl') || errorDetails.toLowerCase().includes('not supported')) {
              errorDetails += '\n\nPossible issue: WebGL Build Support module may not be installed.';
              errorDetails += '\nPlease check Unity Hub -> Installs -> Add Modules -> WebGL Build Support';
            }
            
            // Check if it's a compilation error
            if (errorDetails.includes('error CS')) {
              errorDetails += '\n\nThis appears to be a script compilation error.';
              errorDetails += '\nPlease open the Unity project in the editor and fix any compilation errors.';
            }
            
            throw new Error(errorDetails);
          }
        }

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

    // Clean up temporary asset file
    await fs.remove(tempAssetPath).catch(() => {});

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

