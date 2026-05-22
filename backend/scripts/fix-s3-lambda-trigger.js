/**
 * Fix S3 → Lambda trigger filters to match Mini-Jira uploads (originals/, all image types).
 *
 * Usage: node scripts/fix-s3-lambda-trigger.js
 */
require('dotenv').config();
const {
  S3Client,
  GetBucketNotificationConfigurationCommand,
  PutBucketNotificationConfigurationCommand,
} = require('@aws-sdk/client-s3');
const {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  GetFunctionConfigurationCommand,
} = require('@aws-sdk/client-lambda');

const region = process.env.AWS_REGION || 'us-east-1';
const creds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
const bucket = process.env.ORIGINAL_IMAGES_BUCKET;
const resizedBucket = process.env.RESIZED_IMAGES_BUCKET;
const FUNCTION_NAME = process.env.IMAGE_RESIZE_LAMBDA_NAME || 'mini-jira-image-resize-lambda';
const CORRECT_PREFIX = 'originals/';

const s3 = new S3Client({ region, credentials: creds });
const lambda = new LambdaClient({ region, credentials: creds });

(async () => {
  console.log('Fixing S3 notification on', bucket);
  const current = await s3.send(
    new GetBucketNotificationConfigurationCommand({ Bucket: bucket }),
  );

  const configs = current.LambdaFunctionConfigurations || [];
  if (configs.length === 0) {
    console.error('No Lambda trigger on bucket. Add one in AWS Console first.');
    process.exit(1);
  }

  const updated = configs.map((c) => ({
    Id: c.Id,
    LambdaFunctionArn: c.LambdaFunctionArn,
    Events: c.Events || ['s3:ObjectCreated:*'],
    Filter: {
      Key: {
        FilterRules: [{ Name: 'Prefix', Value: CORRECT_PREFIX }],
      },
    },
  }));

  await s3.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: bucket,
      NotificationConfiguration: {
        LambdaFunctionConfigurations: updated,
      },
    }),
  );
  console.log('✓ S3 trigger prefix set to', CORRECT_PREFIX, '(suffix filter removed)');

  console.log('\nUpdating Lambda env on', FUNCTION_NAME);
  const cfg = await lambda.send(
    new GetFunctionConfigurationCommand({ FunctionName: FUNCTION_NAME }),
  );
  await lambda.send(
    new UpdateFunctionConfigurationCommand({
      FunctionName: FUNCTION_NAME,
      Environment: {
        Variables: {
          ...(cfg.Environment?.Variables || {}),
          RESIZED_IMAGES_BUCKET: resizedBucket,
          ORIGINAL_IMAGES_BUCKET: bucket,
        },
      },
      Timeout: Math.max(cfg.Timeout || 3, 30),
      MemorySize: Math.max(cfg.MemorySize || 128, 256),
    }),
  );
  console.log('✓ Lambda env: RESIZED_IMAGES_BUCKET =', resizedBucket);
  console.log('✓ Lambda timeout/memory increased for sharp');

  console.log(
    '\n⚠️  Your Lambda still must use the resize code in backend/src/lambdas/image-resize/',
  );
  console.log(
    '   Test invoke returned "Hello from Lambda" — redeploy index.js + node_modules (sharp).',
  );
  console.log('\nUntil then, use NestJS POST /tasks/process-image after each upload.');
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
