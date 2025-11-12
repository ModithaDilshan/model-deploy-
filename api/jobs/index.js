const { createJob, getJob } = require('../../services/jobService');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { jobId } = req.query || {};
      if (!jobId) {
        return res.status(400).json({ success: false, error: 'jobId is required' });
      }

      const job = await getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      return res.status(200).json({ success: true, job });
    } catch (error) {
      console.error('get job error:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch job' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { assetKey, originalFileName, buildType } = req.body || {};

    if (!assetKey) {
      return res.status(400).json({ success: false, error: 'assetKey is required' });
    }

    // Validate buildType if provided
    if (buildType && buildType !== 'exe' && buildType !== 'webgl') {
      return res.status(400).json({ success: false, error: 'buildType must be either "exe" or "webgl"' });
    }

    const job = await createJob({ assetKey, originalFileName, buildType: buildType || 'exe' });
    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('create job error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create job' });
  }
};

