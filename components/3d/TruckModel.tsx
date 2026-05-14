"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface TruckModelProps {
  isOnline?: boolean;
}

export default function TruckModel({ isOnline = false }: TruckModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !isOnline) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 3) * 0.05;
  });

  return (
    <Float speed={isOnline ? 2 : 0.5} floatIntensity={isOnline ? 0.3 : 0.1}>
      <group ref={groupRef} scale={0.7}>
        <RoundedBox args={[0.8, 0.6, 1.2]} radius={0.05} position={[0.3, 0.2, 0]}>
          <meshStandardMaterial color="#1e2d4a" roughness={0.4} metalness={0.3} />
        </RoundedBox>
        <RoundedBox args={[1.2, 0.7, 1.2]} radius={0.04} position={[-0.4, 0.25, 0]}>
          <meshStandardMaterial
            color={isOnline ? "#e05a23" : "#6b7280"}
            roughness={0.3}
            metalness={0.1}
          />
        </RoundedBox>
        {([[-0.6, -0.15, 0.5], [-0.6, -0.15, -0.5], [0.5, -0.15, 0.5], [0.5, -0.15, -0.5]] as [number,number,number][]).map(
          ([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.18, 0.12, 12]} />
              <meshStandardMaterial color="#0d1628" roughness={0.9} />
            </mesh>
          )
        )}
        <mesh position={[0.72, 0.28, 0]} rotation={[0, 0, -0.3]}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshPhysicalMaterial
            color="#a8d4ff"
            transparent
            opacity={0.7}
            roughness={0}
          />
        </mesh>
      </group>
    </Float>
  );
}
