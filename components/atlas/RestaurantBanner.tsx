"use client";

import { useId } from "react";

export default function RestaurantBanner({
  hue = 18,
  height = 160,
  className = "",
}: {
  hue?: number;
  height?: number;
  className?: string;
}) {
  const id = useId();
  const c1 = `oklch(0.78 0.12 ${hue})`;
  const c2 = `oklch(0.55 0.16 ${hue})`;
  const c3 = `oklch(0.35 0.10 ${hue})`;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        height,
        background: `linear-gradient(160deg, ${c1}, ${c2})`,
      }}
    >
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <pattern
            id={`zb-${id}`}
            x="0"
            y="0"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0 L40 20 L20 40 L0 20 Z"
              fill="none"
              stroke={c3}
              strokeWidth="1"
              opacity="0.4"
            />
            <path
              d="M20 8 L32 20 L20 32 L8 20 Z"
              fill="none"
              stroke={c3}
              strokeWidth="1"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="400" height="200" fill={`url(#zb-${id})`} />
      </svg>
      <span
        className="absolute bottom-2 right-3 text-white/70 uppercase tracking-wider"
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
        }}
      >
        restaurant cover photo
      </span>
    </div>
  );
}
