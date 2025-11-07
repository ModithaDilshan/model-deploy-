const { getJob } = require('../../../services/jobService');
const { createPresignedDownload } = require('../../../services/s3Service');

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

    if (job.status !== 'completed' || !job.buildKey) {
      return res.status(400).json({ success: false, error: 'Build not ready' });
    }

    const downloadInfo = await createPresignedDownload(job.buildKey);
    res.status(200).json({ success: true, ...downloadInfo });
  } catch (error) {
    console.error('download job build error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate download URL' });
  }
};

