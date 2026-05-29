/**
 * Interactive 3D AUI campus diorama.
 *
 * Port of the design-package Campus3D prototype (campus3d.jsx) to React +
 * TypeScript using the npm `three` package. Click any of the 6 dorms to
 * highlight it, see its nearest partner kitchen, live ETA, and delivery fee.
 * Drag to orbit the camera; the scene auto-rotates gently when idle.
 *
 * The full WebGL scene is heavy (~30 buildings, 32 trees, 6 pedestrians,
 * 5 parked + 3 driving cars, 8 birds, fountain spray particles, animated
 * flag). To keep mobile perf good, the diorama is replaced with a static
 * info card on screens ≤ 768px.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as I from '../icons/Icon';

type Dorm = {
  id: number;
  name: string;
  x: number;
  z: number;
  label: string;
  nearest: string;
  eta: number;
  fee: string;
  students: number;
};

const DORMS: Dorm[] = [
  { id: 8,  name: 'Building 8',  x: -4.5, z:  3.5, label: "Men's · Junior",   nearest: 'Café Hassan',         eta: 18, fee: '12 dh', students: 280 },
  { id: 12, name: 'Building 12', x:  0.0, z:  4.0, label: "Women's · Senior", nearest: 'Boulangerie Michlifen', eta: 14, fee: '10 dh', students: 320 },
  { id: 16, name: 'Building 16', x:  4.5, z:  3.5, label: "Men's · Senior",   nearest: 'La Paix Pizzeria',     eta: 16, fee: '8 dh',  students: 290 },
  { id: 22, name: 'Building 22', x: -4.5, z: -3.5, label: "Women's · Junior", nearest: 'Atlas Grill House',    eta: 22, fee: 'Free',  students: 240 },
  { id: 28, name: 'Building 28', x:  0.0, z: -4.0, label: 'Family Apt.',      nearest: 'Riad Saveurs',          eta: 24, fee: '15 dh', students: 180 },
  { id: 31, name: 'Building 31', x:  4.5, z: -3.5, label: 'Grad Housing',     nearest: 'Green Bowl Ifrane',     eta: 19, fee: '8 dh',  students: 160 },
];

function useIsMobile(): boolean {
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export default function Campus3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Dorm>(DORMS[2]); // Building 16 default
  const stateRef = useRef({ selectedId: DORMS[2].id });
  const isMobile = useIsMobile();

  useEffect(() => {
    stateRef.current.selectedId = selected.id;
  }, [selected]);

  useEffect(() => {
    if (isMobile) return; // skip WebGL scene on mobile
    if (!hostRef.current) return;
    const host = hostRef.current;
    const W = host.clientWidth || 800;
    const H = host.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf5e6d3, 18, 38);
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 80);
    let camAngle = -0.5;
    let camPitch = 0.55;
    const camDist = 28;
    const updateCam = () => {
      camera.position.x = Math.sin(camAngle) * Math.cos(camPitch) * camDist;
      camera.position.z = Math.cos(camAngle) * Math.cos(camPitch) * camDist;
      camera.position.y = Math.sin(camPitch) * camDist;
      camera.lookAt(0, 0.5, 0);
    };
    updateCam();

    // Sky dome
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top:    { value: new THREE.Color(0xc8d8ee) },
        bottom: { value: new THREE.Color(0xfde2c0) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp((vP.y + 20.0) / 40.0, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), skyMat));

    // Lights
    scene.add(new THREE.AmbientLight(0xfff3dd, 0.6));
    const sun = new THREE.DirectionalLight(0xFFD7A4, 1.6);
    sun.position.set(-8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const fill = new THREE.HemisphereLight(0xc8d8ee, 0x6b5535, 0.5);
    scene.add(fill);

    // Ground — campus base with organic noise on the verts
    const groundGeo = new THREE.CircleGeometry(28, 96);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const y = gPos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      gPos.setZ(i, Math.sin(x * 0.5) * 0.04 + Math.cos(y * 0.4) * 0.04 - r * 0.005);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x88a560, roughness: 1.0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Paths
    const pathMat = new THREE.MeshStandardMaterial({ color: 0xc4a87a, roughness: 0.95 });
    const pathH = new THREE.Mesh(new THREE.BoxGeometry(36, 0.04, 1.6), pathMat);
    pathH.position.y = 0.02; pathH.receiveShadow = true; scene.add(pathH);
    const pathV = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 24), pathMat);
    pathV.position.y = 0.02; pathV.receiveShadow = true; scene.add(pathV);
    const ring = new THREE.Mesh(new THREE.RingGeometry(14, 15, 64), pathMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    ring.receiveShadow = true;
    scene.add(ring);

    // Plaza + fountain
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0xddc5a0, roughness: 0.85 }),
    );
    plaza.position.y = 0.04;
    plaza.receiveShadow = true;
    scene.add(plaza);

    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.75, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.4, metalness: 0.2 }),
    );
    basin.position.y = 0.16;
    basin.castShadow = true;
    basin.receiveShadow = true;
    scene.add(basin);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0x4d9fd6, roughness: 0.2, metalness: 0.4, emissive: 0x1a4060, emissiveIntensity: 0.2 }),
    );
    water.position.y = 0.27;
    scene.add(water);

    scene.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xb5a386, roughness: 0.5, metalness: 0.5 }),
    )).position.y = 0.5;

    // Fountain spray
    const sprayCount = 80;
    const sprayPos = new Float32Array(sprayCount * 3);
    type SprayV = { vx: number; vy: number; vz: number; life: number };
    const sprayV: SprayV[] = [];
    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3 + 1] = 0.7;
      const ang = Math.random() * Math.PI * 2;
      sprayV.push({
        vx: Math.cos(ang) * 0.008,
        vy: 0.04 + Math.random() * 0.03,
        vz: Math.sin(ang) * 0.008,
        life: Math.random() * 50,
      });
    }
    const sprayGeo = new THREE.BufferGeometry();
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const spray = new THREE.Points(
      sprayGeo,
      new THREE.PointsMaterial({ color: 0xcce8ff, size: 0.06, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    scene.add(spray);

    // AUI clocktower
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xe8d8b8, roughness: 0.6 }),
    );
    tower.position.set(0, 0.9, -1.2);
    tower.castShadow = true; tower.receiveShadow = true;
    scene.add(tower);
    const towerCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0xC2185B, roughness: 0.5 }),
    );
    towerCap.rotation.y = Math.PI / 4;
    towerCap.position.set(0, 1.9, -1.2);
    towerCap.castShadow = true;
    scene.add(towerCap);
    const clock = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }),
    );
    clock.position.set(0, 1.2, -0.94);
    scene.add(clock);

    // Lampposts
    const buildLamp = (x: number, z: number) => {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 }),
      );
      pole.position.y = 0.6;
      pole.castShadow = true;
      grp.add(pole);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xfff4cc, emissive: 0xffaa55, emissiveIntensity: 0.7 }),
      );
      head.position.y = 1.25;
      grp.add(head);
      grp.position.set(x, 0, z);
      return grp;
    };
    [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([x, z]) => scene.add(buildLamp(x, z)));

    // Benches at plaza corners
    const buildBench = (x: number, z: number, rotY = 0) => {
      const grp = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
      const metal = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 });
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.25), wood);
      seat.position.y = 0.22; seat.castShadow = true; grp.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.04), wood);
      back.position.set(0, 0.4, -0.12); back.castShadow = true; grp.add(back);
      for (const lx of [-0.4, 0.4]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.22), metal);
        leg.position.set(lx, 0.11, 0); leg.castShadow = true; grp.add(leg);
      }
      grp.position.set(x, 0, z); grp.rotation.y = rotY;
      return grp;
    };
    [[-2.2, 0, Math.PI / 2], [2.2, 0, -Math.PI / 2], [0, -2.2, 0], [0, 2.2, Math.PI]].forEach(
      ([x, z, r]) => scene.add(buildBench(x, z, r)),
    );

    // Bike racks
    const buildBikeRack = (x: number, z: number) => {
      const grp = new THREE.Group();
      const rail = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.7 });
      for (let i = -1.5; i <= 1.5; i++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 12, Math.PI), rail);
        hoop.position.set(i * 0.18, 0.13, 0);
        hoop.castShadow = true;
        grp.add(hoop);
      }
      grp.position.set(x, 0, z);
      return grp;
    };
    scene.add(buildBikeRack(-2.5, 4.8));
    scene.add(buildBikeRack(2.5, -4.8));

    // Cars
    const carColors = [0xc62828, 0x1976d2, 0x2e7d32, 0xfdd835, 0xeeeeee, 0x424242];
    const buildCar = (color: number, x: number, z: number, rotY = 0) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.3, 0.42),
        new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 }),
      );
      body.position.y = 0.22; body.castShadow = true; grp.add(body);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.22, 0.38),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.6, transparent: true, opacity: 0.75 }),
      );
      cabin.position.set(-0.02, 0.46, 0); cabin.castShadow = true; grp.add(cabin);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8 });
      const hubMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 });
      for (const [wx, wz] of [[-0.3, -0.22], [0.3, -0.22], [-0.3, 0.22], [0.3, 0.22]]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 14), wheelMat);
        w.rotation.x = Math.PI / 2; w.position.set(wx, 0.09, wz); grp.add(w);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.052, 8), hubMat);
        hub.rotation.x = Math.PI / 2; hub.position.set(wx, 0.09, wz); grp.add(hub);
      }
      grp.position.set(x, 0, z); grp.rotation.y = rotY;
      return grp;
    };

    // Parking lot
    const parkingX = -13, parkingZ = -8;
    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.03, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 }),
    );
    lot.position.set(parkingX, 0.03, parkingZ); lot.receiveShadow = true; scene.add(lot);
    for (let i = 0; i < 5; i++) {
      scene.add(buildCar(carColors[i % carColors.length], parkingX - 1.1 + i * 0.55, parkingZ - 0.35, Math.PI / 2));
    }
    // Driving cars on the perimeter ring
    type DCar = { mesh: THREE.Group; angle: number; speed: number; radius: number };
    const drivingCars: DCar[] = [];
    for (let i = 0; i < 3; i++) {
      const c = buildCar(carColors[(i + 2) % carColors.length], 0, 0, 0);
      scene.add(c);
      drivingCars.push({ mesh: c, angle: (i / 3) * Math.PI * 2, speed: 0.0025 + Math.random() * 0.0008, radius: 15 });
    }

    // Big AUI buildings — library, sciences, humanities, auditorium, dining, sports, admin, medical, mosque, minaret
    const buildBig = ({
      x, z, w = 2.6, d = 1.8, h = 1.4, color = 0xe0d0b0, roofColor = 0x6b4a2a, label = '',
    }: { x: number; z: number; w?: number; d?: number; h?: number; color?: number; roofColor?: number; label?: string }) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
      );
      body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true;
      grp.add(body);
      const colMat = new THREE.MeshStandardMaterial({ color: 0xeee8d0, roughness: 0.7 });
      for (let i = -2; i <= 2; i++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 8), colMat);
        col.position.set(i * (w / 5), h / 2, d / 2 + 0.1);
        col.castShadow = true; grp.add(col);
      }
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.2, 0.15, d + 0.2),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }),
      );
      roof.position.y = h + 0.07; roof.castShadow = true; grp.add(roof);
      const winMat = new THREE.MeshStandardMaterial({ color: 0xa0c8e0, emissive: 0x4a7fa0, emissiveIntensity: 0.2, roughness: 0.2 });
      for (let i = -1.5; i <= 1.5; i++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), winMat);
        win.position.set(i * (w / 4.5), h * 0.55, d / 2 + 0.011);
        grp.add(win);
      }
      if (label) {
        const lc = document.createElement('canvas');
        lc.width = 256; lc.height = 80;
        const ctx = lc.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(26,20,16,0.92)';
          ctx.fillRect(0, 0, 256, 80);
          ctx.fillStyle = '#FFB074';
          ctx.font = 'bold 28px Montserrat, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 128, 42);
        }
        const tex = new THREE.CanvasTexture(lc);
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        spr.position.set(0, h + 0.7, 0);
        spr.scale.set(1.6, 0.5, 1);
        grp.add(spr);
      }
      grp.position.set(x, 0, z);
      return grp;
    };

    scene.add(buildBig({ x: -10, z:  3, w: 3.2, d: 2.0, h: 1.8, color: 0xe6d8b8, roofColor: 0x8b4a2f, label: 'MOHAMMED VI LIBRARY' }));
    scene.add(buildBig({ x: -10, z: -3, w: 2.4, d: 1.6, h: 1.2, color: 0xf0e0c5, roofColor: 0x6b4a2a, label: 'BLDG 4 · SCIENCES' }));
    scene.add(buildBig({ x: -10, z:  0, w: 2.4, d: 1.6, h: 1.2, color: 0xe8dcc0, roofColor: 0x7a5535, label: 'BLDG 8A · HUMANITIES' }));
    scene.add(buildBig({ x:  10, z:  0, w: 3.0, d: 2.0, h: 1.4, color: 0xf4e4d0, roofColor: 0xc28850, label: 'HASSAN II AUDITORIUM' }));
    scene.add(buildBig({ x:  10, z:  3, w: 2.4, d: 1.6, h: 1.3, color: 0xf4e4d0, roofColor: 0xc28850, label: 'DINING HALL' }));
    scene.add(buildBig({ x:  10, z: -3, w: 2.8, d: 1.8, h: 1.5, color: 0xe0d4b0, roofColor: 0x8b4a2f, label: 'SPORTS COMPLEX' }));
    scene.add(buildBig({ x:   0, z:  8, w: 2.6, d: 1.6, h: 1.4, color: 0xf0e0c5, roofColor: 0x9b5a3a, label: 'ADMINISTRATION' }));
    scene.add(buildBig({ x:   4, z:  8, w: 1.8, d: 1.3, h: 1.0, color: 0xfff0e0, roofColor: 0xc62828, label: 'MEDICAL CENTER' }));

    // Mosque + minaret
    const mosque = new THREE.Group();
    const mosqueBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xf2e6cc, roughness: 0.85 }),
    );
    mosqueBody.position.y = 0.6; mosqueBody.castShadow = true; mosqueBody.receiveShadow = true;
    mosque.add(mosqueBody);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.5, metalness: 0.35 }),
    );
    dome.position.y = 1.2; dome.castShadow = true; mosque.add(dome);
    const domeFinial = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI * 1.2),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 }),
    );
    domeFinial.position.y = 2.35; domeFinial.rotation.z = -Math.PI / 2; mosque.add(domeFinial);
    mosque.position.set(-3, 0, -8);
    scene.add(mosque);

    const minaret = new THREE.Group();
    const minBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 2.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf0e0c0, roughness: 0.85 }),
    );
    minBody.position.y = 1.2; minBody.castShadow = true; minaret.add(minBody);
    for (const y of [0.7, 1.4, 2.0]) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.05, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.6 }),
      );
      band.position.y = y; minaret.add(band);
    }
    const minDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.5, metalness: 0.3 }),
    );
    minDome.position.y = 2.4; minaret.add(minDome);
    minaret.position.set(-3, 0, -6.6);
    scene.add(minaret);

    // Birds
    type Bird = { mesh: THREE.Mesh; angle: number; radius: number; h: number; speed: number };
    const birds: Bird[] = [];
    for (let i = 0; i < 8; i++) {
      const b = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 }),
      );
      b.rotation.x = Math.PI / 2;
      scene.add(b);
      birds.push({ mesh: b, angle: (i / 8) * Math.PI * 2, radius: 7 + Math.random() * 3, h: 5 + Math.random() * 2, speed: 0.004 + Math.random() * 0.002 });
    }

    // Trees around the perimeter
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
    const buildTree = (x: number, z: number, scale = 1) => {
      const grp = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.10, 0.7 * scale, 8),
        trunkMat,
      );
      trunk.position.y = 0.35 * scale; trunk.castShadow = true; grp.add(trunk);
      const fMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28 + (Math.random() - 0.5) * 0.04, 0.5, 0.32),
        roughness: 0.9,
        flatShading: true,
      });
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.5 * scale, 10, 8), fMat);
      s1.position.y = 0.9 * scale; s1.castShadow = true; grp.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 10, 8), fMat);
      s2.position.set(0.3 * scale, 1.1 * scale, 0.1 * scale); s2.castShadow = true; grp.add(s2);
      const s3 = new THREE.Mesh(new THREE.SphereGeometry(0.42 * scale, 10, 8), fMat);
      s3.position.set(-0.25 * scale, 1.05 * scale, -0.2 * scale); s3.castShadow = true; grp.add(s3);
      grp.position.set(x, 0.05, z);
      return grp;
    };
    for (let i = 0; i < 32; i++) {
      const ang = (i / 32) * Math.PI * 2;
      const dist = 13.5;
      const x = Math.cos(ang) * dist + (Math.random() - 0.5) * 0.4;
      const z = Math.sin(ang) * dist + (Math.random() - 0.5) * 0.4;
      scene.add(buildTree(x, z, 0.85 + Math.random() * 0.3));
    }

    // Dorms — multi-story tan buildings with a procedural window-grid texture
    type DormMesh = THREE.Group & {
      userData: { dorm: Dorm; isDorm: true; roofMat: THREE.MeshStandardMaterial; label?: THREE.Sprite };
    };
    const dormMeshes: DormMesh[] = [];
    DORMS.forEach((d, idx) => {
      const grp = new THREE.Group() as DormMesh;
      const stories = 3 + (idx % 2);
      const wW = 1.6, wD = 1.1, sh = 0.7;
      const totalH = stories * sh;

      const wc = document.createElement('canvas');
      wc.width = 256;
      wc.height = Math.floor(256 * (totalH / wW));
      const wctx = wc.getContext('2d');
      if (wctx) {
        const grad = wctx.createLinearGradient(0, 0, 0, wc.height);
        grad.addColorStop(0, '#f7e4cd');
        grad.addColorStop(1, '#e0bf94');
        wctx.fillStyle = grad;
        wctx.fillRect(0, 0, wc.width, wc.height);
        for (let n = 0; n < 1500; n++) {
          wctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
          wctx.fillRect(Math.random() * wc.width, Math.random() * wc.height, 2, 2);
        }
        const cols = 4;
        const rows = stories;
        const pad = 32;
        const colW = (wc.width - pad * 2) / cols;
        const rowH = wc.height / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = pad + c * colW + 8;
            const wy = r * rowH + rowH * 0.25;
            const ww = colW - 16;
            const wh = rowH * 0.45;
            wctx.fillStyle = '#3a241b';
            wctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
            const lit = Math.random() > 0.35;
            const wg = wctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
            if (lit) { wg.addColorStop(0, '#ffd97a'); wg.addColorStop(1, '#ff8a3d'); }
            else     { wg.addColorStop(0, '#5a6e7a'); wg.addColorStop(1, '#3a4a55'); }
            wctx.fillStyle = wg;
            wctx.fillRect(wx, wy, ww, wh);
            wctx.fillStyle = 'rgba(58, 36, 27, 0.7)';
            wctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
            wctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
          }
          wctx.fillStyle = 'rgba(150, 100, 60, 0.18)';
          wctx.fillRect(0, (r + 1) * rowH, wc.width, 2);
        }
      }
      const wallTex = new THREE.CanvasTexture(wc);
      wallTex.colorSpace = THREE.SRGBColorSpace;
      wallTex.anisotropy = 4;
      const sideTex = wallTex.clone();
      sideTex.wrapS = THREE.RepeatWrapping;
      sideTex.repeat.set(wD / wW, 1);
      sideTex.needsUpdate = true;

      const bodyMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
      const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.85 });
      const topMat = new THREE.MeshStandardMaterial({ color: 0xb05030, roughness: 0.6 });
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x7a5f47, roughness: 0.9 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(wW, totalH, wD), [sideMat, sideMat, topMat, baseMat, bodyMat, bodyMat]);
      body.position.y = totalH / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      grp.add(body);

      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(wW + 0.1, 0.12, wD + 0.1),
        new THREE.MeshStandardMaterial({ color: 0xc28850, roughness: 0.7 }),
      );
      parapet.position.y = totalH + 0.06;
      parapet.castShadow = true;
      grp.add(parapet);

      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.4, metalness: 0.3 }),
      );
      tank.position.set(-wW * 0.25, totalH + 0.27, -wD * 0.2);
      tank.castShadow = true;
      grp.add(tank);

      const overhang = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.05, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xc2185b, roughness: 0.6 }),
      );
      overhang.position.set(0, 0.55, wD / 2 + 0.12);
      overhang.castShadow = true;
      grp.add(overhang);

      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4a2818, roughness: 0.5, metalness: 0.2 }),
      );
      door.position.set(0, 0.25, wD / 2 + 0.001);
      grp.add(door);

      // Pill label "BLDG N"
      const lc = document.createElement('canvas');
      lc.width = 256; lc.height = 80;
      const lctx = lc.getContext('2d');
      if (lctx) {
        lctx.fillStyle = 'rgba(26, 20, 16, 0.92)';
        const radius = 40;
        lctx.beginPath();
        lctx.moveTo(radius, 0);
        lctx.lineTo(256 - radius, 0);
        lctx.quadraticCurveTo(256, 0, 256, radius);
        lctx.lineTo(256, 80 - radius);
        lctx.quadraticCurveTo(256, 80, 256 - radius, 80);
        lctx.lineTo(radius, 80);
        lctx.quadraticCurveTo(0, 80, 0, 80 - radius);
        lctx.lineTo(0, radius);
        lctx.quadraticCurveTo(0, 0, radius, 0);
        lctx.fill();
        lctx.fillStyle = '#ffffff';
        lctx.font = 'bold 36px Montserrat, sans-serif';
        lctx.textAlign = 'center';
        lctx.textBaseline = 'middle';
        lctx.fillText('BLDG ' + d.id, 128, 42);
      }
      const ltex = new THREE.CanvasTexture(lc);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, transparent: true }));
      label.position.set(0, totalH + 0.9, 0);
      label.scale.set(1.4, 0.44, 1);
      grp.add(label);

      grp.userData = { dorm: d, isDorm: true, roofMat: parapet.material as THREE.MeshStandardMaterial, label };
      grp.position.set(d.x, 0, d.z);
      scene.add(grp);
      dormMeshes.push(grp);
    });

    // Restaurant pins (4 colored teardrops around the campus edge)
    type RestoPin = { x: number; z: number; color: number };
    const restos: RestoPin[] = [
      { x: -12, z: -8, color: 0xFF5722 },
      { x:  12, z: -8, color: 0xFFB74D },
      { x: -12, z:  8, color: 0xC2185B },
      { x:  12, z:  8, color: 0x10B981 },
    ];
    restos.forEach((r) => {
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 }),
      );
      pole.position.y = 0.4;
      grp.add(pole);
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 20, 16),
        new THREE.MeshStandardMaterial({ color: r.color, emissive: r.color, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.3 }),
      );
      pin.position.y = 1.05; pin.castShadow = true;
      grp.add(pin);
      grp.position.set(r.x, 0, r.z);
      scene.add(grp);
    });

    // Animated route from selected restaurant → selected dorm
    const routeMat = new THREE.LineDashedMaterial({
      color: 0xFF5722, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.85,
    });
    const routeGeo = new THREE.BufferGeometry();
    const route = new THREE.Line(routeGeo, routeMat);
    scene.add(route);

    // Glowing rider that travels the route
    const rider = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xFF5722, emissive: 0xFF5722, emissiveIntensity: 0.8 }),
    );
    scene.add(rider);

    const routeStart = new THREE.Vector3(-9, 0.05, -7);
    const routeEnd = new THREE.Vector3(0, 0.05, 0);
    const refreshRoute = () => {
      const sel = DORMS.find((d) => d.id === stateRef.current.selectedId);
      if (!sel) return;
      const r = restos[sel.id % restos.length];
      routeStart.set(r.x, 0.05, r.z);
      routeEnd.set(sel.x, 0.05, sel.z);
      const pts: THREE.Vector3[] = [];
      const segs = 50;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = routeStart.x + (routeEnd.x - routeStart.x) * t;
        const z = routeStart.z + (routeEnd.z - routeStart.z) * t;
        const y = 0.08 + Math.sin(t * Math.PI) * 0.6;
        pts.push(new THREE.Vector3(x, y, z));
      }
      routeGeo.setFromPoints(pts);
      route.computeLineDistances();
    };
    refreshRoute();

    // Hover + click handling
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered: DormMesh | null = null;
    const updateHover = (mesh: DormMesh | null) => {
      if (hovered === mesh) return;
      if (hovered && hovered.userData.dorm.id !== stateRef.current.selectedId) {
        hovered.scale.setScalar(1.0);
        if (hovered.userData.label) hovered.userData.label.scale.set(1.4, 0.44, 1);
        hovered.userData.roofMat.emissive = new THREE.Color(0x000000);
        hovered.userData.roofMat.emissiveIntensity = 0;
      }
      hovered = mesh;
      if (hovered && hovered.userData.dorm.id !== stateRef.current.selectedId) {
        hovered.scale.setScalar(1.04);
        if (hovered.userData.label) hovered.userData.label.scale.set(1.55, 0.49, 1);
        hovered.userData.roofMat.emissive = new THREE.Color(0xFFB074);
        hovered.userData.roofMat.emissiveIntensity = 0.4;
        host.style.cursor = 'pointer';
      } else if (hovered) {
        host.style.cursor = 'pointer';
      } else {
        host.style.cursor = '';
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(dormMeshes, true);
      const hit = hits.find((h) => {
        let n: THREE.Object3D | null = h.object;
        while (n && !(n.userData as { isDorm?: boolean }).isDorm) n = n.parent;
        return !!n;
      });
      if (hit) {
        let n: THREE.Object3D | null = hit.object;
        while (n && !(n.userData as { isDorm?: boolean }).isDorm) n = n.parent;
        updateHover(n as DormMesh | null);
      } else updateHover(null);
    };
    const onClick = () => {
      if (hovered) {
        setSelected(hovered.userData.dorm);
        setTimeout(refreshRoute, 0);
      }
    };
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('click', onClick);

    // Drag-to-orbit
    let dragging = false, lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      host.style.cursor = 'grabbing';
    };
    const onUp = () => { dragging = false; host.style.cursor = ''; };
    const onDrag = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      camAngle -= dx * 0.006;
      camPitch = Math.max(0.18, Math.min(1.1, camPitch + dy * 0.004));
      updateCam();
    };
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onDrag);

    // Resize
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(host);

    // Theme awareness
    const applyTheme = () => {
      const dark = document.documentElement.dataset.theme === 'dark';
      (ground.material as THREE.MeshStandardMaterial).color = new THREE.Color(dark ? 0x3a4a30 : 0x88a560);
      pathMat.color = new THREE.Color(dark ? 0x6b5535 : 0xbfa97e);
      (plaza.material as THREE.MeshStandardMaterial).color = new THREE.Color(dark ? 0x4a3a25 : 0xddc5a0);
      sun.color = new THREE.Color(dark ? 0x6b8eff : 0xFFD7A4);
      sun.intensity = dark ? 0.7 : 1.6;
      fill.color = new THREE.Color(dark ? 0x1a2c4a : 0xc8d8ee);
      fill.groundColor = new THREE.Color(dark ? 0x1a1410 : 0x6b5535);
      (scene.fog as THREE.Fog).color = new THREE.Color(dark ? 0x1a1410 : 0xf5e6d3);
      skyMat.uniforms.top.value = new THREE.Color(dark ? 0x0a0e1a : 0xc8d8ee);
      skyMat.uniforms.bottom.value = new THREE.Color(dark ? 0x1a1410 : 0xfde2c0);
    };
    applyTheme();
    const obs = new MutationObserver(applyTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Initial selection highlight
    const markSelected = () => {
      dormMeshes.forEach((m) => {
        const isSel = m.userData.dorm.id === stateRef.current.selectedId;
        m.userData.roofMat.color = new THREE.Color(isSel ? 0xFF5722 : 0xc28850);
        m.userData.roofMat.emissive = new THREE.Color(isSel ? 0xFF5722 : 0x000000);
        m.userData.roofMat.emissiveIntensity = isSel ? 0.55 : 0;
        m.scale.setScalar(isSel ? 1.08 : 1.0);
        if (m.userData.label) m.userData.label.scale.set(isSel ? 1.6 : 1.4, isSel ? 0.5 : 0.44, 1);
      });
    };
    markSelected();

    // Animation loop
    let raf = 0;
    const t0 = performance.now();
    let lastSel = stateRef.current.selectedId;
    let routeT = 0;
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (lastSel !== stateRef.current.selectedId) {
        lastSel = stateRef.current.selectedId;
        markSelected();
        refreshRoute();
      }
      if (!dragging) camAngle += 0.0006;
      updateCam();

      // Spray
      const sPos = spray.geometry.attributes.position;
      const arr = sPos.array as Float32Array;
      for (let i = 0; i < sprayCount; i++) {
        const v = sprayV[i];
        arr[i * 3] += v.vx;
        arr[i * 3 + 1] += v.vy;
        arr[i * 3 + 2] += v.vz;
        v.vy -= 0.0025;
        v.life += 1;
        if (arr[i * 3 + 1] < 0.28 || v.life > 80) {
          arr[i * 3] = 0; arr[i * 3 + 1] = 0.7; arr[i * 3 + 2] = 0;
          const ang = Math.random() * Math.PI * 2;
          v.vx = Math.cos(ang) * 0.008;
          v.vz = Math.sin(ang) * 0.008;
          v.vy = 0.04 + Math.random() * 0.03;
          v.life = 0;
        }
      }
      sPos.needsUpdate = true;
      (water.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(t * 2) * 0.08;

      // Driving cars
      drivingCars.forEach((c) => {
        c.angle += c.speed;
        c.mesh.position.set(Math.cos(c.angle) * c.radius, 0, Math.sin(c.angle) * c.radius);
        c.mesh.rotation.y = -c.angle + Math.PI / 2;
      });

      // Birds
      birds.forEach((b) => {
        b.angle += b.speed;
        b.mesh.position.set(Math.cos(b.angle) * b.radius, b.h + Math.sin(t * 2 + b.angle) * 0.2, Math.sin(b.angle) * b.radius);
        b.mesh.rotation.y = -b.angle + Math.PI / 2;
        b.mesh.scale.x = 1 + Math.sin(t * 12) * 0.3;
      });

      // Rider along route
      routeT = (routeT + 0.006) % 1;
      const x = routeStart.x + (routeEnd.x - routeStart.x) * routeT;
      const z = routeStart.z + (routeEnd.z - routeStart.z) * routeT;
      const y = 0.2 + Math.sin(routeT * Math.PI) * 0.6;
      rider.position.set(x, y, z);
      (rider.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 6) * 0.3;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('click', onClick);
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onDrag);
      ro.disconnect();
      obs.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode) host.removeChild(renderer.domElement);
    };
  }, [isMobile]);

  return (
    <section className="bloc campus-bloc" id="campus-3d">
      <div className="container">
        <div className="campus-header">
          <div className="section-tag"><I.Pin size={11} /> Find Your Dorm</div>
          <h2 className="section-title">
            AUI campus, in 3D.<br />
            Click your dorm.
          </h2>
          <p className="section-sub">
            Tap any building to see your nearest partner kitchen, live delivery fee, and ETA from there.
            Drag the scene to orbit — every dorm is door-precise in our database.
          </p>
        </div>

        <div className="campus-stage">
          <div className="campus-canvas" ref={hostRef}>
            {isMobile && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'grid', placeItems: 'center',
                padding: 24, textAlign: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 56, marginBottom: 10 }}>🏛</div>
                  <div style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
                    Pick your dorm
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg-soft)' }}>
                    The 3D campus is desktop-only. Use the chips below to pick your building.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="campus-panel">
            <div className="campus-panel-head">
              <div className="cp-num">{selected.id}</div>
              <div>
                <div className="cp-tag">Selected</div>
                <div className="cp-title">{selected.name}</div>
                <div className="cp-sub">{selected.label} · {selected.students} residents</div>
              </div>
            </div>

            <div className="cp-divider" />

            <div className="cp-row">
              <div className="cp-row-lbl">Nearest kitchen</div>
              <div className="cp-row-val">{selected.nearest}</div>
            </div>
            <div className="cp-row">
              <div className="cp-row-lbl">Live ETA</div>
              <div className="cp-row-val cp-eta">{selected.eta}<span>min</span></div>
            </div>
            <div className="cp-row">
              <div className="cp-row-lbl">Delivery fee</div>
              <div className="cp-row-val" style={{ color: selected.fee === 'Free' ? '#10B981' : undefined }}>
                {selected.fee}
              </div>
            </div>

            <div className="cp-actions">
              <a className="btn btn-primary" href="/order?campus=1">
                Order to {selected.name} <I.Arrow />
              </a>
              <a className="btn btn-outline" href="/order">See all kitchens</a>
            </div>

            <div className="cp-hint">
              <I.Lightning size={12} /> Drag the campus to orbit · Click any building
            </div>
          </div>
        </div>

        <div className="campus-dorms">
          {DORMS.map((d) => (
            <button
              key={d.id}
              className={`campus-chip ${selected.id === d.id ? 'active' : ''}`}
              onClick={() => setSelected(d)}
            >
              <span className="campus-chip-num">{d.id}</span>
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
