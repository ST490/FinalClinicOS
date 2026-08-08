import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react';

// ── Types ──
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** Duration in ms before auto-dismiss. Default 4000. */
  duration: number;
  /** Set to true when the exit animation is playing. */
  exiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after exit animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${++counterRef.current}`;
      const item: ToastItem = { id, type, message, duration };

      setToasts((prev) => {
        const next = [...prev, item];
        // If over limit, dismiss oldest
        if (next.length > MAX_VISIBLE) {
          const oldest = next[0];
          setTimeout(() => dismiss(oldest.id), 0);
        }
        return next;
      });

      // Auto-dismiss
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = {
    success: (msg: string, dur?: number) => addToast('success', msg, dur),
    error: (msg: string, dur?: number) => addToast('error', msg, dur),
    info: (msg: string, dur?: number) => addToast('info', msg, dur),
    warning: (msg: string, dur?: number) => addToast('warning', msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Rendering ──

import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLE_MAP: Record<ToastType, { border: string; icon: string; bar: string }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-500',
    bar: 'bg-emerald-500',
  },
  error: {
    border: 'border-l-red-500',
    icon: 'text-red-500',
    bar: 'bg-red-500',
  },
  info: {
    border: 'border-l-blue-500',
    icon: 'text-blue-500',
    bar: 'bg-blue-500',
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'text-amber-500',
    bar: 'bg-amber-500',
  },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICON_MAP[t.type];
        const s = STYLE_MAP[t.type];

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 min-w-[320px] max-w-[420px] bg-surface-card border border-border border-l-4 ${s.border} rounded-xl px-4 py-3 shadow-lg ${
              t.exiting ? 'animate-slide-out-right' : 'animate-slide-in-right'
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${s.icon}`} />
            <p className="text-sm text-text-primary font-medium flex-1 leading-snug">
              {t.message}
            </p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
              <div
                className={`h-full ${s.bar} opacity-40`}
                style={{
                  animation: `countDown ${t.duration}ms linear forwards`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
