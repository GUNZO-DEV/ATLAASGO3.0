import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/clerk-react';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useRoles } from '../lib/roles';
import { useSEO } from '../lib/seo';

type Mode = 'signin' | 'signup';
type SignupRole = 'customer' | 'rider' | 'merchant';

const ROLE_INTENT_KEY = 'atlaasgo:signup_intent';

/** Pick the best landing page for the user's current roles. */
function dashboardForRoles(roles: Set<string>, intent: SignupRole | null): string {
  if (roles.has('admin') || roles.has('super_admin')) return '/admin';
  if (roles.has('merchant')) return '/merchant';
  if (roles.has('rider')) return '/rider';

  // First-time sign-up: route to the application form they picked
  if (intent === 'rider') return '/rider/apply';
  if (intent === 'merchant') return '/merchant/apply';
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
    headerTitle: { color: '#F5F0EB' },
    headerSubtitle: { color: '#A89E94' },
    socialButtonsBlockButton: {
      backgroundColor: '#231E19',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      color: '#F5F0EB',
      '&:hover': { backgroundColor: '#2C2520' },
    },
    socialButtonsBlockButtonText: { color: '#F5F0EB' },
    dividerLine: { backgroundColor: 'rgba(255,255,255,0.08)' },
    dividerText: { color: '#A89E94' },
    formFieldLabel: { color: '#F5F0EB' },
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
    formFieldAction: { color: '#FF8A65' },
    formButtonPrimary: {
      backgroundColor: '#FF5722',
      borderRadius: '12px',
      fontWeight: '700',
      fontSize: '14px',
      textTransform: 'none' as const,
      '&:hover': { backgroundColor: '#E64A19' },
    },
    footerAction: { display: 'none' },
    footerActionLink: { color: '#FF8A65' },
    identityPreview: {
      backgroundColor: '#231E19',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    identityPreviewText: { color: '#F5F0EB' },
    identityPreviewEditButton: { color: '#FF8A65' },
    formResendCodeLink: { color: '#FF8A65' },
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
    alertText: { color: '#F5F0EB' },
    footer: { '& + div': { background: 'transparent' } },
    internal: { backgroundColor: '#1A1410' },
  },
};

const ROLE_CARDS: Array<{
  role: SignupRole;
  emoji: string;
  title: string;
  sub: string;
  perks: string[];
  cta: string;
  gradient: string;
}> = [
  {
    role: 'customer',
    emoji: '🥘',
    title: 'I want to order',
    sub: 'Browse restaurants, order food, track delivery.',
    perks: [
      'Free delivery on first order',
      'AUI student discount',
      'Save favourite spots & re-order in one tap',
    ],
    cta: 'Sign up as a customer',
    gradient: 'linear-gradient(135deg, #FF5722, #FF8A65)',
  },
  {
    role: 'rider',
    emoji: '🏍',
    title: 'I want to deliver',
    sub: 'Earn 60–90 dh/hour, daily payouts, full SOS support.',
    perks: [
      'Daily payouts to your bank',
      'Performance bonuses (50-trip badge)',
      'Pick your hours, work around classes',
    ],
    cta: 'Apply as a rider',
    gradient: 'linear-gradient(135deg, #635BFF, #8E85FF)',
  },
  {
    role: 'merchant',
    emoji: '🏪',
    title: 'I own a restaurant',
    sub: '14-day free trial. Tablet + POS included. Onboarded in a week.',
    perks: [
      'Real-time kitchen display',
      'Built-in table & QR management',
      'Lower commissions than competitors',
    ],
    cta: 'Partner with us',
    gradient: 'linear-gradient(135deg, #059669, #34D399)',
  },
];

