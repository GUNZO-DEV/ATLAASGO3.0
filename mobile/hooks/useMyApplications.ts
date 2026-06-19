import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Customer-side hook for tracking rider/partner application status.
 * Mirrors the web app's useMyApplications (src/lib/applications.ts): merges
 * rider_applications + restaurant_applications scoped to the signed-in user,
 * newest first, with realtime on both tables so an admin decision shows up
 * live (used by PendingApplication as a role gate).
 */
export type ApplicationKind = 'rider' | 'partner';

export type ApplicationStatus =
  | 'submitted'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'needs_info';

export type MyApplication = {
  id: string;
  kind: ApplicationKind;
  status: ApplicationStatus;
  created_at: string;
  reviewer_notes: string | null;
};

type AppRow = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  reviewer_notes: string | null;
};

export function useMyApplications(): { apps: MyApplication[]; loading: boolean } {
  const { user } = useAuth();
  const userId = user?.id;
  const [apps, setApps] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setApps([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const [{ data: riderRows }, { data: partnerRows }] = await Promise.all([
        supabase
          .from('rider_applications')
          .select('id, status, created_at, reviewer_notes')
          .eq('applicant_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('restaurant_applications')
          .select('id, status, created_at, reviewer_notes')
          .eq('applicant_id', userId)
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      const combined: MyApplication[] = [
        ...((riderRows ?? []) as AppRow[]).map((r) => ({ ...r, kind: 'rider' as const })),
        ...((partnerRows ?? []) as AppRow[]).map((r) => ({ ...r, kind: 'partner' as const })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at));
      setApps(combined);
      setLoading(false);
    }

    load();

    const channel = supabase
      // Unique topic per mount — a fixed name collides with an already-
      // subscribed channel on re-mount/Fast Refresh, throwing "cannot add
      // postgres_changes callbacks after subscribe()".
      .channel(`my-apps-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rider_applications', filter: `applicant_id=eq.${userId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_applications', filter: `applicant_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { apps, loading };
}
