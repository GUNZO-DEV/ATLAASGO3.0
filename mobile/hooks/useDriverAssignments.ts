import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Orders assigned to the signed-in rider (active assignments), joined to the
 * order so the dashboard can show the drop landmark, fare and current stage.
 * RLS ("order_assignments: participants read") scopes this to the rider's own
 * assignments, so no extra filtering is needed beyond rider_id + is_active.
 */
export type DriverJob = {
  assignmentId: string;
  orderId: string;
  status: string;
  landmark: string;
  totalDh: number;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  assignedAt: string;
};

export function useDriverAssignments() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const { data, error: err } = await supabase
        .from('order_assignments')
        .select('id, order_id, accepted_at, picked_up_at, assigned_at, orders(status, landmark, driver_payload, total_dh)')
        .eq('rider_id', user!.id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      // Supabase types a to-one embed (`orders(...)`) as an array, but at
      // runtime it's a single object — cast through unknown to reflect that.
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        order_id: string;
        accepted_at: string | null;
        picked_up_at: string | null;
        assigned_at: string;
        orders: {
          status: string;
          landmark: string | null;
          driver_payload: { headerLandmark?: string } | null;
          total_dh: number | null;
        } | null;
      }>;

      setJobs(
        rows.map((r) => ({
          assignmentId: r.id,
          orderId: r.order_id,
          status: r.orders?.status ?? 'ordered',
          landmark: r.orders?.driver_payload?.headerLandmark || r.orders?.landmark || 'Delivery',
          totalDh: r.orders?.total_dh ?? 0,
          acceptedAt: r.accepted_at,
          pickedUpAt: r.picked_up_at,
          assignedAt: r.assigned_at,
        })),
      );
      setLoading(false);
    }

    load();

    // Refresh when assignments change (new offers, status flips).
    const channel = supabase
      .channel(`driver-jobs-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments', filter: `rider_id=eq.${user.id}` }, () => load())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { jobs, loading, error };
}
