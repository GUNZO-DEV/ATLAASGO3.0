// hooks/useSavedAddresses.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SavedAddress {
  id: string;
  label: string;   // "Home" | "Dorm" | "Office" | custom string
  address: string;
  note?: string;
  isDefault: boolean;
}

export function useSavedAddresses(uid: string | null) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setAddresses(snap.data().savedAddresses ?? []);
    });
    return unsub;
  }, [uid]);

  const persist = useCallback(
    async (updated: SavedAddress[]) => {
      if (!uid) return;
      await updateDoc(doc(db, "users", uid), { savedAddresses: updated });
    },
    [uid]
  );

  const add = useCallback(
    async (addr: Omit<SavedAddress, "id">) => {
      if (addresses.length >= 5) return; // max 5 addresses
      const newAddr: SavedAddress = { ...addr, id: crypto.randomUUID() };
      const updated = addr.isDefault
        ? [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr]
        : [...addresses, newAddr];
      await persist(updated);
    },
    [addresses, persist]
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(addresses.filter((a) => a.id !== id));
    },
    [addresses, persist]
  );

  const update = useCallback(
    async (id: string, changes: Partial<Omit<SavedAddress, "id">>) => {
      const updated = addresses.map((a) => {
        if (a.id !== id) {
          return changes.isDefault ? { ...a, isDefault: false } : a;
        }
        return { ...a, ...changes };
      });
      await persist(updated);
    },
    [addresses, persist]
  );

  return { addresses, add, remove, update };
}
