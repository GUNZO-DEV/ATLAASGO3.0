import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useRoles } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { useMyApplications, type UserApplication } from '../lib/applications';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton } from '../components/visual/Motion';

const APP_STATUS_META: Record<
  UserApplication['status'],
  { label: string; color: string; bg: string }
> = {
  submitted:  { label: 'Submitted',      color: '#4F46E5', bg: 'rgba(99,91,255,0.10)' },
  reviewing:  { label: 'In review',      color: '#B45309', bg: 'rgba(245,158,11,0.10)' },
  approved:   { label: 'Approved',       color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  rejected:   { label: 'Not approved',   color: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
  needs_info: { label: 'Needs info',     color: '#B45309', bg: 'rgba(245,158,11,0.10)' },
};

/** E.164-ish phone validation — Morocco-friendly. */
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, '');
  // +212XXXXXXXXX (12 chars) or 0XXXXXXXXX (10 chars) or international
  return /^(\+\d{8,15}|0\d{9})$/.test(digits);
}

export default function AccountPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isRider, isMerchant, isAdmin } = useRoles();
  const { apps, loading: appsLoading } = useMyApplications();
  const nav = useNavigate();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [saving, setSaving] = useState(false);

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
        setOriginalPhone(row?.phone ?? '');
      });
  }, [user]);

  async function save() {
    if (!user) return;
    if (phone.trim() && !isValidPhone(phone.trim())) {
      toast.error('Please enter a valid phone number (e.g. +212612345678)');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile saved');
      setOriginalPhone(phone.trim());
    }
  }

  const quickLinks = [
    { to: '/orders', icon: <I.Receipt size={16} />, label: 'Order history' },
    { to: '/favorites', icon: <I.Heart size={16} />, label: 'Favorites' },
    { to: '/addresses', icon: <I.Pin size={16} />, label: 'Saved addresses' },
    { to: '/wallet', icon: <I.Wallet size={16} />, label: 'Wallet' },
    { to: '/prime', icon: <I.Star size={16} />, label: 'AtlaasGo Prime' },
    { to: '/notifications', icon: <I.Lightning size={16} />, label: 'Notifications' },
  ];

  if (isRider || isAdmin) quickLinks.push({ to: '/rider', icon: <I.Bike size={16} />, label: 'Rider dashboard' });
  if (isMerchant || isAdmin) quickLinks.push({ to: '/merchant', icon: <I.Box size={16} />, label: 'Restaurant POS' });
  if (isAdmin) quickLinks.push({ to: '/admin', icon: <I.Shield size={16} />, label: 'Admin panel' });

  const phoneMissing = !originalPhone;
  const phoneChanged = phone.trim() !== originalPhone;
  const nameChanged = displayName.trim() !== ''; // simplified; allow save
  const canSave = (phoneChanged || nameChanged) && !saving;

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

        {/* Phone-missing warning banner */}
        {phoneMissing && !appsLoading && (
          <div
            style={{
              marginTop: 18,
              background: 'rgba(245,158,11,0.10)',
              border: '1px solid rgba(245,158,11,0.30)',
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(245,158,11,0.15)', color: '#B45309',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <I.Phone size={16} />
            </div>
            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.45 }}>
              <strong>Add a phone number</strong> so your rider can reach you with orders. Required for cash-on-delivery.
            </div>
          </div>
        )}

        <div className="account-grid" style={{ marginTop: 24 }}>
          {/* Profile card */}
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
                <label>
                  Phone {phoneMissing && <span style={{ color: '#B45309', fontWeight: 700 }}>· required for orders</span>}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 12 34 56 78"
                  aria-invalid={!!phone && !isValidPhone(phone)}
                />
                {phone && !isValidPhone(phone) && (
                  <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 4 }}>
                    Format: +212XXXXXXXXX or 06XXXXXXXX
                  </div>
                )}
              </div>
              <MotionButton onClick={save} disabled={!canSave} className="btn btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </MotionButton>
            </div>
          </FadeUp>

          {/* Quick links */}
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
              <MotionButton
                onClick={async () => {
                  await signOut();
                  toast.info('Signed out');
                  nav('/');
                }}
                className="btn btn-outline btn-block"
                style={{ marginTop: 16 }}
              >
                Sign out
              </MotionButton>
            </div>
          </FadeUp>
        </div>

        {/* Applications section */}
        {!appsLoading && apps.length > 0 && (
          <FadeUp y={14}>
            <div style={{ marginTop: 32 }}>
              <h3
                style={{
                  fontFamily: 'Montserrat',
                  fontWeight: 800,
                  fontSize: 18,
                  margin: '0 0 14px',
                }}
              >
                Applications
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {apps.map((app) => {
                  const meta = APP_STATUS_META[app.status];
                  const submittedAt = new Date(app.created_at);
                  return (
                    <div
                      key={app.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 18px',
                        background: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: meta.bg,
                          color: meta.color,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {app.kind === 'rider' ? '🏍' : '🏪'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {app.kind === 'rider' ? 'Rider application' : 'Partner application'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--fg-soft)', marginTop: 2 }}>
                          Submitted{' '}
                          {submittedAt.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        {app.reviewer_notes && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: 'var(--fg)',
                              background: 'rgba(0,0,0,0.04)',
                              padding: '6px 10px',
                              borderRadius: 8,
                            }}
                          >
                            <strong>Reviewer note:</strong> {app.reviewer_notes}
                          </div>
                        )}
                      </div>
                      <span
                        style={{
                          background: meta.bg,
                          color: meta.color,
                          padding: '4px 12px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          flexShrink: 0,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
