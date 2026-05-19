import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/account', { replace: true });
  }, [authLoading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name,phone')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { display_name?: string | null; phone?: string | null } | null;
        setDisplayName(row?.display_name ?? '');
        setPhone(row?.phone ?? '');
      });
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', user.id);
    setSaving(false);
    setStatus(error ? `Error: ${error.message}` : 'Saved');
    if (!error) setTimeout(() => setStatus(null), 2400);
  }

  const quickLinks = [
    { to: '/orders', icon: <I.Receipt size={16} />, label: 'Order history' },
    { to: '/favorites', icon: <I.Heart size={16} />, label: 'Favorites' },
    { to: '/addresses', icon: <I.Pin size={16} />, label: 'Saved addresses' },
    { to: '/wallet', icon: <I.Wallet size={16} />, label: 'Wallet' },
    { to: '/prime', icon: <I.Star size={16} />, label: 'AtlaasGo Prime' },
    { to: '/notifications', icon: <I.Lightning size={16} />, label: 'Notifications' },
  ];

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.User size={11} /> Account
          </div>
          <h1 className="page-title">{displayName || user?.email || 'Your account'}</h1>
          <p className="page-sub">
            Signed in as <strong>{user?.email}</strong>
          </p>
        </FadeUp>

        <div className="account-grid">
          <FadeUp y={14}>
            <div className="account-card">
              <h3>Profile</h3>
              <div className="field">
                <label>Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Yasmine El Idrissi"
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 12 34 56 78"
                />
              </div>
              <button onClick={save} disabled={saving} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {status && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: status === 'Saved' ? '#059669' : '#B91C1C',
                  }}
                >
                  {status}
                </div>
              )}
            </div>
          </FadeUp>

          <FadeUp y={14} delay={0.05}>
            <div className="account-card">
              <h3>Quick access</h3>
              <div className="account-links">
                {quickLinks.map((l) => (
                  <Link to={l.to} key={l.to} className="account-link">
                    {l.icon}
                    <span>{l.label}</span>
                    <I.Arrow size={14} />
                  </Link>
                ))}
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  nav('/');
                }}
                className="btn btn-outline btn-block"
                style={{ marginTop: 16 }}
              >
                Sign out
              </button>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
