import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useCreateOrder } from '../lib/orders';
import { FadeUp } from '../components/visual/ScrollReveal';

const AUI_BUILDINGS = {
  'Residence Halls': [
    'Building 1 — Men\'s Dorm',
    'Building 2 — Men\'s Dorm',
    'Building 3 — Men\'s Dorm',
    'Building 4 — Men\'s Dorm',
    'Building 5 — Men\'s Dorm',
    'Building 6 — Men\'s Dorm',
    'Building 7 — Men\'s Dorm',
    'Building 8 — Men\'s Dorm',
    'Building 9 — Women\'s Dorm',
    'Building 10 — Women\'s Dorm',
    'Building 11 — Women\'s Dorm',
    'Building 12 — Women\'s Dorm',
    'Building 13 — Women\'s Dorm',
    'Building 14 — Women\'s Dorm',
    'Building 15 — Women\'s Dorm',
    'Building 16 — Mixed Dorm',
    'Building 17 — Graduate Housing',
    'Building 18 — Graduate Housing',
    'Building 19 — Faculty Housing',
    'Building 20 — Faculty Housing',
    'Atlas Residence',
    'International Student House',
  ],
  'Academic Buildings': [
    'Main Academic Building (MAB)',
    'Engineering & Sciences (ESB)',
    'School of Business (SBA)',
    'Library — Old Wing',
    'Library — New Wing',
    'Student Center',
    'Amphitheater',
  ],
  'Facilities': [
    'AUI Cafeteria (Main)',
    'Sports Complex',
    'Health Center',
    'Admin Building',
    'Gate / Security Post',
    'Parking Area A',
    'Parking Area B',
  ],
};

const FIXED_PRICE_DH = 15;

