'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

import { Modal } from './modal';

interface DestructiveConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  warning: string;
  errorMessage?: string | null;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  children?: React.ReactNode;
}

export function DestructiveConfirmDialog({
  open,
  title,
  description,
  warning,
  errorMessage,
  isLoading = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  onClose,
  onConfirm,
  children,
}: DestructiveConfirmDialogProps) {
  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-white/90 dark:bg-white/10"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={() => { void onConfirm(); }}
        disabled={isLoading || confirmDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {isLoading ? 'Deleting...' : confirmLabel}
      </button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} footer={footer} maxWidthClassName="max-w-xl">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
            <div>
              <p className="font-semibold">Warning</p>
              <p className="mt-1 leading-6">{warning}</p>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {children}
      </div>
    </Modal>
  );
}