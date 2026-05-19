import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type {
  OrderRow,
  OrderStatus,
  ApplicationStatus,
  PromotionRow,
} from './database.types';

export type AdminOrderFilter = 'all' | 'live' | OrderStatus;

export function useAdminOrders(filter: AdminOrderFilter = 'live') {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(80);
      if (filter === 'live') {
        q = q.in('status', ['ordered', 'preparing', 'enRoute', 'outForDelivery', 'arriving']);
      } else if (filter !== 'all') {
        q = q.eq('status', filter);
      }
      const { data } = await q;
      if (cancelled) return;
      setOrders((data ?? []) as OrderRow[]);
      setLoading(false);

      channel = supabase
        .channel(`admin_orders:${filter}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => void load(),
        )
        .subscribe();
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [filter]);

  return { orders, loading };
}

export type RiderApp = {
  id: string;
  applicant_id: string | null;
  full_name: string;
  contact_phone: string;
  email: string | null;
  vehicle: string | null;
  plate: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type RestaurantApp = {
  id: string;
  applicant_id: string | null;
  business_name: string;
  contact_email: string;
  contact_phone: string | null;
  cuisine: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export function useApplications() {
  const [rider, setRider] = useState<RiderApp[]>([]);
  const [restaurant, setRestaurant] = useState<RestaurantApp[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: r }, { data: rest }] = await Promise.all([
      supabase
        .from('rider_applications')
        .select('id,applicant_id,full_name,contact_phone,email,vehicle,plate,status,created_at')
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('restaurant_applications')
        .select('id,applicant_id,business_name,contact_email,contact_phone,cuisine,status,created_at')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    setRider((r ?? []) as RiderApp[]);
    setRestaurant((rest ?? []) as RestaurantApp[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = useCallback(
    async (
      kind: 'rider' | 'restaurant',
      id: string,
      next: ApplicationStatus,
      notes?: string,
    ) => {
      const table = kind === 'rider' ? 'rider_applications' : 'restaurant_applications';

      // Update application status
      await supabase
        .from(table)
        .update({
          status: next,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes ?? null,
        })
        .eq('id', id);

      // On approval → auto-grant the role + bootstrap rider/merchant profile
      if (next === 'approved') {
        // Fetch the application to get applicant_id
        const { data: app } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (app?.applicant_id) {
          const role = kind === 'rider' ? 'rider' : 'merchant';

          // Grant the role
          await supabase
            .from('user_roles')
            .upsert(
              { user_id: app.applicant_id, role },
              { onConflict: 'user_id,role' },
            );

          // Bootstrap rider profile if rider
          if (kind === 'rider') {
            await supabase
              .from('riders')
              .upsert(
                {
                  user_id: app.applicant_id,
                  vehicle: app.vehicle ?? null,
                  plate: app.plate ?? null,
                  status: 'offline',
                  rating: 5.0,
                  total_trips: 0,
                  total_earnings_dh: 0,
                  documents_verified: true,
                },
                { onConflict: 'user_id' },
              );
          }

          // Bootstrap restaurant if merchant
          if (kind === 'restaurant') {
            const slug = (app.business_name as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
              .slice(0, 48)
              + '-' + Date.now().toString(36);
            await supabase.from('restaurants').insert({
              slug,
              name: app.business_name,
              cuisine: app.cuisine ?? 'General',
              cuisine_tags: app.cuisine ? [app.cuisine] : [],
              description: null,
              emoji: '🍽️',
              owner_id: app.applicant_id,
              status: 'draft',
            });
          }
        }
      }

      await refresh();
    },
    [refresh],
  );

  return { rider, restaurant, loading, decide, refresh };
}

export function usePromotions() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    setPromotions((data ?? []) as PromotionRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (code: string, is_active: boolean) => {
      await supabase.from('promotions').update({ is_active }).eq('code', code);
      await refresh();
    },
    [refresh],
  );

  return { promotions, loading, toggle, refresh };
}

export type UserWithRoles = {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
};

export function useAdminUsers() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,display_name,phone,created_at')
          .order('created_at', { ascending: false })
          .limit(80),
        supabase.from('user_roles').select('user_id,role'),
      ]);
      if (cancelled) return;
      const roleMap = new Map<string, string[]>();
      ((roles ?? []) as { user_id: string; role: string }[]).forEach((r) => {
        const arr = roleMap.get(r.user_id) ?? [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });
      setUsers(
        ((profiles ?? []) as Omit<UserWithRoles, 'roles'>[]).map((p) => ({
          ...p,
          roles: roleMap.get(p.id) ?? [],
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { users, loading };
}

export type AvailableRider = {
  user_id: string;
  vehicle: string | null;
  plate: string | null;
  rating: number;
  total_trips: number;
};

export function useAvailableRiders() {
  const [riders, setRiders] = useState<AvailableRider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('riders')
        .select('user_id,vehicle,plate,rating,total_trips')
        .eq('status', 'online')
        .order('rating', { ascending: false });
      if (cancelled) return;
      setRiders((data ?? []) as AvailableRider[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { riders, loading };
}
