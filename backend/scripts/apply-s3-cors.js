/**
 * Apply CORS on the originals S3 bucket so the browser can PUT via presigned URLs.
 *
 * Usage:
 *   node scripts/apply-s3-cors.js
 *   node scripts/apply-s3-cors.js https://your-cloudfront.example.com
 */
const {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} = require('@aws-sdk/client-s3');
require('dotenv').config();

const bucket =
  process.env.ORIGINAL_IMAGES_BUCKET || 'mini-jira-original-images-cc-project';
const extraOrigins = process.argv.slice(2).filter(Boolean);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...extraOrigins,
];

const corsRules = [
  {
    AllowedHeaders: ['*'],
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedOrigins: allowedOrigins,
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3000,
  },
];

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

(async () => {
  console.log(`Applying CORS on bucket: ${bucket}`);
  console.log('AllowedOrigins:', allowedOrigins.join(', '));

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: { CORSRules: corsRules },
    }),
  );

  const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log('\nCurrent CORS rules:');
  console.log(JSON.stringify(current.CORSRules, null, 2));
  console.log('\nDone. Retry image upload from http://localhost:3000');
})().catch((err) => {
  console.error('Failed:', err.name, err.message);
  process.exit(1);
});