export default function CampusPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { create, submitting, error } = useCreateOrder();
  const cartCount = useCart((s) => s.count());

  const [what, setWhat] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = what.trim().length >= 3 && building && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!user) {
      nav('/auth?next=/campus');
      return;
    }
    const coords = { lat: 33.5350, lng: -5.1106 }; // AUI default
    const orderId = await create({
      items: [
        {
          id: `campus-${Date.now()}`,
          restaurantSlug: 'aui-cafeteria',
          restaurantName: 'AUIER Campus Drop',
          name: what.trim(),
          priceDh: FIXED_PRICE_DH,
          qty: 1,
        },
      ],
      landmark: `${building}${room ? `, Room/Suite ${room}` : ''}`,
      coords,
      deliveryNotes: notes.trim() || undefined,
      subtotalDh: FIXED_PRICE_DH,
      deliveryFeeDh: 0,
      serviceFeeDh: 0,
      totalDh: FIXED_PRICE_DH,
    });
    if (orderId) {
      setSubmitted(true);
      setTimeout(() => nav(`/track/${orderId}`), 1200);
    }
  }

  if (submitted) {
    return (
      <section className="page">
        <div className="container" style={{ maxWidth: 540 }}>
          <div className="campus-success">
            <div className="campus-success-icon">🏫</div>
            <h2>On its way</h2>
            <p>Your rider is heading to <strong>{building}</strong>{room ? `, Room ${room}` : ''}.</p>
            <p style={{ color: 'var(--fg-soft)', fontSize: 13 }}>Redirecting to live tracking…</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        {/* Hero */}
        <FadeUp y={12}>
          <div className="campus-hero">
            <span className="campus-hero-badge">
              <I.Lightning size={12} /> AUIER — Free campus delivery
            </span>
            <h1 className="campus-hero-title">
              What do you<br />
              <span className="campus-hero-accent">need?</span>
            </h1>
            <p className="campus-hero-sub">
              Anything in Ifrane, delivered to your building. Flat {FIXED_PRICE_DH} dh.
              No surprises.
            </p>
            {cartCount > 0 && (
              <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 8 }}>
                You have {cartCount} item{cartCount > 1 ? 's' : ''} in your regular cart too —{' '}
                <a href="/cart" style={{ textDecoration: 'underline' }}>view cart</a>
              </p>
            )}
          </div>
        </FadeUp>

        <div className="campus-form-card">
          {/* What do you need */}
          <FadeUp y={10} delay={0.05}>
            <div className="field">
              <label htmlFor="what">
                <I.Search size={13} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />
                What do you need?
              </label>
              <textarea
                id="what"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder="e.g. Café Hassan tagine kefta + mint tea, or Snack Atlas brochette plate, or anything you want brought from town…"
                rows={3}
                className="campus-textarea"
                style={{ resize: 'vertical' }}
              />
              <div className="campus-quick-chips">
                {['Café Hassan tagine', 'Boulangerie croissant', 'Snack Atlas brochettes', 'Bab Mansour café', 'Cold medicine', 'Groceries from souk'].map((s) => (
                  <button key={s} type="button" onClick={() => setWhat(s)}>{s}</button>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Building selector */}
          <FadeUp y={10} delay={0.1}>
            <div className="field">
              <label htmlFor="building">
                <I.Home size={13} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />
                Building / Location
              </label>
              <select
                id="building"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="campus-select"
              >
                <option value="">— Select your building —</option>
                {Object.entries(AUI_BUILDINGS).map(([group, buildings]) => (
                  <optgroup label={group} key={group}>
                    {buildings.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </FadeUp>

          {/* Room number */}
          <FadeUp y={10} delay={0.12}>
            <div className="field">
              <label htmlFor="room">
                <I.Pin size={13} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />
                Room / Suite / Floor <span style={{ color: 'var(--fg-soft)' }}>(optional)</span>
              </label>
              <input
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 204, Suite 3B, Ground floor lobby"
              />
            </div>
          </FadeUp>

          {/* Driver notes */}
          <FadeUp y={10} delay={0.14}>
            <div className="field">
              <label htmlFor="cnotes">
                Notes for the rider <span style={{ color: 'var(--fg-soft)' }}>(optional)</span>
              </label>
              <input
                id="cnotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. I'm outside the main gate, leave at the door, call first"
              />
            </div>
          </FadeUp>

          {/* Fixed price display */}
          <FadeUp y={10} delay={0.16}>
            <div className="campus-price-strip">
              <div>
                <div className="campus-price-label">Fixed campus delivery fee</div>
                <div className="campus-price-sub">No minimum order · Any item in Ifrane</div>
              </div>
              <div className="campus-price-amount">{FIXED_PRICE_DH} dh</div>
            </div>
          </FadeUp>

          {error && (
            <div style={{ color: '#EF4444', fontSize: 13, padding: '8px 0' }}>{error}</div>
          )}

          <FadeUp y={10} delay={0.2}>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="campus-cta"
            >
              {submitting
                ? 'Placing order…'
                : !user
                  ? 'Sign in to order'
                  : !building
                    ? 'Select a building first'
                    : what.trim().length < 3
                      ? 'Describe what you need'
                      : `Request delivery · ${FIXED_PRICE_DH} dh flat`}
              <I.Arrow size={18} />
            </button>
          </FadeUp>

          <p style={{ fontSize: 11, color: 'var(--fg-soft)', textAlign: 'center', marginTop: 12 }}>
            Rider heads to your building within 15–30 min · Pay cash or wallet on delivery
          </p>
        </div>

        {/* How it works strip */}
        <div className="campus-steps">
          <div className="campus-step">
            <span>1</span> Describe what you want
          </div>
          <I.Arrow size={14} style={{ color: 'var(--fg-soft)', flexShrink: 0 }} />
          <div className="campus-step">
            <span>2</span> Choose your building
          </div>
          <I.Arrow size={14} style={{ color: 'var(--fg-soft)', flexShrink: 0 }} />
          <div className="campus-step">
            <span>3</span> Rider heads to you
          </div>
        </div>
      </div>
    </section>
  );
}
