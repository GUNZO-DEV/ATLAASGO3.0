/**
 * Customer-side hook for tracking application status (rider / merchant).
 * Used by the Account page and the PendingApplication gate.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { ApplicationStatus } from './database.types';

export type ApplicationKind = 'rider' | 'merchant';

export type UserApplication = {
  id: string;
  kind: ApplicationKind;
  status: ApplicationStatus;
  created_at: string;
  reviewer_notes: string | null;
};

export function useMyApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState<UserApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApps([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      if (!user) return;
      const [{ data: riderApps }, { data: merchApps }] = await Promise.all([
        supabase
          .from('rider_applications')
          .select('id,status,created_at,reviewer_notes')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('restaurant_applications')
          .select('id,status,created_at,reviewer_notes')
          .eq('applicant_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      const combined: UserApplication[] = [
        ...((riderApps ?? []) as Omit<UserApplication, 'kind'>[]).map((a) => ({
          ...a,
          kind: 'rider' as const,
        })),
        ...((merchApps ?? []) as Omit<UserApplication, 'kind'>[]).map((a) => ({
          ...a,
          kind: 'merchant' as const,
        })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at));

      setApps(combined);
      setLoading(false);

      // Subscribe to changes (admin approves → user sees update live)
      channel = supabase
        .channel(`my_apps:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rider_applications', filter: `applicant_id=eq.${user.id}` },
          () => void load(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'restaurant_applications', filter: `applicant_id=eq.${user.id}` },
          () => void load(),
        )
        .subscribe();
    }

    void load();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const latestPending = (kind: ApplicationKind): UserApplication | null =>
    apps.find(
      (a) => a.kind === kind && (a.status === 'submitted' || a.status === 'reviewing'),
    ) ?? null;

  const latestRejected = (kind: ApplicationKind): UserApplication | null =>
    apps.find((a) => a.kind === kind && a.status === 'rejected') ?? null;

  const latestNeedsInfo = (kind: ApplicationKind): UserApplication | null =>
    apps.find((a) => a.kind === kind && a.status === 'needs_info') ?? null;

  return {
    apps,
    loading,
    latestPending,
    latestRejected,
    latestNeedsInfo,
  };
}
