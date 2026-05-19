import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { FadeUp } from '../components/visual/ScrollReveal';
import type { WalletTxKind } from '../lib/database.types';

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

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/wallet', { replace: true });
  }, [authLoading, user, nav]);

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
                <I.Lightning size={14} /> Prime perks active
              </div>
            </div>
            <div className="wallet-card-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => alert('Stripe wiring pending — add VITE_STRIPE_PUBLISHABLE_KEY to enable top-up.')}
              >
                <I.Plus size={14} /> Top up
              </button>
              <button className="btn btn-outline btn-lg">Send credit</button>
            </div>
          </div>
        </FadeUp>

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
