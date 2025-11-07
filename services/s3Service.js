const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { s3Client } = require('../aws/clients');

const sanitizeFileName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

async function createPresignedUpload({ fileName, contentType }) {
  const safeName = sanitizeFileName(fileName || 'upload');
  const assetKey = `uploads/${uuidv4()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: config.UPLOADS_BUCKET,
    Key: assetKey,
    ContentType: contentType || 'application/octet-stream'
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.UPLOAD_URL_TTL
  });

  return {
    uploadUrl,
    assetKey,
    expiresIn: config.UPLOAD_URL_TTL
  };
}

async function createPresignedDownload(key) {
  const command = new GetObjectCommand({
    Bucket: config.BUILDS_BUCKET,
    Key: key
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: config.DOWNLOAD_URL_TTL
  });

  return {
    downloadUrl,
    expiresIn: config.DOWNLOAD_URL_TTL
  };
}

module.exports = {
  createPresignedUpload,
  createPresignedDownload
};

