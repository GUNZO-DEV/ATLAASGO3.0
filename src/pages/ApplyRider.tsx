import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { FadeUp } from '../components/visual/ScrollReveal';

export default function ApplyRider() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('rider_applications').insert({
      applicant_id: user?.id ?? null,
      full_name: fullName.trim(),
      contact_phone: phone.trim(),
      email: user?.email ?? null,
      vehicle: vehicle.trim() || null,
      plate: plate.trim() || null,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  }

  if (done) {
    return (
      <section className="page">
        <div className="container">
          <div className="empty-state" style={{ marginTop: 40 }}>
            <I.Check size={36} />
            <h3>Application submitted</h3>
            <p>
              Our team will review your details and reach out within 48 hours. Track status in your
              account → Applications.
            </p>
            <button className="btn btn-primary" onClick={() => nav('/')}>
              Back home <I.Arrow />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={10}>
          <div className="section-tag">
            <I.Bike size={11} /> Drive with us
          </div>
          <h1 className="page-title">Become an AtlaasGo rider</h1>
          <p className="page-sub">
            60–90 dh/hour average, daily payouts, full SOS support. Apply in 60 seconds.
          </p>
        </FadeUp>

        <FadeUp y={14}>
          <div className="auth-card" style={{ marginTop: 28 }}>
            <div className="field">
              <label>Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Youssef Benali"
                required
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 6 12 34 56 78"
                required
              />
            </div>
            <div className="field">
              <label>Vehicle</label>
              <input
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                placeholder="Honda CG 125, scooter, bicycle…"
              />
            </div>
            <div className="field">
              <label>Plate</label>
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="9123-A-42"
              />
            </div>
            {!user && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-soft)',
                  background: 'rgba(255,87,34,0.08)',
                  padding: '10px 12px',
                  borderRadius: 12,
                  lineHeight: 1.4,
                }}
              >
                You can submit without an account. We'll match it when you sign up later.
              </p>
            )}
            {error && (
              <div style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{error}</div>
            )}
            <button
              onClick={submit}
              disabled={busy || !fullName.trim() || !phone.trim()}
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
            >
              {busy ? 'Submitting…' : 'Submit application'} <I.Arrow />
            </button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
