# CloudWatch task metrics (mini-jira-dashboard)

The backend publishes custom metrics when tasks are **created** or moved to **Done**.

| Metric | When | Value | Dimension |
|--------|------|-------|-----------|
| `TasksCreated` | Create task | `1` (Count) | `Team` = `teamId` (if set) |
| `TasksClosed` | Status → Done | `1` (Count) | `Team` = `teamId` |
| `AverageTimeToClose` | Status → Done | Hours from `createdAt` to close | `Team` = `teamId` |

**Namespace (default):** `MiniJira` — set `CLOUDWATCH_METRICS_NAMESPACE` in `backend/.env` to match your dashboard widgets exactly.

## IAM

The credentials / EC2 role used by the API needs:

```json
"cloudwatch:PutMetricData"
```

## Widget setup in AWS Console

For each empty widget on **mini-jira-dashboard**:

1. Edit widget → **Metrics** tab.
2. **Namespace:** `MiniJira` (or your `CLOUDWATCH_METRICS_NAMESPACE`).
3. **Metric name:** `TasksCreated`, `TasksClosed`, or `AverageTimeToClose`.
4. **Statistic:** `Sum` for created/closed counts; `Average` for time-to-close.
5. For **Tasks Closed Per Day Per Team**, add dimension **Team** and choose `*` (all teams) or one team id.
6. Widgets must use a **short period** (e.g. 300s) for the **3h** dashboard range — **86400 (1 day) + 3h = empty graphs**. Run `node scripts/fix-mini-jira-dashboard.js` if widgets were created with daily period.
7. **Tasks Closed** widget must not hard-code `Team=Backend` only — use SEARCH or your real team ids. The fix script handles this.

## Live metrics

Restart the backend after updating `.env`. Then:

- Create a task → `TasksCreated` increments.
- Move a task to **Done** → `TasksClosed` + `AverageTimeToClose`.

## Backfill existing tasks

From `backend/`:

```bash
node scripts/backfill-cloudwatch-task-metrics.js
```

Uses the same namespace and timestamps from DynamoDB (`createdAt`, `closedAt` or `updatedAt` when status is Done).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Still no data | Confirm widget namespace = `CLOUDWATCH_METRICS_NAMESPACE` |
| Only CPU graph works | IAM missing `PutMetricData`; check backend logs for `CloudWatch PutMetricData failed` |
| Data after backfill but not live | `CLOUDWATCH_METRICS_ENABLED=false` or backend not restarted |
| 3h range empty | Create/close a task now or widen time range |
