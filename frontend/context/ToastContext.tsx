'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ToastStack } from '@/features/components';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
}

interface ToastContextValue {
  pushToast: (tone: ToastTone, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounterRef = useRef(0);

  const pushToast = useCallback((tone: ToastTone, title: string, message: string) => {
    toastCounterRef.current += 1;
    const id = toastCounterRef.current;
    setToasts((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastStack items={toasts} />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}
