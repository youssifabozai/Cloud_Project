# Image Resize Lambda

This Lambda listens for S3 ObjectCreated events in the originals bucket, resizes images to a width of 300px, and stores the result in a resized bucket.

## Environment Variables
- RESIZED_IMAGES_BUCKET: Destination bucket for thumbnails. Defaults to `resized-images`.

## S3 Event
Configure the originals bucket to trigger this Lambda on ObjectCreated for keys with the `originals/` prefix.

## Output Key
Original: `originals/<uuid>-<fileName>`
Resized: `resized/<uuid>-<fileName>`

## Build Notes
Install dependencies in this folder and bundle for deployment if needed:

```
npm install
```

When deploying, ensure the Lambda has permissions to read from the originals bucket and write to the resized bucket.
