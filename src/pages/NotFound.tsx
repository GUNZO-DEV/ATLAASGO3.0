import { Link } from 'react-router-dom';
import * as I from '../icons/Icon';

export default function NotFound() {
  return (
    <section className="page">
      <div className="container">
        <div className="empty-state" style={{ marginTop: 40 }}>
          <I.Pin size={48} />
          <h3>Lost in the Atlas?</h3>
          <p>This page wandered off. Let's get you back home.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 18 }}>
            Back to AtlaasGo <I.Arrow />
          </Link>
        </div>
      </div>
    </section>
  );
}
