import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Wallet balance + transaction ledger for the signed-in user.
 * wallets/wallet_transactions are RLS-scoped to the user, with realtime so the
 * balance updates the moment a top-up or order payment lands.
 */
export type WalletTx = {
  id: string;
  kind: string;
  amountDh: number;
  reference: string | null;
  createdAt: string;
};

export function useWallet() {
  const [balanceDh, setBalanceDh] = useState<number>(0);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: w }, { data: t }] = await Promise.all([
        supabase.from('wallets').select('balance_dh').maybeSingle(),
        supabase
          .from('wallet_transactions')
          .select('id, kind, amount_dh, reference, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (cancelled) return;
      setBalanceDh((w as { balance_dh?: number } | null)?.balance_dh ?? 0);
      setTxs(
        ((t ?? []) as {
          id: string;
          kind: string;
          amount_dh: number;
          reference: string | null;
          created_at: string;
        }[]).map((r) => ({
          id: r.id,
          kind: r.kind,
          amountDh: r.amount_dh,
          reference: r.reference,
          createdAt: r.created_at,
        })),
      );
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`wallet-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { balanceDh, txs, loading };
}
