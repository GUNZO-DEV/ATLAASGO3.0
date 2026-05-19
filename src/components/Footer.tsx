import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="container foot-grid">
        <div>
          <Link to="/" className="nav-logo" style={{ color: 'var(--cream)' }}>
            <span className="logo-mark">
              <I.Logo size={18} />
            </span>
            <span>AtlaasGo</span>
          </Link>
          <p className="foot-blurb">
            A Moroccan tech brand reimagining food delivery, dine-in QR ordering, campus drops, and restaurant
            management for the Atlas region.
          </p>
          <div className="trust-badges">
            <span className="trust-badge">
              <I.Shield size={11} /> CMR Licensed
            </span>
            <span className="trust-badge">
              <I.Check size={11} /> SSL Secure
            </span>
            <span className="trust-badge">
              <I.Star size={11} /> 4.9 Avg Rating
            </span>
          </div>
        </div>
        <div>
          <h4>Order</h4>
          <Link className="foot-link" to="/order">
            Restaurants
          </Link>
          <Link className="foot-link" to="/order?campus=1">
            Campus (AUIER)
          </Link>
          <Link className="foot-link" to="/order">
            Groceries
          </Link>
          <a className="foot-link" href="#prime">
            Prime Membership
          </a>
          <a className="foot-link" href="#gift">
            Gift Cards
          </a>
        </div>
        <div>
          <h4>Business</h4>
          <Link className="foot-link" to="/merchant">
            Become a Partner
          </Link>
          <Link className="foot-link" to="/merchant">
            Lyn Restaurant POS
          </Link>
          <Link className="foot-link" to="/rider">
            Drive with us
          </Link>
          <a className="foot-link" href="#corporate">
            Corporate
          </a>
          <a className="foot-link" href="#press">
            Press Kit
          </a>
        </div>
        <div>
          <h4>Company</h4>
          <a className="foot-link" href="#about">
            About
          </a>
          <a className="foot-link" href="#careers">
            Careers
          </a>
          <a className="foot-link" href="#privacy">
            Privacy
          </a>
          <a className="foot-link" href="#terms">
            Terms
          </a>
          <a className="foot-link" href="#contact">
            Contact
          </a>
        </div>
      </div>
      <div className="container foot-bottom">
        <div>© 2026 AtlaasGo Technologies · Made with ♥ in Ifrane, Morocco</div>
        <div className="foot-social">
          <a href="#" aria-label="Instagram">
            <span style={{ fontSize: 14, fontWeight: 700 }}>IG</span>
          </a>
          <a href="#" aria-label="X">
            <span style={{ fontSize: 14, fontWeight: 700 }}>X</span>
          </a>
          <a href="#" aria-label="TikTok">
            <span style={{ fontSize: 14, fontWeight: 700 }}>TT</span>
          </a>
          <a href="#" aria-label="LinkedIn">
            <span style={{ fontSize: 14, fontWeight: 700 }}>in</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
