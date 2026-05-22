'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface ToastItem {
  id: number;
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export function ToastStack({ items }: { items: ToastItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      <AnimatePresence>
        {items.map((item) => {
          const toneClasses =
            item.tone === 'success'
              ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-900 dark:text-emerald-200'
              : item.tone === 'error'
                ? 'border-red-500/25 bg-red-500/12 text-red-900 dark:text-red-200'
                : 'border-blue-500/25 bg-blue-500/12 text-blue-900 dark:text-blue-200';

          const icon =
            item.tone === 'success'
              ? <CheckCircle2 className="h-4.5 w-4.5" />
              : item.tone === 'error'
                ? <AlertTriangle className="h-4.5 w-4.5" />
                : <Info className="h-4.5 w-4.5" />;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className={`rounded-2xl border px-4 py-3 shadow-premium backdrop-blur-xl ${toneClasses}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <div>
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 opacity-90">{item.message}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}