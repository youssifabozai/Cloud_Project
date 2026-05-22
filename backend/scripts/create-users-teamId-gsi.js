/**
 * Add GSI teamId-index to MiniJira-Users (stops Scan fallback + WARN logs).
 *
 * Usage: node scripts/create-users-teamId-gsi.js
 *
 * Requires IAM: dynamodb:UpdateTable, dynamodb:DescribeTable on the users table.
 * Index creation can take several minutes; script polls until ACTIVE.
 */
require('dotenv').config();
const {
  DynamoDBClient,
  DescribeTableCommand,
  UpdateTableCommand,
} = require('@aws-sdk/client-dynamodb');

const tableName = process.env.TABLE_USERS || 'MiniJira-Users';
const indexName = 'teamId-index';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const desc = await client.send(new DescribeTableCommand({ TableName: tableName }));
  const existing = (desc.Table?.GlobalSecondaryIndexes || []).find(
    (g) => g.IndexName === indexName,
  );

  if (existing?.IndexStatus === 'ACTIVE') {
    console.log(`✓ ${indexName} already ACTIVE on ${tableName}`);
    return;
  }

  if (existing) {
    console.log(`Index ${indexName} status: ${existing.IndexStatus} — waiting…`);
  } else {
    console.log(`Creating GSI ${indexName} on ${tableName}…`);
    await client.send(
      new UpdateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [{ AttributeName: 'teamId', AttributeType: 'S' }],
        GlobalSecondaryIndexUpdates: [
          {
            Create: {
              IndexName: indexName,
              KeySchema: [{ AttributeName: 'teamId', KeyType: 'HASH' }],
              Projection: { ProjectionType: 'ALL' },
            },
          },
        ],
      }),
    );
  }

  for (let i = 0; i < 60; i++) {
    const d = await client.send(new DescribeTableCommand({ TableName: tableName }));
    const gsi = (d.Table?.GlobalSecondaryIndexes || []).find(
      (g) => g.IndexName === indexName,
    );
    const status = gsi?.IndexStatus;
    console.log(`  … ${status}`);
    if (status === 'ACTIVE') {
      console.log(`\n✓ ${indexName} is ACTIVE. Restart backend — WARN should stop.`);
      return;
    }
    await sleep(5000);
  }

  console.log('Timed out waiting for index. Check AWS Console → DynamoDB → table → Indexes.');
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
