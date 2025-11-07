const { PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { dynamoDocClient } = require('../aws/clients');
const { enqueueJobMessage } = require('./queueService');

async function createJob({ assetKey, originalFileName }) {
  if (!assetKey) {
    throw new Error('assetKey is required to create a job');
  }

  const now = new Date().toISOString();
  const jobId = uuidv4();

  const item = {
    jobId,
    status: 'queued',
    assetKey,
    originalFileName: originalFileName || null,
    createdAt: now,
    updatedAt: now
  };

  await dynamoDocClient.send(new PutCommand({
    TableName: config.JOBS_TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(jobId)'
  }));

  await enqueueJobMessage({ jobId, assetKey });

  return item;
}

async function getJob(jobId) {
  const response = await dynamoDocClient.send(new GetCommand({
    TableName: config.JOBS_TABLE_NAME,
    Key: { jobId }
  }));

  return response.Item || null;
}

function buildUpdateExpression(attributes) {
  const setClauses = [];
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  for (const [key, value] of Object.entries(attributes)) {
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    ExpressionAttributeNames[nameKey] = key;
    ExpressionAttributeValues[valueKey] = value;
    setClauses.push(`${nameKey} = ${valueKey}`);
  }

  const updatedAt = new Date().toISOString();
  ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
  ExpressionAttributeValues[':updatedAt'] = updatedAt;
  setClauses.push('#updatedAt = :updatedAt');

  return {
    UpdateExpression: `SET ${setClauses.join(', ')}`,
    ExpressionAttributeNames,
    ExpressionAttributeValues
  };
}

async function updateJob(jobId, attributes) {
  const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } = buildUpdateExpression(attributes);

  const response = await dynamoDocClient.send(new UpdateCommand({
    TableName: config.JOBS_TABLE_NAME,
    Key: { jobId },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  }));

  return response.Attributes;
}

async function markJobStatus(jobId, status, extra = {}) {
  return updateJob(jobId, { status, ...extra });
}

module.exports = {
  createJob,
  getJob,
  updateJob,
  markJobStatus
};

