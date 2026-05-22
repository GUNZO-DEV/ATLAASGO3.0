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
import SmoothScroll from './components/SmoothScroll';
import { registerSW } from './lib/pwa';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

registerSW();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={CLERK_KEY}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <RolesProvider>
                <SmoothScroll>
                  <App />
                </SmoothScroll>
              </RolesProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
