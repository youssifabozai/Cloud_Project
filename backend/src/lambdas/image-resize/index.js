const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const s3 = new S3Client({});

const ORIGINALS_PREFIX = 'originals/';
const RESIZED_PREFIX = 'resized/';

const getBucketName = (envKey, fallback) => {
  return process.env[envKey] || fallback;
};

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

exports.handler = async (event) => {
  const resizedBucket = getBucketName('RESIZED_IMAGES_BUCKET', 'resized-images');

  if (!event?.Records?.length) {
    console.log('No records received.');
    return;
  }

  for (const record of event.Records) {
    const sourceBucket = record.s3?.bucket?.name;
    const rawKey = record.s3?.object?.key;

    if (!sourceBucket || !rawKey) {
      console.warn('Missing bucket or key in event record.');
      continue;
    }

    const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));

    if (!key.startsWith(ORIGINALS_PREFIX)) {
      console.log(`Skipping non-original key: ${key}`);
      continue;
    }

    const resizedKey = key.replace(/^originals\//, RESIZED_PREFIX);

    try {
      const sourceObject = await s3.send(
        new GetObjectCommand({
          Bucket: sourceBucket,
          Key: key,
        }),
      );

      const bodyBuffer = await streamToBuffer(sourceObject.Body);
      const resizedBuffer = await sharp(bodyBuffer)
        .resize({ width: 300 })
        .toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: resizedBucket,
          Key: resizedKey,
          Body: resizedBuffer,
          ContentType: sourceObject.ContentType || 'image/jpeg',
        }),
      );

      console.log(`Resized image stored at ${resizedBucket}/${resizedKey}`);
    } catch (error) {
      console.error('Failed to resize image:', {
        key,
        message: error?.message,
      });
      throw error;
    }
  }
};
