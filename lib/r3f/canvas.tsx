"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, type ReactNode } from "react";
import { Preload } from "@react-three/drei";

interface SceneCanvasProps {
  children: ReactNode;
  className?: string;
  camera?: { fov?: number; position?: [number, number, number] };
}

export default function SceneCanvas({
  children,
  className = "absolute inset-0 w-full h-full",
  camera = { fov: 45, position: [0, 0, 8] },
}: SceneCanvasProps) {
  return (
    <Canvas
      camera={camera}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      className={className}
    >
      <Suspense fallback={null}>
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
