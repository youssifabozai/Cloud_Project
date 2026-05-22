/**
 * Diagnose why S3 → Lambda resize may not run.
 * Usage: node scripts/diagnose-s3-lambda-trigger.js
 */
require('dotenv').config();
const {
  S3Client,
  GetBucketNotificationConfigurationCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { LambdaClient, ListFunctionsCommand } = require('@aws-sdk/client-lambda');

const creds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};
const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.ORIGINAL_IMAGES_BUCKET || 'mini-jira-original-images-cc-project';
const resizedBucket = process.env.RESIZED_IMAGES_BUCKET || 'mini-jira-resized-images-cc-project';
const EXPECTED_PREFIX = 'originals/';

const s3 = new S3Client({ region, credentials: creds });
const lambda = new LambdaClient({ region, credentials: creds });

(async () => {
  console.log('\n=== Expected app behavior ===');
  console.log('Upload key prefix:', EXPECTED_PREFIX);
  console.log('Resized key prefix: resized/');
  console.log('Lambda env: RESIZED_IMAGES_BUCKET =', resizedBucket);

  const orig = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: EXPECTED_PREFIX, MaxKeys: 5 }),
  );
  console.log('\n=== Originals bucket sample ===');
  console.log('Bucket:', bucket, 'objects:', orig.KeyCount || 0);
  for (const o of orig.Contents || []) {
    console.log(' ', o.Key);
  }

  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: resizedBucket, Prefix: 'resized/', MaxKeys: 5 }),
  );
  console.log('\n=== Resized bucket sample ===');
  console.log('Bucket:', resizedBucket, 'objects:', res.KeyCount || 0);
  for (const o of res.Contents || []) {
    console.log(' ', o.Key);
  }

  const notif = await s3.send(
    new GetBucketNotificationConfigurationCommand({ Bucket: bucket }),
  );

  console.log('\n=== S3 event notifications on originals bucket ===');
  const configs = notif.LambdaFunctionConfigurations || [];
  if (configs.length === 0) {
    console.log('  (none) — Lambda will NEVER run automatically');
  }
  for (const c of configs) {
    console.log('  Lambda ARN:', c.LambdaFunctionArn);
    console.log('  Events:', c.Events?.join(', '));
    const rules = c.Filter?.Key?.FilterRules || [];
    const prefix = rules.find((r) => r.Name === 'Prefix' || r.Name === 'prefix')?.Value;
    const suffix = rules.find((r) => r.Name === 'Suffix' || r.Name === 'suffix')?.Value;
    console.log('  Filter prefix:', prefix || '(none)');
    console.log('  Filter suffix:', suffix || '(none)');

    if (prefix && prefix !== EXPECTED_PREFIX) {
      console.log('  ⚠️  MISMATCH: trigger prefix is', JSON.stringify(prefix), 'but app uploads to', EXPECTED_PREFIX);
    }
    if (suffix === '.jpg') {
      console.log('  ⚠️  MISMATCH: suffix .jpg ignores .png / .webp uploads from the app');
    }
    if (!prefix || prefix !== EXPECTED_PREFIX) {
      console.log('  ✓ Fix: set prefix to', EXPECTED_PREFIX, 'and remove suffix filter (or allow all image types)');
    }
  }

  const fns = await lambda.send(new ListFunctionsCommand({}));
  const resizeFns = (fns.Functions || []).filter((f) =>
    /resize|image/i.test(f.FunctionName),
  );
  console.log('\n=== Lambda functions (resize-related) ===');
  for (const f of resizeFns) {
    console.log(' ', f.FunctionName, f.FunctionArn);
    console.log('   Runtime:', f.Runtime, 'LastModified:', f.LastModified);
  }
  if (resizeFns.length === 0) {
    console.log('  (none found by name)');
  }

  console.log('\n=== Fallback (no Lambda) ===');
  console.log('NestJS POST /tasks/process-image runs after browser upload if backend is up.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
