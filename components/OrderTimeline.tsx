// components/OrderTimeline.tsx
"use client";

import { Check, Clock, Truck, Home, X } from "lucide-react";
import type { OrderStatus, StatusHistoryEntry } from "@/types/order";

const STEPS: { status: OrderStatus; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { status: "pending",   label: "Order placed",      Icon: Clock },
  { status: "accepted",  label: "Driver on the way",  Icon: Check },
  { status: "picked_up", label: "Order picked up",    Icon: Truck },
  { status: "delivered", label: "Delivered",          Icon: Home  },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "accepted", "picked_up", "delivered"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-MA", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  status: OrderStatus;
  statusHistory?: StatusHistoryEntry[];
}

export default function OrderTimeline({ status, statusHistory = [] }: Props) {
  if (status === "cancelled" || status === "expired") {
    return (
      <div className="flex items-center gap-3 py-4 px-5 bg-red-50 rounded-2xl">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
          <X className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-red-700 capitalize">Order {status}</p>
          <p className="text-xs text-red-400 mt-0.5">This order is no longer active</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="relative">
      {STEPS.map(({ status: stepStatus, label, Icon }, idx) => {
        const isDone   = idx <= currentIdx;
        const isActive = idx === currentIdx;
        const entry    = statusHistory.find((h) => h.status === stepStatus);

        return (
          <div key={stepStatus} className="flex items-start gap-4 pb-6 relative">
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={`absolute left-4 top-8 w-0.5 h-full -translate-x-1/2 ${
                  isDone && idx < currentIdx ? "bg-[#E05A23]" : "bg-gray-200"
                }`}
              />
            )}
            {/* Step icon */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                isActive
                  ? "bg-[#E05A23] text-white shadow-lg shadow-orange-200 animate-pulse"
                  : isDone
                  ? "bg-[#E05A23] text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            {/* Step label */}
            <div className="flex-1 pt-1">
              <p className={`text-sm font-medium ${isDone ? "text-gray-900" : "text-gray-400"}`}>
                {label}
              </p>
              {entry && (
                <p className="text-xs text-gray-400 mt-0.5">{formatTime(entry.timestamp)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
