/**
 * Global toast system — replaces window.alert() / inline error divs.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Order placed!');
 *   toast.error('Could not load wallet');
 *   toast.info('Driver assigned', { duration: 5000 });
 *
 * Mount <ToastProvider> once near the top of the React tree (in main.tsx).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as I from '../icons/Icon';

type Kind = 'success' | 'error' | 'info' | 'warn';

type Toast = {
  id: number;
  kind: Kind;
  message: string;
  duration: number;
};

type ToastApi = {
  push: (kind: Kind, message: string, opts?: { duration?: number }) => void;
  success: (message: string, opts?: { duration?: number }) => void;
  error: (message: string, opts?: { duration?: number }) => void;
  info: (message: string, opts?: { duration?: number }) => void;
  warn: (message: string, opts?: { duration?: number }) => void;
};

const Ctx = createContext<ToastApi | null>(null);

const KIND_META: Record<Kind, { bg: string; border: string; icon: ReactNode; color: string }> = {
  success: {
    bg: 'rgba(5,150,105,0.10)',
    border: 'rgba(5,150,105,0.30)',
    color: '#059669',
    icon: <I.Check size={16} />,
  },
  error: {
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.30)',
    color: '#B91C1C',
    icon: <I.Shield size={16} />,
  },
  info: {
    bg: 'rgba(99,91,255,0.10)',
    border: 'rgba(99,91,255,0.30)',
    color: '#4F46E5',
    icon: <I.Lightning size={16} />,
  },
  warn: {
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.30)',
    color: '#B45309',
    icon: <I.Shield size={16} />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    setToasts((s) => s.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: Kind, message: string, opts?: { duration?: number }) => {
      const id = ++idRef.current;
      const duration = opts?.duration ?? (kind === 'error' ? 6000 : 4000);
      setToasts((s) => [...s, { id, kind, message, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => remove(id), duration);
        timersRef.current.set(id, timer);
      }
    },
    [remove],
  );

  // Cleanup on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, o),
      info: (m, o) => push('info', m, o),
      warn: (m, o) => push('warn', m, o),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* ── Toast stack (top-right, mobile-aware) ── */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          left: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
          alignItems: 'flex-end',
        }}
      >
        {toasts.map((t) => {
          const meta = KIND_META[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              style={{
                pointerEvents: 'auto',
                maxWidth: 380,
                width: 'fit-content',
                background: 'var(--surface)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${meta.border}`,
                borderLeftWidth: 4,
                borderLeftColor: meta.color,
                borderRadius: 14,
                padding: '12px 16px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                animation: 'toast-slide-in .25s cubic-bezier(.16,1,.3,1)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: meta.bg,
                  color: meta.color,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {meta.icon}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--fg)',
                  lineHeight: 1.4,
                  paddingTop: 4,
                }}
              >
                {t.message}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                style={{
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  color: 'var(--fg-soft)',
                  padding: 4,
                  marginTop: 2,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <I.Close size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(-8px) translateX(8px); }
          to   { opacity: 1; transform: translateY(0) translateX(0); }
        }
      `}</style>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Graceful fallback: log to console + no-op so callers don't crash
    // in places where ToastProvider isn't mounted (e.g. unit tests).
    const noop = (kind: Kind, m: string) => {
      // eslint-disable-next-line no-console
      console[kind === 'error' ? 'error' : 'log'](`[toast:${kind}] ${m}`);
    };
    return {
      push: noop,
      success: (m) => noop('success', m),
      error: (m) => noop('error', m),
      info: (m) => noop('info', m),
      warn: (m) => noop('warn', m),
    };
  }
  return ctx;
}
