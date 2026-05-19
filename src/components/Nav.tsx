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
            <Link
              className="btn btn-primary"
              to="/auth"
              style={{ padding: '10px 18px', fontSize: 13 }}
            >
              {t('nav.signin')}
            </Link>
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
    </div>
  );
}
