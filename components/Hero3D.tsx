"use client";

import dynamic from "next/dynamic";

const SceneCanvas   = dynamic(() => import("@/lib/r3f/canvas"),                  { ssr: false });
const MountainScene = dynamic(() => import("@/components/3d/MountainScene"),     { ssr: false });
const ParticleField = dynamic(() => import("@/components/3d/ParticleField"),     { ssr: false });
const HeroLighting  = dynamic(
  () => import("@/lib/r3f/lighting").then((m) => ({ default: m.HeroLighting })),
  { ssr: false }
);

export default function Hero3D() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <SceneCanvas camera={{ fov: 50, position: [0, 3, 10] }}>
        <HeroLighting />
        <MountainScene />
        <ParticleField count={80} spread={14} color="#e05a23" />
      </SceneCanvas>
    </div>
  );
}
