import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import MobileTabBar from './components/MobileTabBar';

/* ── Only the landing page is eagerly loaded ─────────────────────── */
import Landing from './pages/Landing';

/* ── Everything else is lazy-loaded (code-split) ─────────────────── */
const Order = lazy(() => import('./pages/Order'));
const RestaurantPage = lazy(() => import('./pages/Restaurant'));
const CartPage = lazy(() => import('./pages/Cart'));
const Track = lazy(() => import('./pages/Track'));
const Auth = lazy(() => import('./pages/Auth'));
const Orders = lazy(() => import('./pages/Orders'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Addresses = lazy(() => import('./pages/Addresses'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Prime = lazy(() => import('./pages/Prime'));
const Account = lazy(() => import('./pages/Account'));
const Rider = lazy(() => import('./pages/Rider'));
const Merchant = lazy(() => import('./pages/Merchant'));
const Admin = lazy(() => import('./pages/Admin'));
const ApplyRider = lazy(() => import('./pages/ApplyRider'));
const ApplyPartner = lazy(() => import('./pages/ApplyPartner'));
const Campus = lazy(() => import('./pages/Campus'));
const Checkout = lazy(() => import('./pages/Checkout'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoader() {
  return (
    <section className="page">
      <div className="container" style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--fg-soft)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading…
        </div>
      </div>
    </section>
  );
}

export default function App() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Nav />
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/order" element={<Order />} />
            <Route path="/r/:slug" element={<RestaurantPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/track/:id?" element={<Track />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/addresses" element={<Addresses />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/prime" element={<Prime />} />
            <Route path="/account" element={<Account />} />
            <Route path="/rider" element={<Rider />} />
            <Route path="/rider/apply" element={<ApplyRider />} />
            <Route path="/merchant" element={<Merchant />} />
            <Route path="/merchant/apply" element={<ApplyPartner />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/campus" element={<Campus />} />
            <Route path="/checkout/:id" element={<Checkout />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
