import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useRoles } from '../lib/roles';

type Mode = 'signin' | 'signup';

/** Pick the best landing page for the user's highest role. */
function dashboardForRoles(roles: Set<string>): string {
  if (roles.has('admin') || roles.has('super_admin')) return '/admin';
  if (roles.has('merchant')) return '/merchant';
  if (roles.has('rider')) return '/rider';
  return '/order';
}

/** AtlaasGo-branded Clerk appearance — full dark-theme override */
const clerkAppearance = {
  variables: {
    colorPrimary: '#FF5722',
    colorBackground: '#1A1410',
    colorInputBackground: '#130F0B',
    colorInputText: '#F5F0EB',
    colorText: '#F5F0EB',
    colorTextOnPrimaryBackground: '#fff',
    colorTextSecondary: '#A89E94',
    colorDanger: '#EF4444',
    colorNeutral: '#F5F0EB',
    borderRadius: '14px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  elements: {
    card: {
      boxShadow: 'none',
      backgroundColor: '#1A1410',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '20px',
    },
    headerTitle: {
      color: '#F5F0EB',
    },
    headerSubtitle: {
      color: '#A89E94',
    },
    socialButtonsBlockButton: {
      backgroundColor: '#231E19',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      color: '#F5F0EB',
      '&:hover': {
        backgroundColor: '#2C2520',
      },
    },
    socialButtonsBlockButtonText: {
      color: '#F5F0EB',
    },
    dividerLine: {
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    dividerText: {
      color: '#A89E94',
    },
    formFieldLabel: {
      color: '#F5F0EB',
    },
    formFieldInput: {
      backgroundColor: '#130F0B',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.10)',
      color: '#F5F0EB',
      '&:focus': {
        borderColor: '#FF5722',
        boxShadow: '0 0 0 1px #FF5722',
      },
    },
    formFieldAction: {
      color: '#FF8A65',
    },
    formButtonPrimary: {
      backgroundColor: '#FF5722',
      borderRadius: '12px',
      fontWeight: '700',
      fontSize: '14px',
      textTransform: 'none' as const,
      '&:hover': {
        backgroundColor: '#E64A19',
      },
    },
    footerAction: {
      display: 'none',
    },
    footerActionLink: {
      color: '#FF8A65',
    },
    identityPreview: {
      backgroundColor: '#231E19',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    identityPreviewText: {
      color: '#F5F0EB',
    },
    identityPreviewEditButton: {
      color: '#FF8A65',
    },
    formResendCodeLink: {
      color: '#FF8A65',
    },
    otpCodeFieldInput: {
      backgroundColor: '#130F0B',
      border: '1px solid rgba(255,255,255,0.10)',
      color: '#F5F0EB',
    },
    alert: {
      backgroundColor: '#231E19',
      border: '1px solid rgba(255,255,255,0.06)',
      color: '#F5F0EB',
    },
    alertText: {
      color: '#F5F0EB',
    },
    footer: {
      '& + div': { background: 'transparent' },
    },
    internal: {
      backgroundColor: '#1A1410',
    },
  },
};

export default function AuthPage() {
  const { user, loading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('signin');

  // Redirect when authenticated
  useEffect(() => {
    if (loading || rolesLoading || !user) return;
    const next = params.get('next');
    nav(next || dashboardForRoles(roles), { replace: true });
  }, [user, loading, rolesLoading, roles, nav, params]);

  return (
    <section className="auth-page">
      <div className="container auth-page-grid">
        {/* Left: brand pitch */}
        <div className="auth-side">
          <div className="section-tag">
            <I.Lightning size={11} /> Atlas welcome
          </div>
          <h1 className="auth-side-title">
            One account.
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #FF5722, #FF8A65, #FFB74D)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Three ways in.
            </span>
          </h1>
          <p className="auth-side-sub">
            Customer, merchant, or rider — sign up once and pick the experience that fits your
            day.
          </p>

          <div className="auth-perks">
            <div>
              <I.Check size={14} /> Free delivery for new accounts
            </div>
            <div>
              <I.Check size={14} /> AUI student discount
            </div>
            <div>
              <I.Check size={14} /> One-tap reorder of favourites
            </div>
            <div>
              <I.Check size={14} /> Privacy-first — your data stays in eu-west-3
            </div>
          </div>
        </div>

        {/* Right: Clerk auth */}
        <div className="auth-card auth-card-pro">
          <div className="auth-toggle">
            <button
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
            <button
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            {mode === 'signin' ? (
              <SignIn routing="hash" appearance={clerkAppearance} />
            ) : (
              <SignUp routing="hash" appearance={clerkAppearance} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
