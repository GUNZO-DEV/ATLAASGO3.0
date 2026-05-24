import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AtlaasGo] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    // Unregister service worker to clear any stale cache
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
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#0D0A08',
            color: '#F5F0EB',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏔️</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#A89E94', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              AtlaasGo hit an unexpected error. This usually fixes itself with a refresh.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: '#FF5722',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre
                style={{
                  marginTop: 24,
                  textAlign: 'left',
                  fontSize: 11,
                  color: '#EF4444',
                  background: '#1A1410',
                  padding: 16,
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
