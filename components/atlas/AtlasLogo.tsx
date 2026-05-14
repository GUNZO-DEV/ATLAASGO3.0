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
      {/* Mountain shape */}
      <path d="M8 52 L24 26 L34 38 L42 30 L56 52 Z" fill={color} />
      {/* Cream valley overlay */}
      <path
        d="M26 52 C26 42 28 36 32 32 C36 36 38 42 38 52 Z"
        fill="#FBF6E7"
        opacity={0.9}
      />
      {/* Teardrop pin */}
      <path
        d="M32 6 C26 6 22 10 22 16 C22 22 32 30 32 30 C32 30 42 22 42 16 C42 10 38 6 32 6 Z"
        fill={color}
      />
      {/* Circle inside pin */}
      <circle cx="32" cy="16" r="4" fill="#FBF6E7" />
    </svg>
  );
}
