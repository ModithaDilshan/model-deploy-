const { createJob } = require('../../services/jobService');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

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
};

