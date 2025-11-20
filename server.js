require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { connectDB } = require('./db/connection');
const { createPresignedUpload, createPresignedDownload } = require('./services/s3Service');
const { createJob, getJob } = require('./services/jobService');
const authMiddleware = require('./middleware/auth');

const app = express();

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  console.log('Server will continue but authentication features will not work');
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Authentication routes
app.post('/api/auth/register', require('./api/auth/register'));
app.post('/api/auth/login', require('./api/auth/login'));
app.post('/api/auth/logout', require('./api/auth/logout'));
app.get('/api/auth/me', authMiddleware, require('./api/auth/me'));

// Protected routes (require authentication)
app.post('/api/upload-url', authMiddleware, async (req, res) => {
  try {
    const { fileName, fileType } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    const result = await createPresignedUpload({ fileName, contentType: fileType });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('upload-url error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create upload URL' });
  }
});

app.post('/api/jobs', authMiddleware, async (req, res) => {
  try {
    const { assetKey, originalFileName, buildType } = req.body || {};

    if (!assetKey) {
      return res.status(400).json({ success: false, error: 'assetKey is required' });
    }

    const job = await createJob({ assetKey, originalFileName, buildType });

    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('create job error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create job' });
  }
});

app.get('/api/jobs/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error('get job error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch job' });
  }
});

app.get('/api/jobs/:jobId/download', authMiddleware, async (req, res) => {
  try {
    const job = await getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.status !== 'completed' || !job.buildKey) {
      return res.status(400).json({ success: false, error: 'Build not ready' });
    }

    const downloadInfo = await createPresignedDownload(job.buildKey);
    res.json({ success: true, ...downloadInfo });
  } catch (error) {
    console.error('download job build error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate download URL' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log('===========================================');
  console.log('gg.play - Godot Game Builder Server');
  console.log('===========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`AWS Region: ${config.AWS_REGION}`);
  console.log(`MongoDB: ${config.MONGODB_URI ? 'Connected' : 'Not configured'}`);
  console.log(`Uploads Bucket: ${config.UPLOADS_BUCKET}`);
  console.log(`Builds Bucket: ${config.BUILDS_BUCKET}`);
  console.log('===========================================');
  console.log('Ready to accept build jobs with authentication.');
  console.log('===========================================');
});

