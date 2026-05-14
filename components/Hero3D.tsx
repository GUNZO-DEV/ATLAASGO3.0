"use client";

/**
 * Hero background — animated mesh gradient.
 * Spline removed; will be replaced with R3F MountainScene in Phase 2.
 */
export default function Hero3D() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 70% 20%, rgba(0,103,71,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(184,151,62,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 90% 90%, rgba(0,77,53,0.2) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  );
}
