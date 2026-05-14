"use client";

import { useId } from "react";

export default function ZelligeBg({
  opacity = 0.06,
  color = "currentColor",
  className = "",
}: {
  opacity?: number;
  color?: string;
  className?: string;
}) {
  const id = useId();
  const patternId = `zellige-${id}`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ opacity }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M24 4L44 24L24 44L4 24Z" fill="none" stroke={color} strokeWidth="0.5" />
            <path d="M24 12L36 24L24 36L12 24Z" fill="none" stroke={color} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
