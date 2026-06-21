// AtlaasGo 3.0 — Profile (account hub). Faithful port of the Profile export in
// screen-tabs2.jsx, wired to live agApi + useCity + ThemeProvider + i18n.
// Markup/classNames preserved (ag2-* → ag3-*); mock reads replaced with agApi.
// City/theme/language are read from context (the prototype received them as props).
import type { ReactNode } from 'react';
import { agApi, type Lang } from '../../lib/agApi';
import { useCity } from '../CityContext';
import { useAsync } from '../useAsync';
import { useTheme } from '../../lib/theme';
import { useI18n, type Lang as UiLang } from '../../lib/i18n';
import {
  IWallet, IGift, IPin, IHeart, IUser, IGroup, IReceipt, IChevR, IGlobe, ISun, IMoon, IBolt,
} from '../icons';

type Go = (screen: string, payload?: unknown) => void;

/* i18n provider speaks uppercase EN/FR/AR; agApi.me.setLanguage speaks lowercase
   en/fr/ar (spec §1). Reconcile both ways. */
const SEG: [UiLang, Lang, string][] = [
  ['EN', 'en', 'English'],
  ['FR', 'fr', 'Français'],
  ['AR', 'ar', 'العربية'],
];

interface RowData {
  ic: ReactNode;
  t: string;
  s: string;
  c?: string;
  go?: string;
}

function Row({ r, onClick }: { r: RowData; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="ag3-card ag3-press" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', width: '100%', textAlign: 'left' }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: r.c || 'var(--fg-soft)', flexShrink: 0 }}>{r.ic}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>{r.t}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{r.s}</span>
      </span>
      <span style={{ color: 'var(--muted)' }}><IChevR size={20} /></span>
    </button>
  );
}

