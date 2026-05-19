import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Order from './pages/Order';
import RestaurantPage from './pages/Restaurant';
import CartPage from './pages/Cart';
import Track from './pages/Track';
import Auth from './pages/Auth';
import Orders from './pages/Orders';
import Favorites from './pages/Favorites';
import Addresses from './pages/Addresses';
import Notifications from './pages/Notifications';
import Wallet from './pages/Wallet';
import Prime from './pages/Prime';
import Account from './pages/Account';
import Rider from './pages/Rider';
import Merchant from './pages/Merchant';
import Admin from './pages/Admin';
import ApplyRider from './pages/ApplyRider';
import ApplyPartner from './pages/ApplyPartner';
import Campus from './pages/Campus';
import NotFound from './pages/NotFound';

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
  });

  return (
    <>
      <Nav />
      <main>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
