"use client";

export default function AtlasLogo({
  size = 40,
  color = "#E55A26",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Mountain body */}
      <path
        d="M8 52L26 16L34 30L42 18L56 52H8Z"
        fill={color}
        opacity={0.15}
      />
      <path
        d="M8 52L26 16L34 30L42 18L56 52"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Pin at peak */}
      <circle cx="32" cy="14" r="6" fill={color} />
      <circle cx="32" cy="14" r="2.5" fill="white" />
      {/* Pin point */}
      <path d="M32 20L35 14H29L32 20Z" fill={color} />
    </svg>
  );
}
