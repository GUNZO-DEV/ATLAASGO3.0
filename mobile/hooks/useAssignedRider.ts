import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * The rider currently assigned to an order (active assignment), with their
 * display name + vehicle from riders/profiles. Returns null until a rider is
 * assigned — the order screen hides the rider card in that case rather than
 * showing a fake driver.
 */
export type AssignedRider = {
  userId: string;
  name: string;
  vehicle: string | null;
  plate: string | null;
  rating: number | null;
  phone: string | null;
};

export function useAssignedRider(orderId: string | undefined) {
  const [rider, setRider] = useState<AssignedRider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      // Active assignment → rider_id
      const { data: assignment } = await supabase
        .from('order_assignments')
        .select('rider_id')
        .eq('order_id', orderId)
        .eq('is_active', true)
        .maybeSingle();

      const riderId = (assignment as { rider_id?: string } | null)?.rider_id;
      if (!riderId) {
        if (!cancelled) {
          setRider(null);
          setLoading(false);
        }
        return;
      }

      // Rider detail + name in parallel
      const [{ data: r }, { data: p }] = await Promise.all([
        supabase
          .from('riders')
          .select('vehicle, plate, rating')
          .eq('user_id', riderId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('display_name, phone')
          .eq('id', riderId)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      const rr = r as { vehicle?: string; plate?: string; rating?: number } | null;
      const pp = p as { display_name?: string; phone?: string } | null;
      setRider({
        userId: riderId,
        name: pp?.display_name || 'Your rider',
        vehicle: rr?.vehicle ?? null,
        plate: rr?.plate ?? null,
        rating: rr?.rating ?? null,
        phone: pp?.phone ?? null,
      });
      setLoading(false);
    }

    load();

    // Refresh when the assignment changes (rider gets assigned mid-track).
    const channel = supabase
      .channel(`assignment-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments', filter: `order_id=eq.${orderId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { rider, loading };
}
