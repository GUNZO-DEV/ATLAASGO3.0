import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  recoverIn: number;
}

/**
 * Top-level error boundary. Shows a branded "something went wrong" screen
 * when a child component throws.
 *
 * Recovery strategy:
 *   - Catches the error and shows a friendly card
 *   - Auto-tries to recover after 5 seconds (resets state, lets children
 *     re-render). If the underlying state has changed (e.g. user navigated,
 *     hook re-subscribed cleanly), the app comes back without a reload.
 *   - Manual "Reload App" button is also there for cases where the error
 *     is genuinely stuck (forces SW unregister + cache clear + full reload).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, recoverIn: 5 };
  private timer: ReturnType<typeof setInterval> | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, recoverIn: 5 };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[AtlaasGo] Uncaught error:', error, info.componentStack);

    // Start a soft-recovery countdown — most "errors" are transient
    // (a stale realtime channel, a one-shot fetch failure). After 5s, try
    // unwinding the boundary and letting children remount.
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.setState((s): State => {
        if (s.recoverIn <= 1) {
          if (this.timer) clearInterval(this.timer);
          this.timer = null;
          return { hasError: false, error: null, recoverIn: 5 };
        }
        return { ...s, recoverIn: s.recoverIn - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }

  handleReset = () => {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.setState({ hasError: false, error: null, recoverIn: 5 });
  };

  handleReload = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '60vh',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--fg)',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏔️</div>
            <h1 style={{ fontFamily: 'Montserrat', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              Hiccup detected
            </h1>
            <p style={{ color: 'var(--fg-soft)', fontSize: 14, marginBottom: 20, lineHeight: 1.55 }}>
              Auto-recovering in {this.state.recoverIn}s…
            </p>
            <div style={{ display: 'inline-flex', gap: 10 }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Try now
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'transparent',
                  color: 'var(--fg-soft)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hard reload
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre
                style={{
                  marginTop: 24,
                  textAlign: 'left',
                  fontSize: 11,
                  color: '#EF4444',
                  background: 'rgba(0,0,0,0.04)',
                  padding: 12,
                  borderRadius: 8,
                  overflow: 'auto',
                  maxHeight: 200,
                }}
              >
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
