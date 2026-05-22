// hooks/useFavorites.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFavorites(uid: string | null) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) setFavorites(snap.data().favorites ?? []);
      },
      (err) => {
        console.warn("favorites subscription failed:", err.code);
        setFavorites([]);
      }
    );
    return unsub;
  }, [uid]);

  const toggle = useCallback(
    async (restaurantId: string) => {
      if (!uid) return;
      const isFav = favorites.includes(restaurantId);
      await updateDoc(doc(db, "users", uid), {
        favorites: isFav ? arrayRemove(restaurantId) : arrayUnion(restaurantId),
      });
    },
    [uid, favorites]
  );

  const isFavorite = useCallback(
    (restaurantId: string) => favorites.includes(restaurantId),
    [favorites]
  );

  return { favorites, toggle, isFavorite };
}
