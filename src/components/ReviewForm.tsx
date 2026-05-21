import { useState } from 'react';
import * as I from '../icons/Icon';
import { useOrderReview } from '../lib/customer';
import { FadeUp } from './visual/ScrollReveal';
import { MotionButton } from './visual/Motion';

function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (n: number) => void;
  size?: number;
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: n <= value ? '#F59E0B' : 'rgba(0,0,0,0.15)',
            padding: 2,
            transition: 'transform .15s',
            transform: n <= value ? 'scale(1)' : 'scale(0.92)',
          }}
        >
          <I.Star size={size} />
        </button>
      ))}
    </div>
  );
}

export default function ReviewForm({
  orderId,
  restaurantId,
}: {
  orderId: string;
  restaurantId: string | null;
}) {
  const { review, submit, submitting, error } = useOrderReview(orderId);
  const [restaurantRating, setRestaurantRating] = useState(review?.rating_restaurant ?? 0);
  const [riderRating, setRiderRating] = useState(review?.rating_rider ?? 0);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [submitted, setSubmitted] = useState(!!review);

  if (submitted) {
    return (
      <FadeUp y={10}>
        <div className="review-card review-card-done">
          <I.Check size={20} />
          <div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15 }}>
              Thanks for your review
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-soft)', marginTop: 2 }}>
              Café Hassan and your rider will see this. You can update it anytime from{' '}
              <a href="/orders">Order history</a>.
            </div>
          </div>
        </div>
      </FadeUp>
    );
  }

  async function onSubmit() {
    if (restaurantRating === 0) return;
    const ok = await submit({
      restaurantId,
      ratingRestaurant: restaurantRating,
      ratingRider: riderRating || undefined,
      comment: comment.trim() || undefined,
    });
    if (ok) setSubmitted(true);
  }

  return (
    <FadeUp y={12}>
      <div className="review-card">
        <div className="section-tag" style={{ marginBottom: 6 }}>
          <I.Star size={11} /> How did it go?
        </div>
        <h3 style={{ fontFamily: 'Montserrat', fontWeight: 800, margin: '0 0 14px' }}>
          Rate this order
        </h3>

        <div className="review-row">
          <div>
            <div className="review-label">Food & restaurant</div>
            <Stars value={restaurantRating} onChange={setRestaurantRating} />
          </div>
        </div>

        <div className="review-row">
          <div>
            <div className="review-label">Your rider</div>
            <Stars value={riderRating} onChange={setRiderRating} size={22} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="comment">Comment · optional</label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What stood out?"
          />
        </div>

        {error && <div style={{ color: '#EF4444', fontSize: 12 }}>{error}</div>}

        <MotionButton
          className="btn btn-primary btn-lg btn-block"
          onClick={onSubmit}
          disabled={restaurantRating === 0 || submitting}
        >
          {submitting ? 'Submitting…' : 'Submit review'} <I.Arrow />
        </MotionButton>
      </div>
    </FadeUp>
  );
}
