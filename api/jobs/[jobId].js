const { getJob } = require('../../services/jobService');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const jobId = req.query.jobId;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.status(200).json({ success: true, job });
  } catch (error) {
    console.error('get job error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch job' });
  }
};

