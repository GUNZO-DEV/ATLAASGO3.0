import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Orders assigned to the signed-in rider (active), joined to the order for the
 * drop landmark, fare and stage. RLS scopes to the rider's own assignments.
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

  const refresh = useCallback(async () => {
    if (!user) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const { data, error: err } = await supabase
      .from('order_assignments')
      .select('id, order_id, accepted_at, picked_up_at, assigned_at, orders(status, landmark, driver_payload, total_dh)')
      .eq('rider_id', user.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      order_id: string;
      accepted_at: string | null;
      picked_up_at: string | null;
      assigned_at: string;
      orders: { status: string; landmark: string | null; driver_payload: { headerLandmark?: string } | null; total_dh: number | null } | null;
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
    setError(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void refresh();

    const channel = supabase
      .channel(`driver-jobs-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_assignments', filter: `rider_id=eq.${user.id}` }, () => void refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { jobs, loading, error, refresh };
}
