import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';
import { MotionButton, AnimatePresence, motion } from '../components/visual/Motion';
import type { WalletTxKind } from '../lib/database.types';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
);

type TxRow = {
  id: string;
  kind: WalletTxKind;
  amount_dh: number;
  reference: string | null;
  created_at: string;
};

const TX_LABEL: Record<WalletTxKind, string> = {
  topup: 'Top-up',
  order_payment: 'Order payment',
  refund: 'Refund',
  referral_bonus: 'Referral bonus',
  adjustment: 'Adjustment',
};

const TOPUP_AMOUNTS = [50, 100, 200, 500];

/* ── Top-up form inside <Elements> ── */
function TopupForm({
  amount,
  onSuccess,
  onCancel,
}: {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
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
        return_url: `${window.location.origin}/wallet?topped_up=${amount}`,
      },
    });

    if (submitErr) {
      setError(submitErr.message ?? 'Payment failed.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: 20,
      }}>
        <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 15 }}>
          Top up {amount} dh
        </div>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
        {!ready && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg-soft)', fontSize: 13 }}>
            Loading payment methods...
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: '#EF4444', fontSize: 12, marginTop: 10 }}>
          <I.Shield size={12} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <MotionButton
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ flex: 1 }}
          disabled={!stripe || !ready || busy}
        >
          {busy ? 'Processing…' : `Pay ${amount} dh`}
        </MotionButton>
        <MotionButton
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </MotionButton>
      </div>
    </form>
  );
}

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [justTopped, setJustTopped] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/wallet', { replace: true });
  }, [authLoading, user, nav]);

  // Check for successful top-up redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amt = params.get('topped_up');
    if (amt) {
      setJustTopped(Number(amt));
      window.history.replaceState({}, '', '/wallet');
      // Reload balance
      if (user) {
        supabase.from('wallets').select('balance_dh').eq('user_id', user.id).maybeSingle()
          .then(({ data }) => {
            setBalance((data as { balance_dh?: number } | null)?.balance_dh ?? 0);
          });
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: w }, { data: t }] = await Promise.all([
        supabase.from('wallets').select('balance_dh').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('wallet_transactions')
          .select('id,kind,amount_dh,reference,created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setBalance((w as { balance_dh?: number } | null)?.balance_dh ?? 0);
      setTxs((t ?? []) as TxRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function startTopup(amount: number) {
    if (!user) return;
    setTopupAmount(amount);
    setTopupError(null);
    setClientSecret(null);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-topup', {
        body: { amountDh: amount, userId: user.id, customerEmail: user.email },
      });
      if (error || !data?.clientSecret) {
        setTopupError('Could not start top-up. Try again.');
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      setTopupError('Network error. Check your connection.');
    }
  }

  function cancelTopup() {
    setTopupAmount(null);
    setClientSecret(null);
    setTopupError(null);
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Wallet size={11} /> Atlas Wallet
          </div>
          <h1 className="page-title">Your wallet</h1>
          <p className="page-sub">Top up once, pay anywhere on AtlaasGo.</p>
        </FadeUp>

        {justTopped && (
          <div style={{
            background: 'rgba(5,150,105,0.08)',
            border: '1px solid rgba(5,150,105,0.2)',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#059669',
            fontWeight: 600,
            fontSize: 14,
          }}>
            <I.Check size={16} /> {justTopped} dh added to your wallet!
          </div>
        )}

        <FadeUp y={14}>
          <div className="wallet-card">
            <div className="wallet-card-row">
              <div>
                <div className="wallet-card-label">Balance</div>
                <div className="wallet-card-balance">
                  {loading ? '—' : balance}
                  <span className="wallet-card-currency">dh</span>
                </div>
              </div>
              <div className="wallet-card-chip">
                <I.Lightning size={14} /> AtlaasGo Wallet
              </div>
            </div>
            {!topupAmount && (
              <div className="wallet-card-actions">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {TOPUP_AMOUNTS.map((amt) => (
                    <MotionButton
                      key={amt}
                      className="btn btn-outline"
                      onClick={() => startTopup(amt)}
                    >
                      +{amt} dh
                    </MotionButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FadeUp>

        {/* ── Topup payment form ── */}
        {topupAmount && !clientSecret && !topupError && (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--fg-soft)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            Preparing payment...
          </div>
        )}
        {topupError && (
          <div style={{ color: '#EF4444', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
            {topupError}
            <button onClick={cancelTopup} style={{ display: 'block', margin: '8px auto', color: 'var(--primary)', fontWeight: 600 }}>
              Try again
            </button>
          </div>
        )}
        {clientSecret && topupAmount && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#FF5722',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  borderRadius: '14px',
                },
              },
            }}
          >
            <TopupForm
              amount={topupAmount}
              onSuccess={() => {
                cancelTopup();
                // Reload will happen on redirect
              }}
              onCancel={cancelTopup}
            />
          </Elements>
        )}

        <FadeUp y={14}>
          <div style={{ marginTop: 32 }}>
            <h3
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 18,
                margin: '0 0 14px',
              }}
            >
              Recent transactions
            </h3>
            {loading && <p style={{ color: 'var(--fg-soft)' }}>Loading…</p>}
            {!loading && txs.length === 0 && (
              <div className="empty-state">
                <p>No transactions yet — your wallet history will show up here.</p>
              </div>
            )}
            {!loading && txs.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {txs.map((tx) => (
                  <div key={tx.id} className="tx-row">
                    <div className="tx-icon">
                      {tx.kind === 'topup' || tx.kind === 'refund' ? (
                        <I.Plus size={14} />
                      ) : (
                        <I.Bag size={14} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{TX_LABEL[tx.kind]}</div>
                      <div style={{ fontSize: 12, color: 'var(--fg-soft)' }}>
                        {tx.reference ?? new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: 'Montserrat',
                        fontWeight: 800,
                        color: tx.amount_dh > 0 ? '#059669' : 'var(--ink)',
                      }}
                    >
                      {tx.amount_dh > 0 ? '+' : ''}
                      {tx.amount_dh} dh
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
