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
      className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-colors ${
        notification.read
          ? "bg-white"
          : "bg-orange-50 border-l-4 border-[#E05A23]"
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        notification.read ? "bg-gray-100" : "bg-orange-100"
      }`}>
        <Icon className={`w-4 h-4 ${notification.read ? "text-gray-400" : "text-[#E05A23]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${notification.read ? "text-gray-700" : "text-gray-900"}`}>
          {notification.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{notification.body}</p>
        <p className="text-xs text-gray-300 mt-1">
          {new Date(notification.createdAt).toLocaleDateString("en-MA", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-[#E05A23] shrink-0 mt-1.5" />
      )}
    </div>
  );

  return notification.link ? (
    <Link href={notification.link}>{content}</Link>
  ) : (
    <>{content}</>
  );
}
