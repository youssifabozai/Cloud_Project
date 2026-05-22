const { randomUUID } = require('crypto');
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const activityLogTable = process.env.TABLE_ACTIVITY_LOG || 'mini-jira-ActivityLog';
const cloudWatchNamespace = process.env.CLOUDWATCH_METRICS_NAMESPACE || 'MiniJira';
const cloudWatchEnabled = process.env.CLOUDWATCH_METRICS_ENABLED !== 'false';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const cloudWatch = new CloudWatchClient({ region });

function parseJson(value, context) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON in ${context}: ${error.message}`);
  }
}

function parseAssignmentMessage(record) {
  const body = typeof record.body === 'string' ? parseJson(record.body, 'SQS body') : record.body;

  if (body && typeof body.Message === 'string') {
    return parseJson(body.Message, 'SNS Message');
  }

  return body;
}

function normalizeAssignment(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Assignment message must be a JSON object');
  }

  const taskId = raw.taskId;
  const title = raw.title || raw.taskTitle;
  const assigneeId = raw.assigneeId;
  const teamId = raw.teamId;
  const assignedBy = raw.assignedBy || raw.actorName || 'System';
  const assignedByUserId = raw.assignedByUserId || raw.actorUserId || assignedBy || 'system';
  const assignedAt = raw.assignedAt || raw.timestamp || new Date().toISOString();

  const missing = [];
  if (!taskId) missing.push('taskId');
  if (!title) missing.push('title');
  if (!assigneeId) missing.push('assigneeId');
  if (!teamId) missing.push('teamId');
  if (missing.length > 0) {
    throw new Error(`Assignment message missing required field(s): ${missing.join(', ')}`);
  }

  return {
    taskId: String(taskId),
    title: String(title),
    assigneeId: String(assigneeId),
    teamId: String(teamId),
    assignedBy: String(assignedBy),
    assignedByUserId: String(assignedByUserId),
    assignedAt: String(assignedAt),
  };
}

async function writeActivityLog(event) {
  const item = {
    logId: randomUUID(),
    taskId: event.taskId,
    taskTitle: event.title,
    teamId: event.teamId,
    actorUserId: event.assignedByUserId,
    actorName: event.assignedBy,
    actionType: 'ASSIGNED',
    message: `${event.assignedBy} assigned task "${event.title}" to ${event.assigneeId}`,
    createdAt: event.assignedAt,
  };

  await dynamo.send(
    new PutCommand({
      TableName: activityLogTable,
      Item: item,
    }),
  );
}

async function publishAssignedMetric(event) {
  if (!cloudWatchEnabled) return;

  const metric = {
    MetricName: 'TasksAssignedPerTeam',
    Value: 1,
    Unit: 'Count',
    Timestamp: new Date(event.assignedAt),
    Dimensions: [{ Name: 'Team', Value: event.teamId }],
  };

  await cloudWatch.send(
    new PutMetricDataCommand({
      Namespace: cloudWatchNamespace,
      MetricData: [metric],
    }),
  );
}

exports.handler = async (sqsEvent) => {
  const records = Array.isArray(sqsEvent?.Records) ? sqsEvent.Records : [];

  for (const record of records) {
    try {
      const payload = parseAssignmentMessage(record);
      const assignment = normalizeAssignment(payload);

      await writeActivityLog(assignment);
      await publishAssignedMetric(assignment);

      console.log('Processed assignment event', {
        messageId: record.messageId,
        taskId: assignment.taskId,
        assigneeId: assignment.assigneeId,
        teamId: assignment.teamId,
      });
    } catch (error) {
      console.error('Skipping invalid assignment SQS record', {
        messageId: record && record.messageId,
        error: error.message,
      });
    }
  }

  return { batchItemFailures: [] };
};
