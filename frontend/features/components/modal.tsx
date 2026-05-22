'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className={`w-full ${maxWidthClassName} overflow-hidden rounded-[30px] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_24px_80px_rgba(15,23,42,0.25)]`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-4 sm:px-6">
            <div>
              <h2 id="modal-title" className="text-lg font-black text-[var(--text-primary)]">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-white/70 text-[var(--text-secondary)] transition-all hover:bg-white hover:text-[var(--text-primary)] dark:bg-white/10"
              aria-label="Close dialog"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="px-5 py-5 sm:px-6">{children}</div>

          {footer ? <div className="border-t border-[var(--border-color)] px-5 py-4 sm:px-6">{footer}</div> : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}