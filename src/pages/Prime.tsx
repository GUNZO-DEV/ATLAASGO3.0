import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';
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
  const [active, setActive] = useState<PrimeTier | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('prime_subscriptions')
      .select('tier,is_active')
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { tier?: PrimeTier } | null;
        setActive(row?.tier ?? null);
      });
  }, [user]);

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

        <div className="prime-grid">
          {TIERS.map((t, i) => (
            <FadeUp y={14} delay={i * 0.05} key={t.tier}>
              <div className={`prime-tier ${t.highlight ? 'highlight' : ''}`}>
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
                <button
                  className={`btn ${t.highlight ? 'btn-primary' : 'btn-outline'} btn-lg`}
                  onClick={() => {
                    if (!user) nav('/auth?next=/prime');
                    else alert('Stripe subscription wiring pending — add Stripe keys to enable.');
                  }}
                  disabled={active === t.tier}
                >
                  {active === t.tier ? 'Active' : `Get ${t.name}`} <I.Arrow />
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
