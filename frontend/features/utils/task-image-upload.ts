import { API_BASE_URL } from '@/services/api';

export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  resizedKeyPreview?: string;
}

export interface UploadImageResult {
  imageKey: string;
  previewUrl: string;
}

/**
 * 1) Request presigned PUT URL from NestJS
 * 2) Upload bytes directly to S3 (browser → S3, not through EC2)
 */
export async function uploadTaskImageToS3(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadImageResult> {
  const params = new URLSearchParams({
    fileName: file.name,
    contentType: file.type,
  });

  const presignRes = await fetch(
    `${API_BASE_URL}/tasks/upload-url?${params.toString()}`,
    { method: 'GET', credentials: 'include' },
  );

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message || 'Failed to get upload URL',
    );
  }

  const { uploadUrl, key } = (await presignRes.json()) as PresignedUploadResponse;

  await putFileWithProgress(uploadUrl, file, file.type, onProgress);

  const processRes = await fetch(`${API_BASE_URL}/tasks/process-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ imageKey: key }),
  });

  if (!processRes.ok) {
    const err = await processRes.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ||
        'Original uploaded but thumbnail generation failed',
    );
  }

  return {
    imageKey: key,
    previewUrl: URL.createObjectURL(file),
  };
}

function putFileWithProgress(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during S3 upload'));
    xhr.send(file);
  });
}

/** Prefer thumbnail; fall back to full image URL from API enrichment */
export function taskDisplayImageUrl(task: {
  thumbnailUrl?: string;
  imageUrl?: string;
  imageKey?: string;
}): string | undefined {
  return task.thumbnailUrl || task.imageUrl;
}
