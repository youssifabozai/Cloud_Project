/**
 * Fixes mini-jira-dashboard widgets so task metrics show up:
 * - Period 300 (5 min) instead of 86400 (daily) — daily + 3h range = empty graphs
 * - SEARCH() aggregates all Team dimensions (widget was hard-coded Team=Backend only)
 *
 * Usage (from backend/): node scripts/fix-mini-jira-dashboard.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  CloudWatchClient,
  GetDashboardCommand,
  PutDashboardCommand,
} = require('@aws-sdk/client-cloudwatch');

const region = process.env.AWS_REGION || 'us-east-1';
const cw = new CloudWatchClient({ region });
const DASHBOARD_NAME = 'mini-jira-dashboard';
const PERIOD = 300;

function patchWidgets(widgets) {
  return widgets.map((widget) => {
    const title = widget.properties?.title || '';
    if (!widget.properties?.metrics) return widget;

    const copy = JSON.parse(JSON.stringify(widget));

    if (title === 'Tasks Created Per Day') {
      copy.properties.metrics = [
        [
          {
            expression: `SEARCH('{MiniJira} MetricName="TasksCreated"', 'Sum', ${PERIOD})`,
            label: 'Tasks Created',
            id: 'tasksCreated',
          },
        ],
      ];
      copy.properties.period = PERIOD;
      copy.properties.stat = 'Sum';
      copy.properties.view = 'timeSeries';
    }

    if (title === 'Tasks Closed Per Day Per Team') {
      copy.properties.metrics = [
        [
          {
            expression: `SEARCH('{MiniJira} MetricName="TasksClosed"', 'Sum', ${PERIOD})`,
            label: 'Tasks Closed',
            id: 'tasksClosed',
          },
        ],
      ];
      copy.properties.period = PERIOD;
      copy.properties.stat = 'Sum';
      copy.properties.view = 'timeSeries';
    }

    if (title === 'Average Time To Close') {
      copy.properties.metrics = [
        [
          {
            expression: `SEARCH('{MiniJira} MetricName="AverageTimeToClose"', 'Average', ${PERIOD})`,
            label: 'Avg hours to close',
            id: 'avgClose',
          },
        ],
      ];
      copy.properties.period = PERIOD;
      copy.properties.stat = 'Average';
      copy.properties.view = 'timeSeries';
    }

    return copy;
  });
}

async function main() {
  const current = await cw.send(
    new GetDashboardCommand({ DashboardName: DASHBOARD_NAME }),
  );
  const body = JSON.parse(current.DashboardBody);
  body.widgets = patchWidgets(body.widgets || []);

  await cw.send(
    new PutDashboardCommand({
      DashboardName: DASHBOARD_NAME,
      DashboardBody: JSON.stringify(body),
    }),
  );

  console.log(`Updated ${DASHBOARD_NAME}:`);
  console.log('  - Task widgets use 5-minute period (visible in 3h range)');
  console.log('  - SEARCH() sums all Team dimensions (not only Backend)');
  console.log('');
  console.log('Re-run backfill, then refresh the dashboard:');
  console.log('  node scripts/backfill-cloudwatch-task-metrics.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
