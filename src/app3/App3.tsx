// AtlaasGo 3.0 — app shell (port of ag-app2.jsx App + NavBar + CityPicker,
// minus the AndroidDevice bezel + Tweaks panel). Owns the screen stack, tab
// state, and the city-picker sheet. Foundation phase: only Home is real; the
// other five screens are "Coming next" placeholders the Integrate phase
// replaces. Wraps content in CityProvider + CartProvider.
import { useState, type CSSProperties } from 'react';
import { useTheme } from '../lib/theme';
import { CityProvider, useCity } from './CityContext';
import { CartProvider, useCart } from './CartContext';
import { IHome, ISearch, IBag, IUser, IPin, IClose, ICheck } from './icons';
import type { City, Order, Store } from '../lib/agApi';
import Home from './screens/Home';
import Search from './screens/Search';
import Orders from './screens/Orders';
import Profile from './screens/Profile';
import Restaurant from './screens/Restaurant';
import Checkout from './screens/Checkout';
import Tracking from './screens/Tracking';
import './ag3.css';

type Go = (screen: string, payload?: unknown) => void;

const NAV = [
  { id: 'home', label: 'Home', Ico: IHome },
  { id: 'search', label: 'Search', Ico: ISearch },
  { id: 'orders', label: 'Orders', Ico: IBag },
  { id: 'profile', label: 'Profile', Ico: IUser },
] as const;

function NavBar({ active, onTab, cartCount }: { active: string; onTab: (id: string) => void; cartCount: number }) {
  return (
    <nav className="ag3-nav">
      {NAV.map((t) => {
        const on = active === t.id;
        const isOrders = t.id === 'orders';
        return (
          <button key={t.id} className={`ag3-navitem ${on ? 'is-active' : ''}`} onClick={() => onTab(t.id)}>
            <span className="ind">
              <t.Ico size={24} sw={on ? 2.2 : 1.9} />
              {isOrders && cartCount > 0 && <span className="badge">{cartCount}</span>}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function CityPicker({ onClose }: { onClose: () => void }) {
  const { city, cities, setCity } = useCity();
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,.52)', backdropFilter: 'blur(2px)', animation: 'ag3-fade .25s ease' }} />
      <div className="ag3-anim" style={{ position: 'relative', background: 'var(--surface)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '18px 18px calc(18px + var(--safe-bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="disp" style={{ fontWeight: 800, fontSize: 20 }}>Choose your city</div>
          <button className="ag3-iconbtn" style={{ width: 38, height: 38 }} onClick={onClose}><IClose size={19} /></button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>AtlaasGo delivers across Morocco · campus features in Ifrane</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {cities.map((c: City) => {
            const on = c.id === city?.id;
            return (
              <button key={c.id} onClick={() => { setCity(c); onClose(); }} className="ag3-card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', textAlign: 'left', border: `1.5px solid ${on ? 'var(--primary)' : 'var(--line-2)'}` }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: on ? 'var(--grad)' : 'var(--surface-2)', color: on ? '#fff' : 'var(--fg-soft)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: on ? 'var(--sh-glow)' : 'none' }}><IPin size={21} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15.5, fontFamily: 'Montserrat' }}>{c.name} {c.campus && <span className="ag3-badge ag3-badge-soft" style={{ fontSize: 10, padding: '2px 8px' }}>Campus</span>}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{c.defaultAddress}</span>
                </span>
                {on && <span style={{ color: 'var(--primary)' }}><ICheck size={20} /></span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Frame = { screen: string; payload?: unknown };
const FULL_SCREENS = ['restaurant', 'cart', 'tracking'];

function Shell() {
  const { theme } = useTheme();
  const { count } = useCart();
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState<Frame[]>([{ screen: 'home' }]);
  const [cityOpen, setCityOpen] = useState(false);

  const top = stack[stack.length - 1];

  const go: Go = (screen, payload) => {
    if (screen === 'back') { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); return; }
    if (screen === 'home') { setTab('home'); setStack([{ screen: 'home' }]); return; }
    if (['search', 'orders', 'profile'].includes(screen)) { setTab(screen); setStack([{ screen }]); return; }
    setStack((s) => [...s, { screen, payload }]);
  };
  const onTab = (id: string) => { setTab(id); setStack([{ screen: id }]); };

  const showTabs = !FULL_SCREENS.includes(top.screen);

  let content;
  switch (top.screen) {
    case 'home': content = <Home go={go} onPickCity={() => setCityOpen(true)} />; break;
    case 'search': content = <Search go={go} />; break;
    case 'orders': content = <Orders go={go} />; break;
    case 'profile': content = <Profile go={go} />; break;
    case 'restaurant': content = <Restaurant resto={top.payload as Store} go={go} />; break;
    case 'cart': content = <Checkout go={go} />; break;
    case 'tracking': content = <Tracking order={top.payload as Order} go={go} />; break;
    default: content = <Home go={go} onPickCity={() => setCityOpen(true)} />;
  }

  const payloadKey = (top.payload as { id?: string } | undefined)?.id ?? '';

  return (
    <div className="ag3" data-theme={theme} style={{ '--radius-scale': 1 } as CSSProperties}>
      <div className="ag3-stage">
        <div key={top.screen + payloadKey} className="ag3-screen">
          {content}
        </div>
      </div>
      {showTabs && <NavBar active={tab} onTab={onTab} cartCount={count} />}
      {cityOpen && <CityPicker onClose={() => setCityOpen(false)} />}
    </div>
  );
}

export default function App3() {
  return (
    <CityProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </CityProvider>
  );
}
