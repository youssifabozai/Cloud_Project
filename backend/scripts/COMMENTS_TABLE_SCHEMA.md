# Comments table (`mini-jira-comments`)

Create in DynamoDB with **composite primary key**:

| Key | Attribute | Type |
|-----|-----------|------|
| Partition | `taskId` | String |
| Sort | `commentId` | String |

No GSI required for the API.

If the table uses a different key layout, `GET /comments/:taskId` falls back to a filtered Scan (fine for small datasets).
