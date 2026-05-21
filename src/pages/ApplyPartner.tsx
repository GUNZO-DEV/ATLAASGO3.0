import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';

export default function ApplyPartner() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('restaurant_applications').insert({
      applicant_id: user?.id ?? null,
      business_name: name.trim(),
      contact_email: email.trim() || user?.email || '',
      contact_phone: phone.trim() || null,
      cuisine: cuisine.trim() || null,
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
            <h3>Welcome — application received</h3>
            <p>Our partnerships team will reach out by phone within 24 hours.</p>
            <MotionButton className="btn btn-primary" onClick={() => nav('/')}>
              Back home <I.Arrow />
            </MotionButton>
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
            <I.Box size={11} /> Partner with us
          </div>
          <h1 className="page-title">Bring your restaurant to AtlaasGo</h1>
          <p className="page-sub">
            14-day free trial. Tablet + POS included. We onboard you in under a week.
          </p>
        </FadeUp>

        <FadeUp y={14}>
          <div className="auth-card" style={{ marginTop: 28 }}>
            <div className="field">
              <label>Business name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Café Hassan"
                required
              />
            </div>
            <div className="field">
              <label>Contact email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.ma"
                required
              />
            </div>
            <div className="field">
              <label>Contact phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+212 5 35 ..."
              />
            </div>
            <div className="field">
              <label>Cuisine</label>
              <input
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="Moroccan · Tagines · Patisserie"
              />
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: 12 }}>{error}</div>}
            <MotionButton
              onClick={submit}
              disabled={busy || !name.trim() || (!email.trim() && !user?.email)}
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
            >
              {busy ? 'Submitting…' : 'Submit application'} <I.Arrow />
            </MotionButton>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
