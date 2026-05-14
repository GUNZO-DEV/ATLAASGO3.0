"use client";

import React from "react";

export default function ZelligeBg({
  opacity = 0.05,
  color = "#1B2440",
}: {
  opacity?: number;
  color?: string;
}) {
  const id = React.useId();

  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} aria-hidden>
      <defs>
        <pattern id={`zelbg-${id}`} x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M14 0 L28 14 L14 28 L0 14 Z" fill="none" stroke={color} strokeWidth="0.8" opacity={opacity} />
          <circle cx="14" cy="14" r="1.5" fill={color} opacity={opacity} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#zelbg-${id})`} />
    </svg>
  );
}
