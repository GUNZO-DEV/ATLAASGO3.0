import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

/**
 * Saved delivery addresses for the signed-in user. The addresses table has an
 * ALL RLS policy scoped to the user, so full CRUD works on-device.
 */
export type Address = {
  id: string;
  label: string | null;
  line1: string | null;
  building: string | null;
  room: string | null;
  landmark: string | null;
  isDefault: boolean;
  isCampus: boolean;
};

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('addresses')
      .select('id, label, line1, building, room, landmark, is_default, is_campus')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses(
      ((data ?? []) as {
        id: string;
        label: string | null;
        line1: string | null;
        building: string | null;
        room: string | null;
        landmark: string | null;
        is_default: boolean;
        is_campus: boolean;
      }[]).map((r) => ({
        id: r.id,
        label: r.label,
        line1: r.line1,
        building: r.building,
        room: r.room,
        landmark: r.landmark,
        isDefault: r.is_default,
        isCampus: r.is_campus,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function add(input: {
    label: string;
    landmark: string;
    building?: string;
    room?: string;
    isCampus?: boolean;
  }): Promise<string | null> {
    if (!user) return 'Sign in to save an address.';
    const { error } = await supabase.from('addresses').insert({
      user_id: user.id,
      label: input.label.trim() || 'Home',
      landmark: input.landmark.trim(),
      building: input.building?.trim() || null,
      room: input.room?.trim() || null,
      is_campus: !!input.isCampus,
    });
    if (error) return error.message;
    await load();
    return null;
  }

  async function remove(id: string) {
    await supabase.from('addresses').delete().eq('id', id);
    await load();
  }

  async function setDefault(id: string) {
    if (!user) return;
    // Only one default — clear the rest, then set this one.
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    await load();
  }

  return { addresses, loading, add, remove, setDefault };
}
