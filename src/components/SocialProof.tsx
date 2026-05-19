import * as I from '../icons/Icon';

const TESTIMONIALS = [
  {
    quote:
      "Ordered from Café Hassan and got it warm in 19 minutes. The landmark thing actually works — driver found me near the AUI gate without a single call.",
    name: 'Yasmine E.',
    role: 'AUI · 3rd year',
    rating: 5,
  },
  {
    quote:
      "I've used Glovo in Casa for years. AtlaasGo in Ifrane is the first time a delivery app feels built for Morocco, not bolted on.",
    name: 'Omar K.',
    role: 'Local resident',
    rating: 5,
  },
  {
    quote:
      "60 dh/hour as a part-time rider while I study. Daily payouts to my wallet — never had to wait a week to get paid.",
    name: 'Youssef B.',
    role: 'Rider · 380 trips',
    rating: 5,
  },
];

const STATS = [
  { value: '2,400+', label: 'Active customers' },
  { value: '28', label: 'Verified partners' },
  { value: '22 min', label: 'Avg. delivery' },
  { value: '4.9★', label: 'Customer rating' },
];

export default function SocialProof() {
  return (
    <section className="bloc social-proof">
      <div className="container">
        <div className="section-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="section-tag">
            <I.Shield size={11} /> Trusted in Ifrane
          </div>
          <h2 className="section-title">
            The numbers Atlas<br />locals trust.
          </h2>
          <p className="section-sub">
            Built in the cedar forests, tested by every dorm at AUI, rated by real Moroccan families.
          </p>
        </div>

        <div className="social-stats">
          {STATS.map((s) => (
            <div className="social-stat" key={s.label}>
              <div className="social-stat-value">{s.value}</div>
              <div className="social-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="social-quotes">
          {TESTIMONIALS.map((t, i) => (
            <figure className="social-quote" key={i}>
              <div className="social-quote-stars">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <I.Star key={j} size={14} />
                ))}
              </div>
              <blockquote>"{t.quote}"</blockquote>
              <figcaption>
                <div className="social-quote-avatar">{t.name.charAt(0)}</div>
                <div>
                  <div className="social-quote-name">{t.name}</div>
                  <div className="social-quote-role">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
