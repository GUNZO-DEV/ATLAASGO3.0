"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationItem from "@/components/NotificationItem";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) { router.push("/register"); return; }
      setUid(user.uid);
    });
    return unsub;
  }, [router]);

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(uid);

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-[700px] mx-auto px-6 pt-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl font-extrabold text-[#1B2440]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-[#6B7A9E] mt-0.5">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-sm text-[#E55A26] font-semibold cursor-pointer hover:opacity-80 transition-opacity bg-[#E55A26]/10 px-4 py-2 rounded-xl"
            >
              Tout marquer lu
            </button>
          )}
        </div>

        {/* Section badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-[0_2px_10px_rgba(27,36,64,0.06)] text-xs font-semibold text-[#1B2440]">
            <Bell className="w-3.5 h-3.5 text-[#E55A26]" />
            Récentes
          </span>
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(27,36,64,0.06)] flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#E55A26]/10 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-[#E55A26]" />
            </div>
            <p className="text-base font-bold text-[#1B2440]" style={{ fontFamily: "var(--font-display)" }}>
              Aucune notification
            </p>
            <p className="text-sm text-[#6B7A9E] mt-1 max-w-xs">
              Les mises à jour de commande et récompenses de parrainage apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(27,36,64,0.06)] overflow-hidden divide-y divide-[#F5F0E8]">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} onRead={markRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
