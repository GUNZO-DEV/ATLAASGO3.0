/**
 * Premium mobile Account screen — iOS Settings-style grouped rows.
 * Big avatar header, sectioned link groups, sign-out button at bottom.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useRoles } from '../lib/roles';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { useMyApplications, type UserApplication } from '../lib/applications';

const APP_STATUS_META: Record<
  UserApplication['status'],
  { label: string; color: string; bg: string }
> = {
  submitted:  { label: 'Submitted',   color: '#4F46E5', bg: 'rgba(99,91,255,0.10)' },
  reviewing:  { label: 'In review',   color: '#B45309', bg: 'rgba(245,158,11,0.10)' },
  approved:   { label: 'Approved',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  rejected:   { label: 'Not approved', color: '#B91C1C', bg: 'rgba(239,68,68,0.10)' },
  needs_info: { label: 'Needs info',  color: '#B45309', bg: 'rgba(245,158,11,0.10)' },
};

function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, '');
  return /^(\+\d{8,15}|0\d{9})$/.test(digits);
}

export default function MobileAccount() {
  const { user, signOut } = useAuth();
  const { isRider, isMerchant, isAdmin } = useRoles();
  const { apps } = useMyApplications();
  const nav = useNavigate();
  const toast = useToast();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);

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
      toast.error('Please enter a valid phone (e.g. +212612345678)');
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
    if (error) toast.error(error.message);
    else {
      toast.success('Saved');
      setOriginalPhone(phone.trim());
      setEditingName(false);
      setEditingPhone(false);
    }
  }

  if (!user) return null;

  const initial = (displayName || user.email || 'A').charAt(0).toUpperCase();
  const phoneMissing = !originalPhone;

  return (
    <div className="macc">
      {/* Avatar header */}
      <header className="macc-hd">
        <div className="macc-avatar">{initial}</div>
        <h1 className="macc-name">{displayName || user.email?.split('@')[0]}</h1>
        <p className="macc-email">{user.email}</p>
        {(isAdmin || isRider || isMerchant) && (
          <div className="macc-roles">
            {isAdmin && <span className="macc-role admin">⚡ Admin</span>}
            {isRider && <span className="macc-role rider">🏍 Rider</span>}
            {isMerchant && <span className="macc-role merchant">🏪 Merchant</span>}
          </div>
        )}
      </header>

      {/* Phone-required nudge */}
      {phoneMissing && (
        <button onClick={() => setEditingPhone(true)} className="macc-nudge">
          <div className="macc-nudge-icon">📞</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div className="macc-nudge-title">Add a phone number</div>
            <div className="macc-nudge-sub">Required so your rider can reach you for delivery</div>
          </div>
          <I.Arrow size={14} />
        </button>
      )}

      {/* PROFILE section */}
      <SectionTitle>Profile</SectionTitle>
      <Group>
        <EditableRow
          icon={<I.User size={16} />}
          label="Display name"
          value={displayName || '—'}
          editing={editingName}
          onEdit={() => setEditingName(true)}
          renderInput={() => (
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Yasmine"
              className="macc-input"
            />
          )}
        />
        <EditableRow
          icon={<I.Phone size={16} />}
          label="Phone"
          value={phone || 'Not set'}
          editing={editingPhone}
          onEdit={() => setEditingPhone(true)}
          danger={phoneMissing}
          renderInput={() => (
            <input
              autoFocus
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212 6 12 34 56 78"
              className="macc-input"
            />
          )}
        />
        {(editingName || editingPhone) && (
          <button
            onClick={save}
            disabled={saving}
            className="macc-save-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </Group>

      {/* ACTIVITY section */}
      <SectionTitle>Activity</SectionTitle>
      <Group>
        <LinkRow to="/orders" icon={<I.Receipt size={16} />} label="Order history" emojiBg="#FF8A65" />
        <LinkRow to="/track" icon={<I.Bike size={16} />} label="Track active order" emojiBg="#635BFF" />
        <LinkRow to="/favorites" icon={<I.Heart size={16} />} label="Favorites" emojiBg="#EC4899" />
        <LinkRow to="/notifications" icon={<I.Lightning size={16} />} label="Notifications" emojiBg="#F59E0B" />
      </Group>

      {/* PREFERENCES section */}
      <SectionTitle>Preferences</SectionTitle>
      <Group>
        <LinkRow to="/addresses" icon={<I.Pin size={16} />} label="Delivery addresses" emojiBg="#34D399" />
        <LinkRow to="/wallet" icon={<I.Wallet size={16} />} label="Wallet" emojiBg="#7C3AED" />
        <LinkRow to="/prime" icon={<I.Star size={16} />} label="AtlaasGo Prime" emojiBg="#FF5722" badge="Save 47 dh/wk" />
      </Group>

      {/* WORK section (role-aware) */}
      {(isRider || isMerchant || isAdmin) && (
        <>
          <SectionTitle>Work</SectionTitle>
          <Group>
            {(isRider || isAdmin) && (
              <LinkRow to="/rider" icon={<I.Bike size={16} />} label="Rider dashboard" emojiBg="#635BFF" />
            )}
            {(isMerchant || isAdmin) && (
              <LinkRow to="/merchant" icon={<I.Box size={16} />} label="Restaurant POS" emojiBg="#059669" />
            )}
            {isAdmin && (
              <LinkRow to="/admin" icon={<I.Shield size={16} />} label="Admin panel" emojiBg="#1A1410" />
            )}
          </Group>
        </>
      )}

      {/* APPLICATIONS section */}
      {apps.length > 0 && (
        <>
          <SectionTitle>Applications</SectionTitle>
          <Group>
            {apps.map((app) => {
              const meta = APP_STATUS_META[app.status];
              return (
                <div key={app.id} className="macc-row macc-row-app">
                  <span className="macc-row-icon" style={{ background: meta.bg, color: meta.color }}>
                    {app.kind === 'rider' ? '🏍' : '🏪'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="macc-row-label">
                      {app.kind === 'rider' ? 'Rider application' : 'Partner application'}
                    </div>
                    <div className="macc-row-sub">
                      {new Date(app.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <span className="macc-pill" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </Group>
        </>
      )}

      {/* INFO section */}
      <SectionTitle>About</SectionTitle>
      <Group>
        <a href="mailto:support@atlaasgo.com" className="macc-row" style={{ textDecoration: 'none' }}>
          <span className="macc-row-icon" style={{ background: 'rgba(99,91,255,0.10)', color: '#4F46E5' }}>
            ✉
          </span>
          <span className="macc-row-label" style={{ flex: 1 }}>Help &amp; support</span>
          <I.Arrow size={14} style={{ color: 'var(--fg-soft)' }} />
        </a>
        <a href="https://atlaasgo.com/terms" target="_blank" rel="noopener noreferrer" className="macc-row" style={{ textDecoration: 'none' }}>
          <span className="macc-row-icon" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--fg-soft)' }}>
            §
          </span>
          <span className="macc-row-label" style={{ flex: 1 }}>Terms &amp; privacy</span>
          <I.Arrow size={14} style={{ color: 'var(--fg-soft)' }} />
        </a>
      </Group>

      {/* Sign out */}
      <div style={{ padding: '20px 14px 32px' }}>
        <button
          onClick={async () => {
            await signOut();
            toast.info('Signed out');
            nav('/');
          }}
          className="macc-signout"
        >
          Sign out
        </button>
        <div className="macc-build">
          AtlaasGo · v3.0 · Built in Ifrane 🏔
        </div>
      </div>

      <MobileAccountStyles />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="macc-section-title">{children}</div>;
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="macc-group">{children}</div>;
}

function LinkRow({
  to,
  icon,
  label,
  emojiBg,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  emojiBg: string;
  badge?: string;
}) {
  return (
    <Link to={to} className="macc-row">
      <span
        className="macc-row-icon"
        style={{ background: `${emojiBg}1A`, color: emojiBg }}
      >
        {icon}
      </span>
      <span className="macc-row-label">{label}</span>
      {badge && <span className="macc-row-badge">{badge}</span>}
      <I.Arrow size={14} style={{ color: 'var(--fg-soft)' }} />
    </Link>
  );
}

function EditableRow({
  icon,
  label,
  value,
  editing,
  onEdit,
  renderInput,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  renderInput: () => React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="macc-row" style={{ flexDirection: editing ? 'column' : 'row', alignItems: editing ? 'stretch' : 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <span
          className="macc-row-icon"
          style={{
            background: danger ? 'rgba(245,158,11,0.10)' : 'rgba(0,0,0,0.04)',
            color: danger ? '#B45309' : 'var(--fg-soft)',
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="macc-row-sub" style={{ marginBottom: editing ? 4 : 2, fontSize: 11 }}>{label}</div>
          {!editing && (
            <div className="macc-row-label" style={{ color: danger ? '#B45309' : 'var(--fg)' }}>{value}</div>
          )}
        </div>
        {!editing && (
          <button onClick={onEdit} className="macc-edit-btn">Edit</button>
        )}
      </div>
      {editing && <div style={{ marginTop: 8, marginLeft: 48 }}>{renderInput()}</div>}
    </div>
  );
}

function MobileAccountStyles() {
  return (
    <style>{`
      .macc {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .macc-hd {
        text-align: center;
        padding: 32px 20px 24px;
      }
      .macc-avatar {
        width: 84px; height: 84px;
        margin: 0 auto 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 36px;
        display: grid; place-items: center;
        box-shadow: 0 12px 32px -8px rgba(255,87,34,0.5);
        letter-spacing: -0.02em;
      }
      .macc-name {
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 22px;
        margin: 0 0 4px;
        letter-spacing: -0.02em;
        color: var(--fg);
      }
      .macc-email {
        font-size: 13px;
        color: var(--fg-soft);
        margin: 0;
      }
      .macc-roles {
        display: flex; gap: 6px; justify-content: center; margin-top: 12px;
        flex-wrap: wrap;
      }
      .macc-role {
        font-size: 10px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 999px;
        letter-spacing: 0.04em;
      }
      .macc-role.admin    { background: rgba(0,0,0,0.06); color: var(--fg); }
      .macc-role.rider    { background: rgba(99,91,255,0.10); color: #4F46E5; }
      .macc-role.merchant { background: rgba(5,150,105,0.10); color: #059669; }

      .macc-nudge {
        margin: 0 14px 20px;
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px;
        background: linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.06));
        border: 1px solid rgba(245,158,11,0.24);
        border-radius: 16px;
        color: var(--fg);
        cursor: pointer;
        width: calc(100% - 28px);
      }
      .macc-nudge-icon {
        font-size: 24px;
      }
      .macc-nudge-title {
        font-weight: 800;
        font-size: 14px;
      }
      .macc-nudge-sub {
        font-size: 12px;
        color: var(--fg-soft);
        margin-top: 1px;
      }

      .macc-section-title {
        padding: 22px 18px 10px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fg-soft);
      }
      .macc-group {
        margin: 0 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
      }
      .macc-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        text-decoration: none;
        color: var(--fg);
        border-top: 1px solid var(--line);
        cursor: pointer;
        transition: background .15s;
      }
      .macc-row:first-child { border-top: 0; }
      .macc-row:active { background: rgba(0,0,0,0.03); }
      .macc-row-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        display: grid; place-items: center;
        flex-shrink: 0;
        font-size: 18px;
      }
      .macc-row-icon svg { width: 16px; height: 16px; }
      .macc-row-label {
        font-weight: 600;
        font-size: 14.5px;
        color: var(--fg);
      }
      .macc-row-sub {
        font-size: 11.5px;
        color: var(--fg-soft);
        font-weight: 500;
      }
      .macc-row-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 9px;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        border-radius: 999px;
        margin-right: 6px;
      }
      .macc-row-app .macc-row-icon { font-size: 18px; }
      .macc-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 999px;
        flex-shrink: 0;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .macc-edit-btn {
        background: transparent;
        border: 0;
        color: var(--primary);
        font-weight: 700;
        font-size: 13px;
        padding: 4px 8px;
        cursor: pointer;
      }
      .macc-input {
        width: 100%;
        padding: 11px 14px;
        background: var(--bg);
        border: 1.5px solid var(--primary);
        border-radius: 10px;
        color: var(--fg);
        font-size: 15px !important;
        font-family: inherit;
        outline: none;
      }
      .macc-save-btn {
        display: block;
        width: calc(100% - 32px);
        margin: 12px 16px;
        padding: 12px;
        background: var(--primary);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
      }
      .macc-signout {
        width: 100%;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 14px;
        color: #B91C1C;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: background .15s;
      }
      .macc-signout:active {
        background: rgba(239,68,68,0.06);
      }
      .macc-build {
        text-align: center;
        margin-top: 22px;
        font-size: 11px;
        color: var(--fg-soft);
        opacity: 0.7;
      }
    `}</style>
  );
}
