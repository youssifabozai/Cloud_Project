# Assignment Worker Lambda

This Lambda is intended to be triggered by the SQS queue subscribed to the task-assignment SNS topic.

## Event flow

1. NestJS publishes a task assignment event to `SNS_ASSIGNMENT_TOPIC`.
2. SNS fans out to email subscribers and to an SQS queue.
3. SQS triggers this Lambda with assignment messages.
4. The Lambda writes an `ASSIGNED` item to the ActivityLog DynamoDB table.
5. The Lambda publishes the CloudWatch custom metric `TasksAssignedPerTeam` with a `Team` dimension.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `AWS_REGION` | No | `us-east-1` | AWS region for DynamoDB and CloudWatch clients. |
| `TABLE_ACTIVITY_LOG` | No | `mini-jira-ActivityLog` | ActivityLog DynamoDB table name. |
| `CLOUDWATCH_METRICS_NAMESPACE` | No | `MiniJira` | CloudWatch namespace for `TasksAssignedPerTeam`. |
| `CLOUDWATCH_METRICS_ENABLED` | No | enabled | Set to `false` to skip metric publishing. |

## Supported message formats

Direct SQS body:

```json
{
  "event": "TASK_ASSIGNED",
  "taskId": "task-123",
  "title": "Fix dashboard auth",
  "assigneeId": "user_sara",
  "teamId": "team_frontend",
  "assignedBy": "Ali",
  "assignedByUserId": "user_ali",
  "assignedAt": "2026-05-23T09:00:00.000Z"
}
```

SNS-wrapped SQS body:

```json
{
  "Type": "Notification",
  "Message": "{\"event\":\"TASK_ASSIGNED\",\"taskId\":\"task-123\",\"title\":\"Fix dashboard auth\",\"assigneeId\":\"user_sara\",\"teamId\":\"team_frontend\",\"assignedBy\":\"Ali\",\"assignedByUserId\":\"user_ali\",\"assignedAt\":\"2026-05-23T09:00:00.000Z\"}"
}
```

## AWS setup still required

- Subscribe the assignee notification email endpoint(s) to the SNS topic.
- Subscribe the SQS queue to the same SNS topic.
- Configure this Lambda with the SQS queue as an event source.
- Give the Lambda execution role:
  - `dynamodb:PutItem` on the ActivityLog table.
  - `cloudwatch:PutMetricData` for the configured namespace.
  - CloudWatch Logs permissions for Lambda logging.

## Deploy

```bash
cd backend/src/lambdas/assignment-worker
npm install
# Zip index.js + package.json + node_modules and deploy as a Lambda.
```
