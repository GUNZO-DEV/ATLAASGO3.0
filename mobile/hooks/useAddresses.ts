import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Coords } from '../lib/types';

/**
 * Saved delivery addresses for the signed-in user. The addresses table has an
 * ALL RLS policy scoped to the user, so full CRUD works on-device.
 *
 * Mirrors the web `useAddresses` (src/lib/customer.ts): coords GPS pin,
 * line1, is_campus flag, single-default invariant, plus edit support.
 */
export type Address = {
  id: string;
  label: string | null;
  line1: string | null;
  building: string | null;
  room: string | null;
  landmark: string | null;
  coords: Coords | null;
  isDefault: boolean;
  isCampus: boolean;
};

export type AddressInput = {
  label: string;
  landmark: string;
  line1?: string;
  building?: string;
  room?: string;
  isCampus?: boolean;
  coords?: Coords | null;
};

type AddressRow = {
  id: string;
  label: string | null;
  line1: string | null;
  building: string | null;
  room: string | null;
  landmark: string | null;
  coords: Coords | null;
  is_default: boolean;
  is_campus: boolean;
};

/** snake_case payload shared by insert + update. */
function toRow(input: AddressInput) {
  return {
    label: input.label.trim() || 'Home',
    // addresses.line1 is NOT NULL in the DB; fall back to the (required,
    // >=3 char) landmark when the optional Address field is left blank.
    line1: input.line1?.trim() || input.landmark.trim(),
    landmark: input.landmark.trim(),
    building: input.building?.trim() || null,
    room: input.room?.trim() || null,
    is_campus: !!input.isCampus,
    // Store only {lat, lng(, accuracyM)} — same shape the web saves.
    coords: input.coords ? { lat: input.coords.lat, lng: input.coords.lng } : null,
  };
}

export function useAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('addresses')
      .select('id, label, line1, building, room, landmark, coords, is_default, is_campus')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses(
      ((data ?? []) as AddressRow[]).map((r) => ({
        id: r.id,
        label: r.label,
        line1: r.line1,
        building: r.building,
        room: r.room,
        landmark: r.landmark,
        coords: r.coords,
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

  async function add(input: AddressInput): Promise<string | null> {
    if (!user) return 'Sign in to save an address.';
    const { error } = await supabase.from('addresses').insert({
      user_id: user.id,
      ...toRow(input),
      // First saved address becomes the default (same as the web flow).
      is_default: addresses.length === 0,
    });
    if (error) return error.message;
    await load();
    return null;
  }

  /** Edit an existing address in place (default flag is untouched). */
  async function update(id: string, input: AddressInput): Promise<string | null> {
    if (!user) return 'Sign in to edit an address.';
    const { error } = await supabase.from('addresses').update(toRow(input)).eq('id', id);
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

  return { addresses, loading, add, update, remove, setDefault };
}
