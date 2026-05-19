import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useI18n } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'magic';
type Role = 'customer' | 'merchant' | 'rider';

const ROLE_DESC: Record<Role, { title: string; sub: string; emoji: string }> = {
  customer: { title: 'I want to order', sub: 'Food, groceries, dorm drops', emoji: '🍽' },
  merchant: { title: 'I run a restaurant', sub: 'List my menu on AtlaasGo', emoji: '🏪' },
  rider:    { title: 'I want to drive', sub: 'Earn flexibly with deliveries', emoji: '🏍' },
};

export default function AuthPage() {
  const { t } = useI18n();
  const { user, signIn, signUp, signInWithOtp } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (user) nav('/orders', { replace: true });
  }, [user, nav]);

  const justConfirmed = params.get('confirmed') === '1';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMagicSent(false);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
        else nav('/orders');
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, name || undefined);
        if (error) setError(error);
        else {
          if (role !== 'customer') {
            nav(role === 'rider' ? '/rider/apply' : '/merchant/apply');
          } else {
            setError(
              'Account created. Check your inbox to confirm your email — then come back and sign in.',
            );
            setMode('signin');
          }
        }
      } else if (mode === 'magic') {
        const { error } = await signInWithOtp(email);
        if (error) setError(error);
        else setMagicSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/orders` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="container auth-page-grid">
        {/* Left: brand pitch */}
        <div className="auth-side">
          <div className="section-tag">
            <I.Lightning size={11} /> Atlas welcome
          </div>
          <h1 className="auth-side-title">
            One account.<br />
            <span style={{
              background: 'linear-gradient(135deg, #FF5722, #FF8A65, #FFB74D)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}>Three ways in.</span>
          </h1>
          <p className="auth-side-sub">
            Customer, merchant, or rider — sign up once and pick the experience that fits your day.
          </p>

          <div className="auth-perks">
            <div><I.Check size={14} /> Free delivery for new accounts</div>
            <div><I.Check size={14} /> AUI student discount</div>
            <div><I.Check size={14} /> One-tap reorder of favourites</div>
            <div><I.Check size={14} /> Privacy-first — your data stays in eu-west-3</div>
          </div>
        </div>

        {/* Right: card */}
        <div className="auth-card auth-card-pro">
          <div className="auth-toggle">
            <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
              Sign in
            </button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
              Create account
            </button>
            <button className={mode === 'magic' ? 'active' : ''} onClick={() => setMode('magic')}>
              Magic link
            </button>
          </div>

          {/* Role selector (only on sign-up) */}
          {mode === 'signup' && (
            <div className="auth-role-row">
              {(Object.keys(ROLE_DESC) as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`auth-role ${role === r ? 'active' : ''}`}
                  onClick={() => setRole(r)}
                >
                  <span className="auth-role-emoji">{ROLE_DESC[r].emoji}</span>
                  <span className="auth-role-title">{ROLE_DESC[r].title}</span>
                  <span className="auth-role-sub">{ROLE_DESC[r].sub}</span>
                </button>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: mode === 'signup' ? 18 : 6 }}>
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'One-tap sign-in'}
          </h2>
          <p className="sub">
            {mode === 'signin'
              ? 'Sign in to track orders, save favourites, earn Prime perks.'
              : mode === 'signup'
                ? 'It takes 30 seconds. Cancel anytime.'
                : "We'll email you a sign-in link — no password to remember."}
          </p>

          {justConfirmed && (
            <div className="auth-banner success">Email confirmed — you can sign in now.</div>
          )}
          {error && <div className="auth-banner error">{error}</div>}
          {magicSent && (
            <div className="auth-banner success">Check {email} for your sign-in link.</div>
          )}

          {/* Google OAuth — primary */}
          <button type="button" className="oauth-btn oauth-btn-google" onClick={signInWithGoogle} disabled={busy}>
            <span
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'conic-gradient(from -45deg, #EA4335 25%, #FBBC05 25% 50%, #34A853 50% 75%, #4285F4 75%)',
              }}
            />
            Continue with Google
          </button>

          <div className="auth-sep">or with email</div>

          <form onSubmit={onSubmit}>
            {mode === 'signup' && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Yasmine El Idrissi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@aui.ma"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {mode !== 'magic' && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy
                ? 'Working…'
                : mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? `Create ${role} account`
                    : 'Send magic link'}{' '}
              <I.Arrow />
            </button>
          </form>

          <div className="auth-foot">
            <Link to="/">← Back home</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
