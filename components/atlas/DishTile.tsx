"use client";

import { useId } from "react";

export default function DishTile({
  hue = 18,
  size = 72,
  radius = 18,
  label,
  className = "",
}: {
  hue?: number;
  size?: number;
  radius?: number;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const c1 = `oklch(0.78 0.12 ${hue})`;
  const c2 = `oklch(0.62 0.16 ${hue})`;
  const c3 = `oklch(0.42 0.12 ${hue})`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <pattern
            id={`zel-${id}`}
            x="0"
            y="0"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M8 0 L16 8 L8 16 L0 8 Z"
              fill="none"
              stroke={c3}
              strokeWidth="0.8"
              opacity="0.55"
            />
            <circle cx="8" cy="8" r="2" fill={c3} opacity="0.35" />
          </pattern>
        </defs>
        <rect width="64" height="64" fill={`url(#zel-${id})`} />
        <circle cx="32" cy="34" r="14" fill={c1} opacity="0.55" />
        <circle cx="32" cy="34" r="9" fill={c3} opacity="0.35" />
      </svg>
      {label && (
        <span
          className="absolute bottom-1 left-1.5 right-1.5 text-white/85 uppercase tracking-wider"
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 7.5,
            textShadow: "0 1px 0 rgba(0,0,0,0.2)",
          }}
        >
          photo · {label.slice(0, 14)}
        </span>
      )}
    </div>
  );
}
