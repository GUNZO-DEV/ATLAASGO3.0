"use client";

export function HeroLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffd5aa" />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        color="#fff4e0"
        castShadow
      />
      <pointLight position={[-5, 5, -5]} intensity={0.3} color="#e05a23" />
    </>
  );
}

export function MapLighting() {
  return (
    <>
      <ambientLight intensity={0.6} color="#cce4ff" />
      <directionalLight position={[0, 10, 0]} intensity={0.8} color="#ffffff" />
    </>
  );
}

export function DashboardLighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[0, 4, 4]} intensity={0.6} color="#e05a23" />
    </>
  );
}
