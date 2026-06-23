import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Active assignments for the signed-in rider, shaped into the rich DriverJob the
 * v2 offer/job cards render. Each row joins its order (items / fees / tip / the
 * restaurant) so the card can show the merchant name, the customer drop, the
 * real payout breakdown (base + boost + tip), the item count, and a live
 * distance/ETA computed by haversine from the rider's latest rider_locations fix
 * to the pickup restaurant. RLS scopes to the rider's own assignments.
 *
 * Legacy fields (assignmentId / totalDh / landmark / acceptedAt / pickedUpAt /
 * assignedAt) are kept additively so existing screens keep compiling while they
 * migrate to the new field names.
 */
export type DriverJob = {
  id: string;
  orderId: string;
  status: string;
  payoutDh: number;
  baseDh: number;
  boostDh: number;
  tipDh: number;
  pickupName: string;
  dropName: string;
  pickupArea: string;
  dropArea: string;
  distanceKm: number | null;
  etaMin: number | null;
  itemCount: number;
  // Legacy aliases (additive — do not break current consumers).
  assignmentId: string;
  totalDh: number;
  landmark: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  assignedAt: string;
};

type Coords = { lat?: number | null; lng?: number | null } | null;

type OrderItem = { qty?: number | null };

type AssignmentRow = {
  id: string;
  order_id: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  assigned_at: string;
  boost_dh: number | null;
  orders: {
    status: string | null;
    landmark: string | null;
    campus_building: string | null;
    city: string | null;
    driver_payload: { headerLandmark?: string } | null;
    delivery_fee_dh: number | null;
    tip_dh: number | null;
    total_dh: number | null;
    items: OrderItem[] | null;
    restaurants: { name: string | null; city: string | null; coords: Coords } | null;
  } | null;
};

const EARTH_KM = 6371;
const AVG_SPEED_KMH = 22; // city scooter average for a coarse ETA

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function readCoords(c: Coords): { lat: number; lng: number } | null {
  if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return null;
  return { lat: c.lat, lng: c.lng };
}

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

    // Rider's latest location fix — the origin for the distance/ETA estimate.
    const { data: loc } = await supabase
      .from('rider_locations')
      .select('coords')
      .eq('rider_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const riderCoords = readCoords((loc as { coords?: Coords } | null)?.coords ?? null);

    const { data, error: err } = await supabase
      .from('order_assignments')
      .select(
        'id, order_id, accepted_at, picked_up_at, assigned_at, boost_dh, ' +
          'orders(status, landmark, campus_building, city, driver_payload, delivery_fee_dh, tip_dh, total_dh, items, restaurants(name, city, coords))',
      )
      .eq('rider_id', user.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as unknown as AssignmentRow[];

    setJobs(
      rows.map((r) => {
        const o = r.orders;
        const baseDh = o?.delivery_fee_dh ?? 0;
        const boostDh = r.boost_dh ?? 0;
        const tipDh = o?.tip_dh ?? 0;
        const payoutDh = baseDh + boostDh + tipDh;

        const pickupName = o?.restaurants?.name || 'Pickup';
        const dropName = o?.driver_payload?.headerLandmark || o?.campus_building || o?.landmark || 'Delivery';
        const pickupArea = o?.restaurants?.city || o?.city || '';
        const dropArea = o?.city || '';

        const items = Array.isArray(o?.items) ? o!.items! : [];
        const itemCount = items.reduce((n, it) => n + (typeof it?.qty === 'number' ? it.qty : 1), 0);

        const restCoords = readCoords(o?.restaurants?.coords ?? null);
        let distanceKm: number | null = null;
        let etaMin: number | null = null;
        if (riderCoords && restCoords) {
          distanceKm = Math.round(haversineKm(riderCoords, restCoords) * 10) / 10;
          etaMin = Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));
        }

        return {
          id: r.id,
          orderId: r.order_id,
          status: o?.status ?? 'ordered',
          payoutDh,
          baseDh,
          boostDh,
          tipDh,
          pickupName,
          dropName,
          pickupArea,
          dropArea,
          distanceKm,
          etaMin,
          itemCount,
          // Legacy aliases.
          assignmentId: r.id,
          totalDh: o?.total_dh ?? payoutDh,
          landmark: dropName,
          acceptedAt: r.accepted_at,
          pickedUpAt: r.picked_up_at,
          assignedAt: r.assigned_at,
        };
      }),
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_assignments', filter: `rider_id=eq.${user.id}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  return { jobs, loading, error, refresh };
}
