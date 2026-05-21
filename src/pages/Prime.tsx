import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton, MotionCard, MotionPop } from '../components/visual/Motion';
import type { PrimeTier } from '../lib/database.types';

const TIERS: Array<{
  tier: PrimeTier;
  name: string;
  priceDh: number;
  cadence: string;
  perks: string[];
  highlight: boolean;
}> = [
  {
    tier: 'student',
    name: 'Student',
    priceDh: 39,
    cadence: '/mo · with AUI email',
    perks: ['Free delivery on every order', 'Dorm Drop priority routing', '2× wallet cashback'],
    highlight: false,
  },
  {
    tier: 'standard',
    name: 'Standard',
    priceDh: 79,
    cadence: '/mo',
    perks: [
      'Free delivery on every order',
      'Save 47 dh / week on average',
      'Reserved support line',
      'Birthday gift pack',
    ],
    highlight: true,
  },
  {
    tier: 'campus_pass',
    name: 'Campus Pass',
    priceDh: 299,
    cadence: '/semester',
    perks: [
      'Everything in Student',
      'Unlimited campus drops',
      'AUIER express lane',
      'Refunds within 2 minutes',
    ],
    highlight: false,
  },
];

export default function PrimePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [active, setActive] = useState<PrimeTier | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [buying, setBuying] = useState<PrimeTier | null>(null);
  const [activating, setActivating] = useState(false);
  const [justActivated, setJustActivated] = useState<PrimeTier | null>(null);
  const [cancelled, setCancelled] = useState(false);

  // Load current subscription
  useEffect(() => {
    if (!user) return;
    supabase
      .from('prime_subscriptions')
      .select('tier,is_active,expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { tier?: PrimeTier; expires_at?: string } | null;
        setActive(row?.tier ?? null);
        setExpiresAt(row?.expires_at ?? null);
      });
  }, [user, justActivated]);

  // Handle Stripe success redirect
  useEffect(() => {
    const sessionId = params.get('session_id');
    const successTier = params.get('tier');
    const success = params.get('success');

    if (success === '1' && sessionId && !activating && !justActivated) {
      setActivating(true);
      (async () => {
        const { data, error } = await supabase.functions.invoke('activate-prime', {
          body: { sessionId },
        });
        if (!error && data?.ok) {
          setJustActivated(data.tier as PrimeTier);
          setActive(data.tier as PrimeTier);
        }
        setActivating(false);
        // Clean URL
        setParams({}, { replace: true });
      })();
    }

    if (params.get('cancelled') === '1') {
      setCancelled(true);
      setParams({}, { replace: true });
    }
  }, [params, activating, justActivated, setParams]);

  async function subscribe(tier: PrimeTier) {
    if (!user) {
      nav('/auth?next=/prime');
      return;
    }
    setBuying(tier);
    try {
      const { data, error } = await supabase.functions.invoke('create-prime-checkout', {
        body: {
          tier,
          userId: user.id,
          customerEmail: user.email,
          siteUrl: window.location.origin,
        },
      });
      if (error || !data?.url) {
        alert('Could not start checkout. Try again.');
        setBuying(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert('Network error. Check your connection.');
      setBuying(null);
    }
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Star size={11} /> AtlaasGo Prime
          </div>
          <h1 className="page-title">Less waiting. More climbing.</h1>
          <p className="page-sub">
            Prime members average 47 dh in delivery savings per week. Cancel anytime.
          </p>
        </FadeUp>

        {/* Activation banner */}
        {activating && (
          <MotionPop>
            <div className="prime-banner activating">
              <div className="prime-banner-spinner" />
              Activating your subscription...
            </div>
          </MotionPop>
        )}
        {justActivated && (
          <MotionPop>
            <div className="prime-banner success">
              <I.Check size={16} />
              <div>
                <strong>Welcome to Prime {justActivated.replace('_', ' ')}!</strong>
                <span>Your perks are active now. Enjoy free delivery on your next order.</span>
              </div>
            </div>
          </MotionPop>
        )}
        {cancelled && (
          <MotionPop>
            <div className="prime-banner cancelled">
              <I.Shield size={14} /> Payment cancelled. Pick a plan when you're ready.
            </div>
          </MotionPop>
        )}

        {/* Active subscription info */}
        {active && !justActivated && (
          <MotionPop>
            <div className="prime-banner active-sub">
              <I.Star size={16} />
              <div>
                <strong>Prime {active.replace('_', ' ')} is active</strong>
                {expiresAt && (
                  <span>
                    Renews {new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </MotionPop>
        )}

        <div className="prime-grid">
          {TIERS.map((t, i) => (
            <MotionCard key={t.tier} className={`prime-tier ${t.highlight ? 'highlight' : ''} ${active === t.tier ? 'current' : ''}`} delay={i * 0.1}>
              {t.highlight && <span className="prime-tier-flag">Most popular</span>}
              {active === t.tier && <span className="prime-tier-active">Active</span>}
              <div className="prime-tier-name">{t.name}</div>
              <div className="prime-tier-price">
                {t.priceDh}
                <span className="prime-tier-currency">dh</span>
                <span className="prime-tier-cadence">{t.cadence}</span>
              </div>
              <ul className="prime-tier-list">
                {t.perks.map((p) => (
                  <li key={p}>
                    <I.Check size={14} /> {p}
                  </li>
                ))}
              </ul>
              <MotionButton
                className={`btn ${t.highlight ? 'btn-primary' : 'btn-outline'} btn-lg`}
                onClick={() => subscribe(t.tier)}
                disabled={active === t.tier || buying !== null}
              >
                {active === t.tier ? (
                  'Active'
                ) : buying === t.tier ? (
                  <>Redirecting to Stripe...</>
                ) : (
                  <>Get {t.name} <I.Arrow /></>
                )}
              </MotionButton>
            </MotionCard>
          ))}
        </div>

        <div className="prime-footer-note">
          <I.Shield size={12} /> Payments secured by Stripe. Cancel anytime from your account.
        </div>
      </div>
    </section>
  );
}
