import type { ReactNode } from 'react';

interface UnauthorizedStateProps {
  title?: string;
  description: string;
  reason?: 'missing_token' | 'expired_token' | 'forbidden_access' | 'unknown';
  className?: string;
  icon?: ReactNode;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

function ActionLink({ action, variant }: { action: NonNullable<UnauthorizedStateProps['primaryAction']>; variant: 'primary' | 'secondary' }) {
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

export function UnauthorizedState({
  title,
  description,
  reason = 'unknown',
  className = '',
  icon,
  primaryAction,
  secondaryAction,
}: UnauthorizedStateProps) {
  const heading =
    title ?? (reason === 'forbidden_access' ? 'Access restricted' : 'Session required');

  return (
    <div
      role="alert"
      className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 px-6 py-10 text-center ${className}`}
    >
      <div className="flex max-w-md flex-col items-center gap-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-sm">
          {icon ?? <span className="text-lg font-bold">!</span>}
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{heading}</h3>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col gap-3 sm:flex-row">
            {primaryAction && <ActionLink action={primaryAction} variant="primary" />}
            {secondaryAction && <ActionLink action={secondaryAction} variant="secondary" />}
          </div>
        )}
      </div>
    </div>
  );
}