"use client";

export default function AtlasWordmark({
  size = 18,
  color = "#1B2440",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-[var(--font-display)] tracking-[-0.02em] select-none ${className}`}
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.02em" }}
    >
      <span style={{ color }}>ATLAAS</span>
      <span style={{ color: "#E55A26", marginLeft: size * 0.15 }}>GO</span>
    </span>
  );
}
