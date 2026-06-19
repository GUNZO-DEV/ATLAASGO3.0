import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type LiveLocation = {
  lat: number;
  lng: number;
  headingDeg: number | null;
  recordedAt: string;
};

/**
 * The live GPS location of the rider actively assigned to this order. Loads the
 * latest known point, then subscribes to new rider_locations inserts in real
 * time (RLS "rider_locations: order customer read" scopes this to the order's
 * own customer). Returns null until the rider starts broadcasting.
 */
export function useRiderLiveLocation(orderId: string | undefined) {
  const [location, setLocation] = useState<LiveLocation | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function apply(row: { coords?: { lat?: number; lng?: number } | null; heading_deg?: number | null; recorded_at?: string }) {
      const c = row?.coords;
      if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
      setLocation({ lat: c.lat, lng: c.lng, headingDeg: row.heading_deg ?? null, recordedAt: row.recorded_at ?? new Date().toISOString() });
    }

    async function init() {
      const { data: a } = await supabase
        .from('order_assignments')
        .select('rider_id')
        .eq('order_id', orderId)
        .eq('is_active', true)
        .maybeSingle();
      const riderId = (a as { rider_id?: string } | null)?.rider_id ?? null;
      if (cancelled || !riderId) return;

      const { data: latest } = await supabase
        .from('rider_locations')
        .select('coords, heading_deg, recorded_at')
        .eq('rider_id', riderId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && latest) apply(latest as any);

      channel = supabase
        .channel(`rider-loc-${riderId}-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rider_locations', filter: `rider_id=eq.${riderId}` },
          (payload) => apply(payload.new as any),
        )
        .subscribe();
    }

    init();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { location };
}
