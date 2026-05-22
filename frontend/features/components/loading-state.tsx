import type { ReactNode } from 'react';

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  fullHeight?: boolean;
  icon?: ReactNode;
}

export function LoadingState({
  title = 'Loading',
  description = 'Please wait while we prepare the latest data.',
  className = '',
  fullHeight = false,
  icon,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-6 py-10 text-center ${fullHeight ? 'min-h-[320px]' : ''} ${className}`}
    >
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm">
          {icon ?? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--text-secondary)] border-t-transparent" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </div>
  );
}