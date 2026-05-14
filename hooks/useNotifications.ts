// hooks/useNotifications.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, onSnapshot, query, orderBy,
  doc, updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface AppNotification {
  id: string;
  type: "order_status" | "referral" | "promo" | "system";
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export function useNotifications(uid: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as AppNotification)
      );
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });
    return unsub;
  }, [uid]);

  const markRead = useCallback(
    async (notifId: string) => {
      if (!uid) return;
      await updateDoc(doc(db, "users", uid, "notifications", notifId), {
        read: true,
      });
    },
    [uid]
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) =>
      batch.update(doc(db, "users", uid, "notifications", n.id), { read: true })
    );
    await batch.commit();
  }, [uid, notifications]);

  return { notifications, unreadCount, markRead, markAllRead };
}