export default function Profile({ go }: { go: Go }) {
  const { city } = useCity();
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useI18n();
  const dark = theme === 'dark';

  const { data: me } = useAsync(() => agApi.me.get(), []);
  const { data: wallet } = useAsync(() => agApi.me.wallet(), []);
  const { data: addresses } = useAsync(() => agApi.me.addresses(), []);
  const { data: favourites } = useAsync(() => agApi.me.favourites(), []);
  const { data: promos } = useAsync(() => agApi.me.promos(), []);

  const setLanguage = (ui: UiLang, api: Lang) => {
    setLang(ui);
    // persist server-side; ignore failure when signed out (prototype kept it local-only)
    agApi.me.setLanguage(api).catch(() => {});
  };

  if (!city) {
    return (
      <div className="ag3-scroll" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  const name = me?.name || 'Guest';
  const initials = me?.initials || 'A';
  const firstName = name.split(' ')[0] + (name.split(' ')[1] ? ' ' + name.split(' ')[1].charAt(0) + '.' : '');
  const ordersCount = me?.stats.orders ?? 0;
  const favCount = me?.stats.favourites ?? (favourites?.length ?? 0);
  const walletDh = wallet?.balanceDh ?? me?.stats.walletDh ?? 0;
  const memberSince = me?.memberSince ?? 2024;

  const defaultAddr = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const addrCount = addresses?.length ?? 0;
  const addrMore = addrCount > 1 ? ` · ${addrCount - 1} more` : '';
  const addrLabel = defaultAddr
    ? `${defaultAddr.building || defaultAddr.label}${addrMore}`
    : (city.campus ? city.defaultAddress : `${city.defaultAddress}`);

  const activePromos = (promos ?? []).filter((p) => p.active);
  const promoSub = activePromos.length
    ? `${activePromos.length} active · ${activePromos[0].label}`
    : 'No active promos';

  const rows1: RowData[] = [
    { ic: <IWallet size={20} />, t: 'AtlaasGo Wallet', s: `${walletDh} dh balance`, c: 'var(--primary)', go: 'wallet' },
    { ic: <IPin size={20} />, t: 'Saved addresses', s: addrLabel, c: 'var(--fg-soft)', go: 'addresses' },
    { ic: <IHeart size={20} />, t: 'Favourites', s: `${favCount} place${favCount === 1 ? '' : 's'}`, c: '#E0526D', go: 'favourites' },
    { ic: <IGift size={20} />, t: 'Promos & credits', s: promoSub, c: 'var(--amber)', go: 'promos' },
  ];
  const rows2: RowData[] = [
    ...(city.campus ? [{ ic: <IGroup size={20} />, t: 'Group orders', s: city.defaultAddressSub || city.defaultAddress, go: 'group' }] : []),
    { ic: <IReceipt size={20} />, t: 'Order history', s: `${ordersCount} orders`, go: 'orders' },
  ];

  return (
    <div className="ag3-scroll ag3-anim" style={{ paddingTop: 8 }}>
      {/* identity */}
      <div className="ag3-pad" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 70, height: 70, borderRadius: 999, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontFamily: 'Montserrat', fontSize: 28, boxShadow: 'var(--sh-glow)' }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="disp" style={{ fontWeight: 800, fontSize: 22 }}>{firstName}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{city.campus ? `AUI · ${defaultAddr?.building || city.defaultAddress} · since ${memberSince}` : `${city.name} · since ${memberSince}`}</div>
          </div>
          <button className="ag3-iconbtn"><IUser size={20} /></button>
        </div>
        <div className="ag3-card" style={{ display: 'flex', marginTop: 16, padding: '15px 0' }}>
          {([[String(ordersCount), 'orders'], [String(favCount), 'favourites'], [String(walletDh), 'dh wallet']] as [string, string][]).map(([t, s], i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderLeft: i ? '1px solid var(--line)' : 'none' }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 19 }}>{t}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* appearance — dark mode toggle */}
      <div className="ag3-pad" style={{ marginTop: 18 }}>
        <div className="ag3-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>{dark ? <IMoon size={13} /> : <ISun size={13} />} Appearance</div>
        <button onClick={toggle} className="ag3-card ag3-press" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', width: '100%', textAlign: 'left' }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: dark ? 'var(--grad)' : 'var(--surface-2)', color: dark ? '#fff' : 'var(--amber)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: dark ? 'var(--sh-glow)' : 'none' }}>{dark ? <IMoon size={20} /> : <ISun size={20} />}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>Dark mode</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{dark ? 'On · easy on the eyes' : 'Off · follow the sun'}</span>
          </span>
          <span style={{ width: 50, height: 30, borderRadius: 999, background: dark ? 'var(--primary)' : 'var(--line)', position: 'relative', flexShrink: 0, transition: 'background .2s ease' }}>
            <span style={{ position: 'absolute', top: 3, left: dark ? 23 : 3, width: 24, height: 24, borderRadius: 999, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.25)', transition: 'left .2s cubic-bezier(.22,1,.36,1)' }} />
          </span>
        </button>
      </div>

      {/* language */}
      <div className="ag3-pad" style={{ marginTop: 18 }}>
        <div className="ag3-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><IGlobe size={13} /> Language</div>
        <div className="ag3-seg">
          {SEG.map(([ui, api, label]) => (
            <button key={ui} className={lang === ui ? 'is-active' : ''} onClick={() => setLanguage(ui, api)}>{label}</button>
          ))}
        </div>
      </div>

      {/* AtlaasGo+ banner */}
      <div className="ag3-pad" style={{ marginTop: 16 }}>
        <div className="ag3-card" style={{ padding: '17px 18px', background: 'linear-gradient(135deg, #1A1410, #3A2A1E)', border: 'none', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 110, height: 110, borderRadius: 999, background: 'var(--grad)', opacity: .5, filter: 'blur(8px)' }} />
          <div style={{ position: 'relative' }}>
            <div className="ag3-eyebrow" style={{ color: 'var(--amber)' }}><IBolt size={13} style={{ verticalAlign: -2 }} /> AtlaasGo+</div>
            <div className="disp" style={{ fontWeight: 800, fontSize: 19, margin: '6px 0 3px' }}>Free delivery, all winter.</div>
            <div style={{ fontSize: 12.5, opacity: .82 }}>Skip every fee for 49 dh/month · cancel anytime</div>
            <button className="ag3-btn ag3-btn-pill" style={{ background: '#fff', color: '#1A1410', marginTop: 14, padding: '12px 20px', fontSize: 14 }}>Try free for a month</button>
          </div>
        </div>
      </div>

      <div className="ag3-pad" style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows1.map((r, i) => <Row key={i} r={r} onClick={r.go ? () => go(r.go!) : undefined} />)}
      </div>
      <div className="ag3-pad" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows2.map((r, i) => <Row key={i} r={r} onClick={r.go ? () => go(r.go!) : undefined} />)}
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
