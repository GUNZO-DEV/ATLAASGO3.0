import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import './styles/global.css';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import { AuthProvider } from './lib/auth';
import { RolesProvider } from './lib/roles';
import { ToastProvider } from './lib/toast';
import SmoothScroll from './components/SmoothScroll';
import ErrorBoundary from './components/ErrorBoundary';
import { registerSW } from './lib/pwa';

// ── Clerk publishable key (baked into bundle at build time) ──────────
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_KEY) {
  console.error(
    '[AtlaasGo] VITE_CLERK_PUBLISHABLE_KEY is missing. ' +
      'Set it in .env.local and rebuild.',
  );
}

// ── Register PWA service worker (production only) ────────────────────
registerSW();

// ── Mount ────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ClerkProvider
          publishableKey={CLERK_KEY}
          afterSignOutUrl="/"
        >
          <ThemeProvider>
            <I18nProvider>
              <ToastProvider>
                <AuthProvider>
                  <RolesProvider>
                    <SmoothScroll>
                      <App />
                    </SmoothScroll>
                  </RolesProvider>
                </AuthProvider>
              </ToastProvider>
            </I18nProvider>
          </ThemeProvider>
        </ClerkProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
