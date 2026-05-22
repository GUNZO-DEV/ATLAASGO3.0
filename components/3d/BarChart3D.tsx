"use client";

import { Text } from "@react-three/drei";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChart3DProps {
  data: BarData[];
  maxValue?: number;
  maxHeight?: number;
}

export default function BarChart3D({ data, maxValue, maxHeight = 3 }: BarChart3DProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = 0.5;
  const gap = 0.2;
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <group position={[-totalWidth / 2 + barWidth / 2, 0, 0]}>
      {data.map(({ label, value, color = "#e05a23" }, i) => {
        const height = Math.max((value / max) * maxHeight, 0.05);
        const x = i * (barWidth + gap);
        return (
          <group key={label} position={[x, 0, 0]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[barWidth, height, barWidth]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.15}
                roughness={0.3}
                metalness={0.1}
              />
            </mesh>
            <Text
              position={[0, -0.25, 0]}
              fontSize={0.18}
              color="#94a3b8"
              anchorX="center"
              anchorY="top"
            >
              {label}
            </Text>
          </group>
        );
      })}
      <mesh position={[totalWidth / 2 - barWidth / 2, 0, 0]}>
        <boxGeometry args={[totalWidth, 0.02, 0.02]} />
        <meshStandardMaterial color="#2b3f63" />
      </mesh>
    </group>
  );
}
