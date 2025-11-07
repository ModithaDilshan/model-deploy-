const { createPresignedUpload } = require('../services/s3Service');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { fileName, fileType } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ success: false, error: 'fileName is required' });
    }

    const result = await createPresignedUpload({ fileName, contentType: fileType });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('upload-url error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create upload URL' });
  }
};

