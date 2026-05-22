# Image Resize Lambda

This Lambda listens for S3 ObjectCreated events in the originals bucket, resizes images to a width of 300px, and stores the result in a resized bucket.

## Environment Variables
- `RESIZED_IMAGES_BUCKET`: Destination bucket for thumbnails (e.g. `mini-jira-resized-images-cc-project`).

## S3 Event (must match uploads)

Configure the **originals** bucket to trigger this Lambda on `s3:ObjectCreated:*` with:

| Setting | Correct | Wrong (Lambda never runs) |
|---------|---------|---------------------------|
| Prefix | `originals/` | `uploads/` |
| Suffix | *(empty — all types)* | `.jpg` only |

App uploads **PNG/JPEG/WebP** under `originals/<uuid>-file.png`.

Fix via script:

```bash
cd backend
node scripts/fix-s3-lambda-trigger.js
node scripts/diagnose-s3-lambda-trigger.js
```

## Lambda code + env

The function must run `backend/src/lambdas/image-resize/index.js` (uses **sharp**), not the default “Hello from Lambda” template.

Environment variables:

| Variable | Example |
|----------|---------|
| `RESIZED_IMAGES_BUCKET` | `mini-jira-resized-images-cc-project` |

If the deployed function still returns `"Hello from Lambda"`, redeploy the zip from `image-resize/` (see Deploy below).

**Dev fallback:** NestJS `POST /tasks/process-image` resizes after browser upload when Lambda is not wired.

## Key Convention (must match NestJS API)
| Location | Key pattern |
|----------|-------------|
| Original | `originals/<uuid>-<fileName>` |
| Resized  | `resized/<uuid>-<fileName>` |

## S3 CORS (required for browser presigned PUT from Next.js)

On the **originals** bucket, add CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR_CLOUDFRONT_DOMAIN"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## IAM (Lambda execution role)
- `s3:GetObject` on originals bucket (`originals/*`)
- `s3:PutObject` on resized bucket (`resized/*`)

## Deploy

```bash
cd backend/src/lambdas/image-resize
npm install
# zip index.js + node_modules and upload, or use AWS SAM/CDK/console
```

## Verify
1. Upload via `GET /tasks/upload-url` + browser PUT.
2. Check CloudWatch Logs for this Lambda.
3. Confirm object in resized bucket with matching key.