export default function AuthPage() {
  useSEO({ title: 'Sign in', description: 'Sign in or create your AtlaasGo account — customer, rider, or merchant.' });
  const { user, loading } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const nav = useNavigate();
  const [params] = useSearchParams();

  // URL-driven initial state: ?mode=signup&role=rider
  const initialMode = (params.get('mode') as Mode) || 'signin';
  const initialRole = params.get('role') as SignupRole | null;

  const [mode, setMode] = useState<Mode>(initialMode);
  const [signupRole, setSignupRole] = useState<SignupRole | null>(
    initialRole && ['customer', 'rider', 'merchant'].includes(initialRole)
      ? initialRole
      : null,
  );

  // Persist signup intent across the Clerk redirect dance
  useEffect(() => {
    if (mode === 'signup' && signupRole) {
      try { localStorage.setItem(ROLE_INTENT_KEY, signupRole); } catch { /* ignore */ }
    }
  }, [mode, signupRole]);

  // Redirect when authenticated
  useEffect(() => {
    if (loading || rolesLoading || !user) return;

    // Pick up the intent the user chose on this page (or a previous tab)
    let intent: SignupRole | null = null;
    try {
      const stored = localStorage.getItem(ROLE_INTENT_KEY);
      if (stored === 'rider' || stored === 'merchant' || stored === 'customer') {
        intent = stored;
      }
    } catch { /* ignore */ }

    const next = params.get('next');
    nav(next || dashboardForRoles(roles, intent), { replace: true });

    // Clear the intent after we've used it
    if (intent) {
      try { localStorage.removeItem(ROLE_INTENT_KEY); } catch { /* ignore */ }
    }
  }, [user, loading, rolesLoading, roles, nav, params]);

  // ── SIGNUP: pick a role first ─────────────────────────────────────
  if (mode === 'signup' && !signupRole) {
    return (
      <section className="auth-page">
        <div className="container" style={{ maxWidth: 1100, paddingTop: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div className="section-tag" style={{ margin: '0 auto 14px' }}>
              <I.Lightning size={11} /> Atlas welcome
            </div>
            <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.1, margin: '0 0 12px' }}>
              How will you{' '}
              <span style={{
                background: 'linear-gradient(135deg, #FF5722, #FF8A65, #FFB74D)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}>
                use AtlaasGo?
              </span>
            </h1>
            <p style={{ color: 'var(--fg-soft)', fontSize: 16, margin: 0, maxWidth: 560, marginInline: 'auto' }}>
              Pick how you want to start. You can always add another role later.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 18,
            marginBottom: 32,
          }}>
            {ROLE_CARDS.map((card) => (
              <button
                key={card.role}
                onClick={() => setSignupRole(card.role)}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 24,
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all .2s',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 87, 34, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  background: card.gradient,
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                  position: 'relative',
                }}>
                  <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}>
                    {card.emoji}
                  </span>
                </div>
                <div style={{ padding: '22px 22px 24px' }}>
                  <div style={{
                    fontFamily: 'Montserrat',
                    fontWeight: 800,
                    fontSize: 22,
                    marginBottom: 6,
                  }}>
                    {card.title}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--fg-soft)', margin: '0 0 16px', lineHeight: 1.45 }}>
                    {card.sub}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 8 }}>
                    {card.perks.map((p) => (
                      <li key={p} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--fg)' }}>
                        <I.Check size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--primary)',
                  }}>
                    <span>{card.cta}</span>
                    <I.Arrow size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', color: 'var(--fg-soft)', fontSize: 14 }}>
            Already have an account?{' '}
            <button
              onClick={() => setMode('signin')}
              style={{
                color: 'var(--primary)',
                fontWeight: 700,
                textDecoration: 'underline',
                background: 'none',
                border: 0,
                cursor: 'pointer',
                padding: 0,
                fontSize: 14,
              }}
            >
              Sign in
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── SIGNUP: role picked → show Clerk SignUp with role context ─────
  // ── or SIGNIN: standard flow ──────────────────────────────────────
  const activeRoleCard = signupRole
    ? ROLE_CARDS.find((c) => c.role === signupRole)
    : null;

  return (
    <section className="auth-page auth-page--center">
      <div className="auth-center">
        {/* Brand header */}
        <div className="auth-brand">
          <span className="auth-brand-mark">
            <I.Logo size={26} />
          </span>
          <h1 className="auth-brand-title">
            {activeRoleCard ? activeRoleCard.title : 'Welcome to AtlaasGo'}
          </h1>
          <p className="auth-brand-sub">
            {activeRoleCard
              ? activeRoleCard.sub
              : "Ifrane's premium delivery — sign in or create your account."}
          </p>
        </div>

        {/* The single auth card */}
        <div className="auth-card auth-card-pro auth-card--center">
          <div className="auth-toggle">
            <button
              className={mode === 'signin' ? 'active' : ''}
              onClick={() => { setMode('signin'); setSignupRole(null); }}
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

          {/* Role context banner (only when a signup role is chosen) */}
          {activeRoleCard && (
            <div className="auth-role-banner">
              <span className="auth-role-banner-emoji">{activeRoleCard.emoji}</span>
              <span className="auth-role-banner-text">
                Signing up as <strong>{activeRoleCard.title.replace(/^I /, '').replace(/^own a/, 'a')}</strong>
              </span>
              <button className="auth-role-banner-change" onClick={() => setSignupRole(null)}>
                Change
              </button>
            </div>
          )}

          {(signupRole === 'rider' || signupRole === 'merchant') && (
            <div className="auth-next-step">
              <strong>Next step:</strong>{' '}
              After signing up you'll complete a short application. We review within{' '}
              {signupRole === 'rider' ? '48' : '24'} hours.
            </div>
          )}

          <div style={{ marginTop: 4 }}>
            {mode === 'signin' ? (
              <SignIn routing="hash" appearance={clerkAppearance} />
            ) : (
              <SignUp
                routing="hash"
                appearance={clerkAppearance}
                unsafeMetadata={{ signup_intent: signupRole }}
              />
            )}
          </div>
        </div>

        {/* Trust strip */}
        <div className="auth-trust">
          <span><I.Shield size={13} /> Privacy-first · data in eu-west-3</span>
          <span><I.Check size={13} /> Free delivery for new accounts</span>
        </div>
      </div>
    </section>
  );
}
