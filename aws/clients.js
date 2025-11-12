const { S3Client } = require('@aws-sdk/client-s3');
const { SQSClient } = require('@aws-sdk/client-sqs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const config = require('../config');

const baseAwsConfig = {
  region: config.AWS_REGION,
  requestHandler: {
    requestTimeout: 300000, // 5 minutes for large file uploads/downloads
    httpsAgent: {
      keepAlive: true,
      maxSockets: 50
    }
  },
  maxAttempts: 3 // Retry up to 3 times
};

const s3Client = new S3Client(baseAwsConfig);
const sqsClient = new SQSClient(baseAwsConfig);
const dynamoClient = new DynamoDBClient(baseAwsConfig);
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

module.exports = {
  s3Client,
  sqsClient,
  dynamoDocClient
};

