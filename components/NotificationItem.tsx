"use client";

import Link from "next/link";
import { Bell, Package, Gift, Megaphone } from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  order_status: Package,
  referral:     Gift,
  promo:        Megaphone,
  system:       Bell,
};

interface Props {
  notification: AppNotification;
  onRead: (id: string) => void;
}

export default function NotificationItem({ notification, onRead }: Props) {
  const Icon = ICON_MAP[notification.type] ?? Bell;

  const content = (
    <div
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
        notification.read
          ? "bg-white"
          : "bg-[#FEF0E7] border-l-4 border-[#E55A26]"
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        notification.read ? "bg-[#F5F0E8]" : "bg-[#E55A26]/10"
      }`}>
        <Icon className={`w-4 h-4 ${notification.read ? "text-[#6B7A9E]" : "text-[#E55A26]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.read ? "font-medium text-[#1B2440]" : "font-bold text-[#1B2440]"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-[#6B7A9E] mt-0.5">{notification.body}</p>
        <p className="text-xs text-[#6B7A9E]/60 mt-1">
          {new Date(notification.createdAt).toLocaleDateString("fr-MA", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-[#E55A26] shrink-0 mt-1.5" />
      )}
    </div>
  );

  return notification.link ? (
    <Link href={notification.link}>{content}</Link>
  ) : (
    <>{content}</>
  );
}
