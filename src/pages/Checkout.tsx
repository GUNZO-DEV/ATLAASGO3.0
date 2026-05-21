import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import * as I from '../icons/Icon';
import { useOrder } from '../lib/orders';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { MotionButton } from '../components/visual/Motion';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
);

/* ── Inner form rendered inside <Elements> ── */
function CheckoutForm({
  orderId,
  total,
  items,
}: {
  orderId: string;
  total: number;
  items: { name: string; qty: number; priceDh: number; restaurantName: string }[];
}) {
  const stripe = useStripe();
  const elements = useElements();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: submitErr } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/track/${orderId}?paid=1`,
      },
    });

    if (submitErr) {
      setError(submitErr.message ?? 'Payment failed. Try again.');
      setBusy(false);
    }
    // If successful, Stripe redirects automatically
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      {/* Order summary card */}
      <div className="checkout-summary">
        <div className="checkout-summary-header">
          <div className="checkout-logo">
            <I.Logo size={16} />
          </div>
          <span>AtlaasGo</span>
        </div>

        <div className="checkout-items">
          {items.map((item, i) => (
            <div key={i} className="checkout-item">
              <div className="checkout-item-qty">{item.qty}x</div>
              <div className="checkout-item-info">
                <div className="checkout-item-name">{item.name}</div>
                <div className="checkout-item-rest">{item.restaurantName}</div>
              </div>
              <div className="checkout-item-price">{item.priceDh * item.qty} dh</div>
            </div>
          ))}
        </div>

        <div className="checkout-divider" />

        <div className="checkout-total-row">
          <span>Total</span>
          <span className="checkout-total-amount">{total} dh</span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="checkout-card-section">
        <h3 className="checkout-card-title">Payment details</h3>
        <p className="checkout-card-sub">All transactions are secure and encrypted.</p>

        <div className="checkout-element-wrap">
          <PaymentElement
            onReady={() => setReady(true)}
            options={{
              layout: 'tabs',
              defaultValues: {},
            }}
          />
        </div>

        {!ready && (
          <div className="checkout-loading">
            <div className="checkout-spinner" />
            <span>Loading payment methods...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="checkout-error">
          <I.Shield size={14} /> {error}
        </div>
      )}

      <MotionButton
        type="submit"
        className="btn btn-primary btn-lg btn-block checkout-pay-btn"
        disabled={!stripe || !ready || busy}
      >
        {busy ? (
          <>
            <div className="checkout-spinner small" /> Processing...
          </>
        ) : (
          <>
            <I.Shield size={14} /> Pay {total} dh
          </>
        )}
      </MotionButton>

      <div className="checkout-secure">
        <I.Shield size={12} />
        <span>Secured by Stripe. Your card details never touch our servers.</span>
      </div>

      <button
        type="button"
        className="checkout-back"
        onClick={() => nav('/cart')}
        disabled={busy}
      >
        <I.Arrow size={12} style={{ transform: 'rotate(180deg)' }} /> Back to cart
      </button>
    </form>
  );
}

/* ── Main Checkout page ── */
export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const { order, loading: orderLoading } = useOrder(id);
  const { user } = useAuth();
  const nav = useNavigate();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !orderLoading) {
      nav('/auth?next=/cart', { replace: true });
    }
  }, [user, orderLoading, nav]);

  // Fetch payment intent
  useEffect(() => {
    if (!id || !order || clientSecret) return;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            orderId: id,
            totalDh: order.total_dh,
            customerEmail: user?.email,
          },
        });
        if (error || !data?.clientSecret) {
          setFetchError('Could not initialize payment. Please try again.');
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        setFetchError('Network error. Check your connection.');
      }
    })();
  }, [id, order, user, clientSecret]);

  if (orderLoading || (!clientSecret && !fetchError)) {
    return (
      <section className="page checkout-page">
        <div className="container checkout-container">
          <div className="checkout-loading-page">
            <div className="checkout-spinner" />
            <p>Preparing checkout...</p>
          </div>
        </div>
      </section>
    );
  }

  if (fetchError || !order) {
    return (
      <section className="page checkout-page">
        <div className="container checkout-container">
          <div className="checkout-error-page">
            <I.Shield size={32} />
            <h2>Payment Error</h2>
            <p>{fetchError || 'Order not found.'}</p>
            <MotionButton className="btn btn-primary" onClick={() => nav('/cart')}>
              Back to cart <I.Arrow />
            </MotionButton>
          </div>
        </div>
      </section>
    );
  }

  const items = (order.items ?? []).map((it) => ({
    name: it.name,
    qty: it.qty,
    priceDh: it.priceDh,
    restaurantName: it.restaurantName,
  }));

  return (
    <section className="page checkout-page">
      <div className="container checkout-container">
        <div className="checkout-header">
          <div className="checkout-header-left">
            <div className="checkout-header-logo">
              <I.Logo size={18} />
            </div>
            <span className="checkout-header-brand">AtlaasGo</span>
          </div>
          <div className="checkout-header-badge">
            <I.Shield size={11} /> Secure checkout
          </div>
        </div>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: clientSecret!,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#FF5722',
                colorBackground: '#ffffff',
                colorText: '#1A1410',
                colorDanger: '#EF4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSizeBase: '15px',
                borderRadius: '14px',
                spacingUnit: '4px',
                spacingGridRow: '18px',
              },
              rules: {
                '.Input': {
                  border: '1.5px solid #E8E0D8',
                  boxShadow: 'none',
                  padding: '14px 16px',
                  transition: 'border-color .2s, box-shadow .2s',
                },
                '.Input:focus': {
                  border: '1.5px solid #FF5722',
                  boxShadow: '0 0 0 3px rgba(255, 87, 34, 0.12)',
                },
                '.Label': {
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#5A4F46',
                  marginBottom: '6px',
                },
                '.Tab': {
                  border: '1.5px solid #E8E0D8',
                  borderRadius: '12px',
                  padding: '12px 16px',
                },
                '.Tab--selected': {
                  border: '1.5px solid #FF5722',
                  backgroundColor: 'rgba(255, 87, 34, 0.04)',
                },
                '.Tab:hover': {
                  border: '1.5px solid #FF8A65',
                },
              },
            },
          }}
        >
          <CheckoutForm orderId={id!} total={order.total_dh} items={items} />
        </Elements>
      </div>
    </section>
  );
}
