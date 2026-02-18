'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/** Call from anywhere — no context needed */
export function toast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
}

/** Add once to the root layout */
export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="glass-card bg-gray-900/95 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl pointer-events-auto"
          style={{ animation: 'toastPopIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          {t.type === 'success' && <Check className="w-4 h-4 text-accent-green flex-shrink-0" />}
          {t.type === 'error'   && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          {t.type === 'info'    && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}
          <span className="text-sm flex-1">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastPopIn {
          from { transform: translateY(-10px) scale(0.95); opacity: 0; }
          to   { transform: translateY(0)     scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
