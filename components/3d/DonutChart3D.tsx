"use client";

import { useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChart3DProps {
  segments: DonutSegment[];
  innerRadius?: number;
  outerRadius?: number;
  label?: string;
}

export default function DonutChart3D({
  segments,
  innerRadius = 0.6,
  outerRadius = 1.0,
  label,
}: DonutChart3DProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const arcs = useMemo(() => {
    let angle = 0;
    return segments.map((seg) => {
      const fraction = seg.value / total;
      const arcLength = fraction * Math.PI * 2;
      const start = angle;
      angle += arcLength;
      return { ...seg, start, arcLength };
    });
  }, [segments, total]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {arcs.map(({ label: segLabel, color, arcLength }) => (
        <mesh key={segLabel}>
          <torusGeometry
            args={[
              (innerRadius + outerRadius) / 2,
              (outerRadius - innerRadius) / 2,
              16,
              48,
              arcLength - 0.04,
            ]}
          />
          <primitive
            object={
              new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.2,
                roughness: 0.3,
              })
            }
          />
        </mesh>
      ))}
      {label && (
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.28}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          rotation={[Math.PI / 2, 0, 0]}
        >
          {label}
        </Text>
      )}
    </group>
  );
}
