/** S3 key conventions shared by API, Lambda, and frontend. */
export const ORIGINALS_PREFIX = 'originals/';
export const RESIZED_PREFIX = 'resized/';

export const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const EXTENSION_BY_CONTENT_TYPE: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

export function isAllowedImageContentType(contentType: string): boolean {
  return ALLOWED_IMAGE_CONTENT_TYPES.has(contentType.toLowerCase());
}

export function assertFileNameMatchesContentType(
  fileName: string,
  contentType: string,
): void {
  const lower = fileName.toLowerCase();
  const allowedExtensions = EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()];
  if (!allowedExtensions?.some((ext) => lower.endsWith(ext))) {
    throw new Error(
      `fileName extension does not match contentType ${contentType}`,
    );
  }
}

export function isValidImageKey(key: string): boolean {
  return (
    typeof key === 'string' &&
    key.startsWith(ORIGINALS_PREFIX) &&
    key.length > ORIGINALS_PREFIX.length
  );
}

/** originals/uuid-file.png -> resized/uuid-file.png */
export function toResizedKey(imageKey: string): string {
  if (imageKey.startsWith(ORIGINALS_PREFIX)) {
    return imageKey.replace(/^originals\//, RESIZED_PREFIX);
  }
  return `${RESIZED_PREFIX}${imageKey.replace(/^\//, '')}`;
}
