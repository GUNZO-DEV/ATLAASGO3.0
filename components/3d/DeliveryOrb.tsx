"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Float } from "@react-three/drei";
import * as THREE from "three";
import type { OrderStatus } from "@/types/order";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:   "#e05a23",
  accepted:  "#3b82f6",
  picked_up: "#06b6d4",
  delivered: "#22c55e",
  cancelled: "#6b7280",
  expired:   "#4b5563",
};

const STATUS_PULSE_SPEED: Record<OrderStatus, number> = {
  pending:   1.8,
  accepted:  0.5,
  picked_up: 3.0,
  delivered: 0,
  cancelled: 0,
  expired:   0,
};

interface DeliveryOrbProps {
  status: OrderStatus;
}

export default function DeliveryOrb({ status }: DeliveryOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = STATUS_COLORS[status];
  const pulseSpeed = STATUS_PULSE_SPEED[status];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (pulseSpeed > 0) {
      const t = clock.getElapsedTime();
      mat.emissiveIntensity = 0.3 + Math.sin(t * pulseSpeed) * 0.2;
    } else {
      mat.emissiveIntensity = status === "delivered" ? 0.5 : 0.1;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.92}
        />
      </Sphere>
    </Float>
  );
}
