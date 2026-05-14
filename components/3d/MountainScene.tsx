"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function MountainScene() {
  const groupRef = useRef<THREE.Group>(null);

  const mountains = useMemo(() => [
    { x: -3, z: -3, height: 3.5, radius: 1.8, color: "#1e2d4a" },
    { x:  0, z: -4, height: 5.0, radius: 2.2, color: "#13203a" },
    { x:  3, z: -3, height: 3.0, radius: 1.6, color: "#2b3f63" },
    { x: -1.5, z: -2, height: 2.5, radius: 1.2, color: "#1e2d4a" },
    { x:  1.8, z: -2, height: 2.0, radius: 1.0, color: "#2b3f63" },
    { x: -5, z: -5, height: 2.8, radius: 1.5, color: "#13203a" },
    { x:  5, z: -5, height: 2.4, radius: 1.3, color: "#13203a" },
  ], []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, 0, m.z]} castShadow>
          <coneGeometry args={[m.radius, m.height, 6]} />
          <meshStandardMaterial
            color={m.color}
            roughness={0.9}
            metalness={0.0}
            flatShading
          />
        </mesh>
      ))}
      {mountains.filter(m => m.height >= 3.5).map((m, i) => (
        <mesh key={`snow-${i}`} position={[m.x, m.height * 0.65, m.z]}>
          <coneGeometry args={[m.radius * 0.35, m.height * 0.3, 6]} />
          <meshStandardMaterial color="#f0f4ff" roughness={0.7} flatShading />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0d1628" roughness={1} />
      </mesh>
    </group>
  );
}
