import type { ReactNode } from 'react';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  title: string;
  description: string;
  className?: string;
  icon?: ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: 'primary' | 'secondary' }) {
  const baseClasses =
    variant === 'primary'
      ? 'bg-gradient-to-tr from-[var(--primary)] to-[var(--secondary)] text-white shadow-premium'
      : 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]';

  if (action.href) {
    return (
      <a
        href={action.href}
        className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-95 ${baseClasses}`}
      >
        {action.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-95 ${baseClasses}`}
    >
      {action.label}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  className = '',
  icon,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-6 py-10 text-center ${className}`}
    >
      <div className="flex max-w-md flex-col items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm">
          {icon ?? <span className="text-lg font-bold">!</span>}
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {primaryAction && <ActionButton action={primaryAction} variant="primary" />}
            {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
          </div>
        )}
      </div>
    </div>
  );
}