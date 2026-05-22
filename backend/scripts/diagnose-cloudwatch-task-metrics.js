/**
 * Verifies MiniJira task metrics exist in CloudWatch and shows task timestamps vs dashboard range.
 *
 * Usage (from backend/): node scripts/diagnose-cloudwatch-task-metrics.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const {
  CloudWatchClient,
  ListMetricsCommand,
  GetMetricStatisticsCommand,
  ListDashboardsCommand,
  GetDashboardCommand,
} = require('@aws-sdk/client-cloudwatch');

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.TABLE_TASKS || 'mini-jira-Tasks';
const namespace = process.env.CLOUDWATCH_METRICS_NAMESPACE || 'MiniJira';

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});
const cw = new CloudWatchClient({ region });

async function scanTasks() {
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

async function listNamespacesForMetric(metricName) {
  const res = await cw.send(
    new ListMetricsCommand({
      MetricName: metricName,
    }),
  );
  const namespaces = new Set((res.Metrics || []).map((m) => m.Namespace));
  return [...namespaces];
}

async function getStats(metricName, hours = 168) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  const res = await cw.send(
    new GetMetricStatisticsCommand({
      Namespace: namespace,
      MetricName: metricName,
      StartTime: start,
      EndTime: end,
      Period: 3600,
      Statistics: ['Sum', 'Average', 'SampleCount'],
    }),
  );
  return res.Datapoints || [];
}

async function tryGetDashboard() {
  try {
    const res = await cw.send(
      new GetDashboardCommand({ DashboardName: 'mini-jira-dashboard' }),
    );
    return res.DashboardBody;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log(`Region: ${region}`);
  console.log(`Expected namespace: ${namespace}\n`);

  const tasks = await scanTasks();
  console.log(`Tasks in ${tableName}: ${tasks.length}`);
  for (const t of tasks) {
    console.log(
      `  ${t.taskId?.slice(0, 8)}… status=${t.status} createdAt=${t.createdAt} closedAt=${t.closedAt || '-'}`,
    );
  }

  const now = Date.now();
  const inLast3h = tasks.filter((t) => {
    const ms = Date.parse(t.createdAt);
    return Number.isFinite(ms) && now - ms < 3 * 60 * 60 * 1000;
  });
  console.log(
    `\nTasks created in last 3h: ${inLast3h.length} — dashboard "3h" only shows metrics with timestamps in that window.`,
  );

  console.log('\n--- ListMetrics (namespace MiniJira) ---');
  const listed = await cw.send(
    new ListMetricsCommand({ Namespace: namespace }),
  );
  if (!listed.Metrics?.length) {
    console.log('  No metrics found under namespace MiniJira.');
    for (const name of ['TasksCreated', 'TasksClosed', 'AverageTimeToClose']) {
      const ns = await listNamespacesForMetric(name);
      console.log(`  Metric "${name}" found in namespaces: ${ns.length ? ns.join(', ') : '(none)'}`);
    }
  } else {
    for (const m of listed.Metrics) {
      const dims = (m.Dimensions || []).map((d) => `${d.Name}=${d.Value}`).join(',');
      console.log(`  ${m.MetricName}${dims ? ` [${dims}]` : ''}`);
    }
  }

  console.log('\n--- GetMetricStatistics (last 7 days, hourly) ---');
  for (const name of ['TasksCreated', 'TasksClosed', 'AverageTimeToClose']) {
    const dps = await getStats(name, 168);
    dps.sort((a, b) => a.Timestamp - b.Timestamp);
    console.log(`  ${name}: ${dps.length} datapoint(s)`);
    for (const dp of dps.slice(-5)) {
      console.log(
        `    ${dp.Timestamp.toISOString()} Sum=${dp.Sum ?? '-'} Avg=${dp.Average ?? '-'} Samples=${dp.SampleCount ?? '-'}`,
      );
    }
  }

  const body = await tryGetDashboard();
  if (body) {
    console.log('\n--- mini-jira-dashboard widget namespaces (from JSON) ---');
    const parsed = JSON.parse(body);
    const widgets = parsed.widgets || [];
    for (const w of widgets) {
      const title = w.properties?.title || w.title || '(untitled)';
      const metrics = w.properties?.metrics || [];
      const first = metrics[0];
      const ns = Array.isArray(first) ? first[0] : first?.namespace;
      const metric = Array.isArray(first) ? first[1] : first?.metricName;
      console.log(`  "${title}" → namespace=${ns || '?'} metric=${metric || '?'}`);
    }
  } else {
    console.log('\n(Could not read dashboard JSON — check IAM cloudwatch:GetDashboard)');
  }

  console.log('\nTip: If datapoints exist but 3h view is empty, set dashboard to 1w or create a new task now.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
