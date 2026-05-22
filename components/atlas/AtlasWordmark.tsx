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
      className={`tracking-[-0.02em] select-none ${className}`}
      style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}
    >
      <span style={{ color }}>ATLAAS</span>
      <span style={{ color: "#E55A26" }}>GO</span>
    </span>
  );
}
