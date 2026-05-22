'use client';

import React, { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { uploadTaskImageToS3 } from '@/features/utils/task-image-upload';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export interface TaskImageUploadProps {
  disabled?: boolean;
  /** Called after successful S3 upload with the DynamoDB-ready key */
  onUploaded: (imageKey: string, localPreviewUrl: string) => void;
  onClear?: () => void;
  initialPreviewUrl?: string;
  initialImageKey?: string;
  label?: string;
}

export function TaskImageUpload({
  disabled,
  onUploaded,
  onClear,
  initialPreviewUrl,
  initialImageKey,
  label = 'Task image (uploads to S3)',
}: TaskImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(
    initialPreviewUrl,
  );
  const [imageKey, setImageKey] = useState<string | undefined>(initialImageKey);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file || disabled) return;

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Use JPEG, PNG, WebP, or GIF only.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10 MB.');
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadTaskImageToS3(file, setProgress);
      setImageKey(result.imageKey);
      setPreviewUrl(result.previewUrl);
      onUploaded(result.imageKey, result.previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(undefined);
    setImageKey(undefined);
    setProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wide">
        {label}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`flex items-center gap-2 px-4 py-2 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] transition-colors ${
            disabled || uploading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-[var(--bg-primary)]/50 cursor-pointer'
          }`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span>{uploading ? `Uploading ${progress ?? 0}%` : 'Choose image'}</span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>

        {imageKey && !uploading && (
          <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Stored in S3
          </span>
        )}

        {(previewUrl || imageKey) && !uploading && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-[var(--text-tertiary)] hover:text-red-500 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        )}
      </div>

      {progress !== null && uploading && (
        <div className="h-1.5 w-full rounded-full bg-[var(--bg-primary)] overflow-hidden">
          <div
            className="h-full bg-[var(--primary)] transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-[10px] text-red-500 font-medium">{error}</p>
      )}

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Upload preview"
          className="max-h-32 rounded-xl border border-[var(--border-color)] object-contain"
        />
      )}
    </div>
  );
}
