/**
 * Generate resized/ thumbnails for originals/ objects missing in the resized bucket.
 *
 * Usage: node scripts/backfill-resized-images.js
 */
require('dotenv').config();
const {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const ORIGINALS_PREFIX = 'originals/';
const RESIZED_PREFIX = 'resized/';

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const originalsBucket = process.env.ORIGINAL_IMAGES_BUCKET;
const resizedBucket = process.env.RESIZED_IMAGES_BUCKET;

function toResizedKey(key) {
  return key.replace(/^originals\//, RESIZED_PREFIX);
}

async function exists(bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function streamToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

(async () => {
  let token;
  let processed = 0;
  let skipped = 0;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: originalsBucket,
        Prefix: ORIGINALS_PREFIX,
        ContinuationToken: token,
      }),
    );

    for (const obj of page.Contents || []) {
      const key = obj.Key;
      const resizedKey = toResizedKey(key);
      if (await exists(resizedBucket, resizedKey)) {
        skipped++;
        continue;
      }

      const source = await client.send(
        new GetObjectCommand({ Bucket: originalsBucket, Key: key }),
      );
      const buf = await streamToBuffer(source.Body);
      const resized = await sharp(buf).resize({ width: 300 }).toBuffer();

      await client.send(
        new PutObjectCommand({
          Bucket: resizedBucket,
          Key: resizedKey,
          Body: resized,
          ContentType: source.ContentType || 'image/jpeg',
        }),
      );
      console.log('Resized:', resizedKey);
      processed++;
    }

    token = page.NextContinuationToken;
  } while (token);

  console.log(`Done. created=${processed} skipped=${skipped}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
