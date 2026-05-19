import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { OrderAssignmentRow, RiderStatus } from './database.types';

export type RiderProfileInfo = {
  user_id: string;
  vehicle: string | null;
  plate: string | null;
  status: RiderStatus;
  rating: number;
  total_trips: number;
  documents_verified: boolean;
};

/**
 * Fetches the active assignment and rider profile for an order.
 */
export function useOrderAssignment(orderId: string | undefined) {
  const [assignment, setAssignment] = useState<OrderAssignmentRow | null>(null);
  const [rider, setRider] = useState<RiderProfileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      try {
        // Get active assignment for this order
        const { data: assignmentData, error: assignmentErr } = await supabase
          .from('order_assignments')
          .select('*')
          .eq('order_id', orderId)
          .eq('is_active', true)
          .maybeSingle();

        if (assignmentErr) throw assignmentErr;
        if (cancelled) return;

        if (assignmentData) {
          setAssignment(assignmentData as OrderAssignmentRow);

          // Get rider profile
          const { data: riderData, error: riderErr } = await supabase
            .from('riders')
            .select('user_id,vehicle,plate,status,rating,total_trips,documents_verified')
            .eq('user_id', assignmentData.rider_id)
            .maybeSingle();

          if (riderErr) throw riderErr;
          if (cancelled) return;

          setRider(riderData as RiderProfileInfo | null);
        } else {
          setAssignment(null);
          setRider(null);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    }

    void load();

    // Subscribe to changes
    channel = supabase
      .channel(`order_assignment:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_assignments',
          filter: `order_id=eq.${orderId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { assignment, rider, loading, error };
}
