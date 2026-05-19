import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/**
 * A low-poly Atlas mountain range that rises out of a soft gradient horizon.
 * Two parallax layers + a glowing sun + ambient sparkles. Drives off mouse
 * position via the R3F useFrame hook — never re-renders React on motion.
 */
function MountainRange({ depth, color, amplitude, baseY, segments }: {
  depth: number;
  color: string;
  amplitude: number;
  baseY: number;
  segments: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 14, segments, 12);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const seed = depth * 17.3;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Ridge-like noise; only push +Z when above mid, leave bottom flat.
      const ridge = Math.sin(x * 0.45 + seed) * 0.55
        + Math.sin(x * 0.92 + seed * 1.7) * 0.35
        + Math.sin(x * 1.7 + seed * 2.3) * 0.18;
      const peak = Math.max(0, y / 7);
      pos.setZ(i, ridge * amplitude * peak);
    }
    g.computeVertexNormals();
    return g;
  }, [depth, amplitude, segments]);

  useFrame(({ pointer }) => {
    if (!meshRef.current) return;
    // Subtle horizontal parallax sway based on pointer X.
    meshRef.current.position.x = pointer.x * (0.6 - depth * 0.18);
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[0, baseY, -depth * 1.8 - 1]}
      rotation={[-0.22, 0, 0]}
    >
      <meshStandardMaterial color={color} flatShading roughness={0.92} metalness={0.04} />
    </mesh>
  );
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.x = 6 + pointer.x * 0.4;
    ref.current.position.y = 3.6 + Math.sin(t * 0.4) * 0.15;
  });
  return (
    <mesh ref={ref} position={[6, 3.6, -6]}>
      <circleGeometry args={[1.6, 64]} />
      <meshBasicMaterial color="#FFB074" transparent opacity={0.95} />
    </mesh>
  );
}

function Atmosphere() {
  // Big back gradient plane that fakes the sky. Pushed close enough to the
  // camera that the fog doesn't eat it.
  return (
    <mesh position={[0, 1.2, -5]}>
      <planeGeometry args={[80, 30]} />
      <shaderMaterial
        transparent
        uniforms={{
          top: { value: new THREE.Color('#FFB074') },
          mid: { value: new THREE.Color('#FF7849') },
          bot: { value: new THREE.Color('#3A1E15') },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform vec3 top;
          uniform vec3 mid;
          uniform vec3 bot;
          void main(){
            vec3 c = mix(bot, mid, smoothstep(0.0, 0.55, vUv.y));
            c = mix(c, top, smoothstep(0.55, 1.0, vUv.y));
            gl_FragColor = vec4(c, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function Phone() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.rotation.y = -0.3 + pointer.x * 0.35 + Math.sin(t * 0.4) * 0.05;
    groupRef.current.rotation.x = 0.05 + pointer.y * 0.2;
  });
  return (
    <Float floatIntensity={0.6} rotationIntensity={0.2} speed={1.2}>
      <group ref={groupRef} position={[3.6, 0.4, 1.4]}>
        {/* phone body */}
        <mesh>
          <boxGeometry args={[1.5, 3, 0.18]} />
          <meshStandardMaterial color="#1A1410" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* screen */}
        <mesh position={[0, 0, 0.092]}>
          <planeGeometry args={[1.35, 2.85]} />
          <meshBasicMaterial color="#FBF7F2" />
        </mesh>
        {/* primary brand swatch on screen */}
        <mesh position={[0, 0.9, 0.094]}>
          <planeGeometry args={[1.15, 0.7]} />
          <meshBasicMaterial color="#FF5722" />
        </mesh>
        <mesh position={[0, -0.05, 0.094]}>
          <planeGeometry args={[1.15, 0.45]} />
          <meshBasicMaterial color="#FF8A65" />
        </mesh>
        <mesh position={[0, -0.7, 0.094]}>
          <planeGeometry args={[1.15, 0.45]} />
          <meshBasicMaterial color="#FFB74D" />
        </mesh>
      </group>
    </Float>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 1, 9], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <Atmosphere />
      <Sun />
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 7, 4]} intensity={2.0} color="#FFE0B2" />

      {/* Three depth layers — brightest in front, darkest behind, against the
          sunset shader. No scene fog so the silhouettes read crisp. */}
      <MountainRange depth={0} color="#C45A28" amplitude={2.4} baseY={-1.6} segments={56} />
      <MountainRange depth={1} color="#7A3018" amplitude={3.0} baseY={-2.0} segments={72} />
      <MountainRange depth={2} color="#3A1A0E" amplitude={3.6} baseY={-2.4} segments={88} />

      <Phone />
      <Sparkles count={70} scale={[14, 6, 8]} size={2.5} speed={0.3} color="#FFD9C7" opacity={0.7} />

      {/* OrbitControls disabled — we drive camera via pointer in useFrame.
          Kept here as a one-line opt-in for dev. */}
      <OrbitControls enabled={false} />
    </Canvas>
  );
}
