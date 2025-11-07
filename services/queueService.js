const {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand
} = require('@aws-sdk/client-sqs');
const config = require('../config');
const { sqsClient } = require('../aws/clients');

async function enqueueJobMessage(payload) {
  const command = new SendMessageCommand({
    QueueUrl: config.JOBS_QUEUE_URL,
    MessageBody: JSON.stringify(payload)
  });

  await sqsClient.send(command);
}

async function receiveJobMessages(options = {}) {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.JOBS_QUEUE_URL,
    MaxNumberOfMessages: options.maxNumber || 1,
    WaitTimeSeconds: options.waitTimeSeconds || 20,
    VisibilityTimeout: options.visibilityTimeout || 120
  });

  const response = await sqsClient.send(command);
  return response.Messages || [];
}

async function deleteJobMessage(receiptHandle) {
  if (!receiptHandle) return;
  const command = new DeleteMessageCommand({
    QueueUrl: config.JOBS_QUEUE_URL,
    ReceiptHandle: receiptHandle
  });

  await sqsClient.send(command);
}

module.exports = {
  enqueueJobMessage,
  receiveJobMessages,
  deleteJobMessage
};

