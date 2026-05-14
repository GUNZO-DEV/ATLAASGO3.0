"use client";

import { useMemo } from "react";
import { Sphere, Line } from "@react-three/drei";
import * as THREE from "three";
import { LANDMARK_COORDS } from "@/constants/zones";

interface MapDot {
  id: string;
  lat: number;
  lng: number;
  color?: string;
}

interface CityMap3DProps {
  zone: "ifrane" | "oujda";
  dots?: MapDot[];
  showRoute?: boolean;
}

const ZONE_BOUNDS = {
  ifrane: { minLat: 33.51, maxLat: 33.54, minLng: -5.13, maxLng: -5.09 },
  oujda:  { minLat: 34.66, maxLat: 34.70, minLng: -1.93, maxLng: -1.88 },
};

function project(lat: number, lng: number, bounds: typeof ZONE_BOUNDS.ifrane): [number, number] {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) - 0.5) * 10;
  const y = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) - 0.5) * 10;
  return [x, y];
}

export default function CityMap3D({ zone, dots = [], showRoute = false }: CityMap3DProps) {
  const bounds = ZONE_BOUNDS[zone];

  const landmarks = useMemo(() => {
    const ifrane = ["AUI Dorms", "Marché", "Grand Hotel", "Pizza Rustica", "Bonsai Sushi"];
    const oujda  = ["Sidi Maafa", "Place Ziri Ibn Attia", "Université Mohammed Premier"];
    const names  = zone === "ifrane" ? ifrane : oujda;
    return Object.entries(LANDMARK_COORDS)
      .filter(([name]) => names.includes(name))
      .map(([name, [lat, lng]]) => ({ name, pos: project(lat, lng, bounds) }));
  }, [zone, bounds]);

  const routePoints = useMemo(() => {
    if (!showRoute || dots.length < 2) return [];
    const [a, b] = dots;
    const [ax, ay] = project(a.lat, a.lng, bounds);
    const [bx, by] = project(b.lat, b.lng, bounds);
    return [new THREE.Vector3(ax, 0.05, -ay), new THREE.Vector3(bx, 0.05, -by)];
  }, [dots, showRoute, bounds]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11, 11]} />
        <meshStandardMaterial color="#1e2d4a" roughness={0.9} />
      </mesh>

      {[-4, -2, 0, 2, 4].map((v) => (
        <group key={v}>
          <Line points={[[-5, 0.01, v], [5, 0.01, v]]} color="#2b3f63" lineWidth={1} />
          <Line points={[[v, 0.01, -5], [v, 0.01, 5]]} color="#2b3f63" lineWidth={1} />
        </group>
      ))}

      {landmarks.map(({ name, pos: [x, y] }) => (
        <mesh key={name} position={[x, 0.08, -y]}>
          <boxGeometry args={[0.12, 0.08, 0.12]} />
          <meshStandardMaterial color="#2b3f63" />
        </mesh>
      ))}

      {dots.map(({ id, lat, lng, color = "#e05a23" }) => {
        const [x, y] = project(lat, lng, bounds);
        return (
          <Sphere key={id} args={[0.12, 16, 16]} position={[x, 0.15, -y]}>
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
          </Sphere>
        );
      })}

      {routePoints.length === 2 && (
        <Line
          points={routePoints}
          color="#e05a23"
          lineWidth={2}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
    </group>
  );
}
