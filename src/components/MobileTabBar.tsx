/**
 * iOS/Android-style bottom tab bar. Visible only ≤768px wide (CSS-controlled).
 * Adds `.has-tabbar` to <body> so pages can pad-bottom against it.
 *
 * Tabs:
 *   Home → /
 *   Order → /order      (or active-order /track/:id when one exists)
 *   Cart → /cart        (badge with cart count)
 *   Orders → /orders    (badge with live-orders count)
 *   Account → /account  (badge with unread notifications)
 */
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useNotifications } from '../lib/customer';
import { useOrdersList } from '../lib/orders';

const LIVE_STATUSES = new Set([
  'ordered',
  'preparing',
  'enRoute',
  'outForDelivery',
  'arriving',
]);

export default function MobileTabBar() {
  const { user } = useAuth();
  const loc = useLocation();
  const cartCount = useCart((s) => s.count());

  // Mark body so pages can pad-bottom against the bar
  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => document.body.classList.remove('has-tabbar');
  }, []);

  // Hide on the marketing landing and on checkout (keep checkout fullscreen)
  const path = loc.pathname;
  if (path.startsWith('/checkout') || path === '/auth') return null;

  return user ? (
    <SignedInBar cartCount={cartCount} />
  ) : (
    <SignedOutBar cartCount={cartCount} />
  );
}

function SignedInBar({ cartCount }: { cartCount: number }) {
  const { unreadCount } = useNotifications();
  const { orders } = useOrdersList(20);
  const liveCount = orders.filter((o) => LIVE_STATUSES.has(o.status)).length;

  return (
    <nav className="tabbar" aria-label="Primary">
      <Tab to="/"        icon={<I.Home />}        label="Home"    end />
      <Tab to="/order"   icon={<I.Search />}      label="Browse" />
      <Tab to="/cart"    icon={<I.Bag />}         label="Cart"    badge={cartCount} />
      <Tab to="/orders"  icon={<I.Receipt />}     label="Orders"  badge={liveCount} />
      <Tab to="/account" icon={<I.User />}        label="Account" badge={unreadCount} />
    </nav>
  );
}

function SignedOutBar({ cartCount }: { cartCount: number }) {
  return (
    <nav className="tabbar" aria-label="Primary">
      <Tab to="/"      icon={<I.Home />}     label="Home" end />
      <Tab to="/order" icon={<I.Search />}   label="Browse" />
      <Tab to="/cart"  icon={<I.Bag />}      label="Cart" badge={cartCount} />
      <Tab to="/auth"  icon={<I.User />}     label="Sign in" />
    </nav>
  );
}

function Tab({
  to,
  icon,
  label,
  badge,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `tabbar-item${isActive ? ' active' : ''}`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="tabbar-badge" aria-label={`${badge} ${label.toLowerCase()}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </NavLink>
  );
}
