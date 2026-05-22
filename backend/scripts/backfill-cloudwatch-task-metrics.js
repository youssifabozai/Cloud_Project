/**
 * Publishes TasksCreated / TasksClosed / AverageTimeToClose from existing DynamoDB tasks
 * so the mini-jira-dashboard widgets show historical data.
 *
 * Usage (from backend/):
 *   node scripts/backfill-cloudwatch-task-metrics.js
 *
 * Env: TABLE_TASKS, CLOUDWATCH_METRICS_NAMESPACE (default MiniJira), AWS_REGION
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require('@aws-sdk/client-cloudwatch');

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.TABLE_TASKS || 'mini-jira-Tasks';
const namespace = process.env.CLOUDWATCH_METRICS_NAMESPACE || 'MiniJira';
const BATCH_SIZE = 20;

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const cw = new CloudWatchClient({ region });

function teamDimension(teamId) {
  if (!teamId) return undefined;
  return [{ Name: 'Team', Value: String(teamId) }];
}

function metricEntries(metricName, value, unit, teamId, timestamp) {
  const entries = [
    {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: timestamp,
    },
  ];
  const dims = teamDimension(teamId);
  if (dims) {
    entries.push({
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: timestamp,
      Dimensions: dims,
    });
  }
  return entries;
}

async function putBatch(metricData) {
  if (metricData.length === 0) return;
  await cw.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metricData,
    }),
  );
}

async function scanAllTasks() {
  const items = [];
  let lastKey;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function main() {
  const tasks = await scanAllTasks();
  console.log(`Scanning ${tasks.length} tasks from ${tableName}, namespace ${namespace}`);

  const buffer = [];
  let created = 0;
  let closed = 0;

  for (const task of tasks) {
    const teamId = task.teamId;
    const createdAt = task.createdAt;
    if (!createdAt) continue;

    const createdTs = new Date(createdAt);
    buffer.push(...metricEntries('TasksCreated', 1, 'Count', teamId, createdTs));
    created += 1;

    const isDone = task.status === 'Done';
    const closedAt = task.closedAt || (isDone ? task.updatedAt : null);
    if (isDone && closedAt) {
      const closedTs = new Date(closedAt);
      const hours = Math.max(
        0,
        (closedTs.getTime() - createdTs.getTime()) / (1000 * 60 * 60),
      );
      buffer.push(
        ...metricEntries('TasksClosed', 1, 'Count', teamId, closedTs),
        ...metricEntries('AverageTimeToClose', hours, 'None', teamId, closedTs),
      );
      closed += 1;
    }

    while (buffer.length >= BATCH_SIZE) {
      await putBatch(buffer.splice(0, BATCH_SIZE));
    }
  }

  if (buffer.length > 0) {
    await putBatch(buffer);
  }

  console.log(
    `Done. Published TasksCreated=${created}, closed sets=${closed} (TasksClosed + AverageTimeToClose each).`,
  );
  console.log(
    'In CloudWatch dashboard, set namespace to',
    namespace,
    'and widen time range (e.g. 1w) if tasks are older than 3h.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
