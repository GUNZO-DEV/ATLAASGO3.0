import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useTheme } from '../lib/theme';
import { useI18n, type Lang } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { useAuth } from '../lib/auth';
import { useRoles } from '../lib/roles';
import { useNotifications } from '../lib/customer';

const LANGS: Lang[] = ['EN', 'FR', 'AR'];

export default function Nav() {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const cartCount = useCart((s) => s.count());
  const { user, signOut } = useAuth();
  const { isAdmin, isRider, isMerchant } = useRoles();
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  return (
    <div className="nav-wrap" style={{ top: scrolled ? 10 : 16 }}>
      <nav className="nav" aria-label="Primary">
        <Link to="/" className="nav-logo">
          <span className="logo-mark">
            <I.Logo size={18} />
          </span>
          <span>AtlaasGo</span>
        </Link>

        <div className="nav-links">
          <NavLink className="nav-link" to="/order">
            {t('nav.order')}
          </NavLink>
          <NavLink className="nav-link" to="/campus">
            🏫 Campus
          </NavLink>
          <a className="nav-link" href="/#partners">
            {t('nav.partners')}
          </a>
          <NavLink className="nav-link" to="/prime">
            Prime
          </NavLink>
          <NavLink className="nav-link" to="/rider">
            {t('nav.drive')}
          </NavLink>
        </div>

        <div className="nav-actions">
          <div className="lang-pill" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l}
                className={lang === l ? 'active' : ''}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
              >
                {l}
              </button>
            ))}
          </div>

          {user && (
            <Link
              to="/notifications"
              className="icon-btn"
              aria-label="Notifications"
              style={{ position: 'relative' }}
            >
              <I.Lightning size={16} />
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </Link>
          )}

          <Link to="/cart" className="icon-btn" aria-label="Cart" style={{ position: 'relative' }}>
            <I.Bag size={16} />
            {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
          </Link>

          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <I.Sun /> : <I.Moon />}
          </button>

          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-outline"
                onClick={() => setAccountOpen((o) => !o)}
                style={{ padding: '8px 14px', fontSize: 13 }}
                aria-expanded={accountOpen}
                aria-label="Account menu"
              >
                <I.User size={14} />
                <span className="nav-user-label">
                  {user.email?.split('@')[0] ?? 'Account'}
                </span>
              </button>
              {accountOpen && (
                <div className="nav-account-dropdown" role="menu">
                  <Link className="nav-dropdown-row" to="/account" role="menuitem">
                    <I.User size={14} /> Account
                  </Link>
                  <Link className="nav-dropdown-row" to="/orders" role="menuitem">
                    <I.Receipt size={14} /> Order history
                  </Link>
                  <Link className="nav-dropdown-row" to="/favorites" role="menuitem">
                    <I.Heart size={14} /> Favorites
                  </Link>
                  <Link className="nav-dropdown-row" to="/addresses" role="menuitem">
                    <I.Pin size={14} /> Addresses
                  </Link>
                  <Link className="nav-dropdown-row" to="/wallet" role="menuitem">
                    <I.Wallet size={14} /> Wallet
                  </Link>
                  <Link className="nav-dropdown-row" to="/notifications" role="menuitem">
                    <I.Lightning size={14} /> Notifications
                  </Link>
                  {(isRider || isMerchant || isAdmin) && (
                    <div className="nav-dropdown-divider" />
                  )}
                  {(isRider || isAdmin) && (
                    <Link className="nav-dropdown-row" to="/rider" role="menuitem">
                      <I.Bike size={14} /> Rider dashboard
                    </Link>
                  )}
                  {(isMerchant || isAdmin) && (
                    <Link className="nav-dropdown-row" to="/merchant" role="menuitem">
                      <I.Box size={14} /> Restaurant POS
                    </Link>
                  )}
                  {isAdmin && (
                    <Link className="nav-dropdown-row" to="/admin" role="menuitem">
                      <I.Shield size={14} /> Admin panel
                    </Link>
                  )}
                  <div className="nav-dropdown-divider" />
                  <button
                    className="nav-dropdown-row"
                    onClick={async () => {
                      await signOut();
                      setAccountOpen(false);
                    }}
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                className="btn btn-outline nav-signin"
                to="/auth"
                style={{ padding: '10px 14px', fontSize: 13 }}
              >
                {t('nav.signin')}
              </Link>
              <Link
                className="btn btn-primary"
                to="/auth?mode=signup"
                style={{ padding: '10px 16px', fontSize: 13 }}
              >
                Sign up
              </Link>
            </div>
          )}

          <button
            className="icon-btn nav-mobile-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <I.Close /> : <I.Menu />}
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer (slides in from right) ───────────────────────── */}
      <div
        className={`nav-drawer ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <aside
          className="nav-drawer-panel"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Menu"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Link to="/" className="nav-logo" onClick={() => setOpen(false)}>
              <span className="logo-mark"><I.Logo size={18} /></span>
              <span>AtlaasGo</span>
            </Link>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
              <I.Close size={16} />
            </button>
          </div>

          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(255,87,34,0.10), rgba(255,138,101,0.06))',
              border: '1px solid rgba(255,87,34,0.20)',
              borderRadius: 16,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
                color: 'white', fontWeight: 800, fontSize: 16,
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {(user.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email?.split('@')[0]}
                </div>
                <Link to="/account" className="nav-link" style={{ fontSize: 12, padding: 0 }}>
                  View account →
                </Link>
              </div>
            </div>
          )}

          <DrawerItem to="/order"        icon={<I.Search size={16} />}   label={t('nav.order')} />
          <DrawerItem to="/campus"       icon={<I.Home size={16} />}     label="Campus drop" />
          <DrawerItem to="/cart"         icon={<I.Bag size={16} />}      label="Cart" badge={cartCount} />
          {user && (
            <>
              <DrawerItem to="/orders"        icon={<I.Receipt size={16} />}   label="Orders" />
              <DrawerItem to="/notifications" icon={<I.Lightning size={16} />} label="Notifications" badge={unreadCount} />
              <DrawerItem to="/favorites"     icon={<I.Heart size={16} />}     label="Favorites" />
              <DrawerItem to="/addresses"     icon={<I.Pin size={16} />}       label="Addresses" />
              <DrawerItem to="/wallet"        icon={<I.Wallet size={16} />}    label="Wallet" />
            </>
          )}
          <DrawerItem to="/prime" icon={<I.Star size={16} />} label="Prime" />

          {(isRider || isMerchant || isAdmin) && (
            <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />
          )}
          {(isRider || isAdmin) && <DrawerItem to="/rider"    icon={<I.Bike size={16} />}  label="Rider dashboard" />}
          {(isMerchant || isAdmin) && <DrawerItem to="/merchant" icon={<I.Box size={16} />} label="Restaurant POS" />}
          {isAdmin && <DrawerItem to="/admin" icon={<I.Shield size={16} />} label="Admin" />}

          <div style={{ height: 1, background: 'var(--line)', margin: '12px 0' }} />

          {/* Language + theme */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 4px' }}>
            <div className="lang-pill" role="group" aria-label="Language" style={{ flex: 1 }}>
              {LANGS.map((l) => (
                <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                  {l}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <I.Sun /> : <I.Moon />}
            </button>
          </div>

          {/* Auth CTA */}
          {!user ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              <Link to="/auth" className="btn btn-outline" onClick={() => setOpen(false)}>
                {t('nav.signin')}
              </Link>
              <Link to="/auth?mode=signup" className="btn btn-primary" onClick={() => setOpen(false)}>
                Sign up
              </Link>
            </div>
          ) : (
            <button
              className="btn btn-outline"
              onClick={async () => { await signOut(); setOpen(false); }}
              style={{ marginTop: 16 }}
            >
              Sign out
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function DrawerItem({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-dropdown-row${isActive ? ' active' : ''}`}
      style={({ isActive }) => ({
        padding: '12px 16px',
        borderRadius: 12,
        background: isActive ? 'rgba(255,87,34,0.08)' : 'transparent',
        color: isActive ? 'var(--primary)' : 'var(--fg)',
        fontWeight: isActive ? 700 : 600,
      })}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        {icon}
        <span style={{ flex: 1 }}>{label}</span>
        {badge && badge > 0 ? (
          <span style={{
            background: 'var(--primary)', color: 'white',
            fontSize: 11, fontWeight: 800, padding: '2px 8px',
            borderRadius: 999, minWidth: 18, textAlign: 'center',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
    </NavLink>
  );
}
