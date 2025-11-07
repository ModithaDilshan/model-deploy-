require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
const { createPresignedUpload, createPresignedDownload } = require('./services/s3Service');
const { createJob, getJob } = require('./services/jobService');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/upload-url', async (req, res) => {
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

app.post('/api/jobs', async (req, res) => {
  try {
    const { assetKey, originalFileName } = req.body || {};

    if (!assetKey) {
      return res.status(400).json({ success: false, error: 'assetKey is required' });
    }

    const job = await createJob({ assetKey, originalFileName });

    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('create job error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create job' });
  }
});

app.get('/api/jobs/:jobId', async (req, res) => {
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

app.get('/api/jobs/:jobId/download', async (req, res) => {
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
  console.log('Unity Game Builder Server');
  console.log('===========================================');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`AWS Region: ${config.AWS_REGION}`);
  console.log(`Uploads Bucket: ${config.UPLOADS_BUCKET}`);
  console.log(`Builds Bucket: ${config.BUILDS_BUCKET}`);
  console.log('===========================================');
  console.log('Ready to accept build jobs.');
  console.log('===========================================');
});

