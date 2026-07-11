/**
 * تضاريس المسح الإشعاعي — شبكة USGS الحقيقية كسطح ثلاثي الأبعاد.
 *
 * الارتفاع واللون كلاهما يمثل القيمة المقيسة للقناة المختارة، فالمناطق الغنية
 * إشعاعياً (طين) ترتفع فعلياً عن السطح والمناطق الرملية تنخفض. الخلايا التي
 * لا بيانات لها تُسقَط من الشبكة تماماً — لا نملأ فجوة بقيمة مخترعة.
 *
 * procedural بالكامل بلا ملفات نماذج خارجية (نفس نهج BulletScene.tsx).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Channel, Grid } from "../data/grid";
import { applyOrbit, attachOrbit, DEFAULT_LIMITS, type OrbitState } from "./orbit";

export interface Cell {
  col: number;
  row: number;
  lat: number;
  lon: number;
}

/** ألوان الهوية فقط — DESIGN_SPEC.md يمنع أي لون خارج اللوحة */
const RAMP = [
  new THREE.Color("#ede3cf"), // كريمي — إشعاع منخفض (رملية)
  new THREE.Color("#dcc9a3"),
  new THREE.Color("#bfa06e"), // ذهبي
  new THREE.Color("#5c5f3a"), // زيتوني
  new THREE.Color("#4a2e35"), // خمري — إشعاع مرتفع (طينية)
];

function ramp(t: number, out: THREE.Color): THREE.Color {
  const x = Math.min(0.9999, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.floor(x);
  return out.copy(RAMP[i]).lerp(RAMP[i + 1], x - i);
}

const PLANE_W = 6;   // عرض المشهد بوحدات three
const HEIGHT = 1.15; // أقصى ارتفاع للتضاريس

/** بناء هندسة السطح: رأس لكل خلية ذات بيانات، ووجوه بين الرباعيات المكتملة */
function buildGeometry(grid: Grid, channel: Channel) {
  const { cols, rows, range } = grid.header;
  const vals = grid.plane[channel];
  const { min, max } = range[channel];
  const span = max - min || 1;

  const aspect = rows / cols;
  const planeH = PLANE_W * aspect;
  const dx = PLANE_W / (cols - 1);
  const dz = planeH / (rows - 1);

  const pos: number[] = [];
  const col: number[] = [];
  // vertexAt[i] = فهرس الرأس لهذه الخلية، أو -1 إن لم تكن لها بيانات
  const vertexAt = new Int32Array(cols * rows).fill(-1);
  const c = new THREE.Color();

  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const i = r * cols + q;
      const v = vals[i];
      if (Number.isNaN(v)) continue;

      const t = (v - min) / span;
      vertexAt[i] = pos.length / 3;
      pos.push(
        q * dx - PLANE_W / 2,
        t * HEIGHT,
        r * dz - planeH / 2,
      );
      ramp(t, c);
      col.push(c.r, c.g, c.b);
    }
  }

  // وجه فقط حين تكتمل أركان الرباعي الأربعة — الفجوات تبقى فجوات
  const idx: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let q = 0; q < cols - 1; q++) {
      const a = vertexAt[r * cols + q];
      const b = vertexAt[r * cols + q + 1];
      const d = vertexAt[(r + 1) * cols + q];
      const e = vertexAt[(r + 1) * cols + q + 1];
      if (a < 0 || b < 0 || d < 0 || e < 0) continue;
      idx.push(a, d, b, b, d, e);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  return { geo, dx, dz, planeH };
}

/** إسقاط خلية إلى إحداثيات المشهد — يُستخدم لوضع الدرون والعلامة */
function cellToWorld(
  grid: Grid,
  channel: Channel,
  cell: Cell,
  dx: number,
  dz: number,
  planeH: number,
): THREE.Vector3 {
  const { cols, range } = grid.header;
  const v = grid.plane[channel][cell.row * cols + cell.col];
  const { min, max } = range[channel];
  const t = Number.isNaN(v) ? 0 : (v - min) / ((max - min) || 1);
  return new THREE.Vector3(
    cell.col * dx - PLANE_W / 2,
    t * HEIGHT,
    cell.row * dz - planeH / 2,
  );
}

/** درون بسيط procedural — يهبط نحو الخلية المختارة أثناء الفحص */
function Drone({ target, scanning }: { target: THREE.Vector3; scanning: boolean }) {
  const g = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Mesh[]>([]);

  useFrame((state, dt) => {
    if (!g.current) return;
    // يحوم أعلى الهدف، وينزل إليه أثناء الفحص
    const hoverY = target.y + (scanning ? 0.42 : 1.5);
    const bob = Math.sin(state.clock.elapsedTime * 2.4) * 0.045;
    g.current.position.lerp(
      new THREE.Vector3(target.x, hoverY + bob, target.z),
      Math.min(1, dt * 3.4),
    );
    for (const r of rotors.current) r.rotation.y += dt * (scanning ? 34 : 18);
  });

  const arms: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  return (
    <group ref={g}>
      <mesh castShadow>
        <boxGeometry args={[0.17, 0.055, 0.17]} />
        <meshStandardMaterial color="#3e2f26" roughness={0.55} />
      </mesh>
      {/* المستشعر أسفل الهيكل */}
      <mesh position={[0, -0.055, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.055, 12]} />
        <meshStandardMaterial
          color="#bfa06e"
          emissive="#bfa06e"
          emissiveIntensity={scanning ? 0.85 : 0.12}
        />
      </mesh>
      {arms.map(([sx, sz], i) => (
        <group key={i} position={[sx * 0.13, 0.02, sz * 0.13]}>
          <mesh>
            <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
            <meshStandardMaterial color="#2a211b" />
          </mesh>
          <mesh
            ref={(m) => { if (m) rotors.current[i] = m; }}
            position={[0, 0.03, 0]}
          >
            <boxGeometry args={[0.15, 0.004, 0.014]} />
            <meshStandardMaterial color="#5b5148" transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** حلقات نبض تتمدد من نقطة الفحص */
function ScanPulse({ at }: { at: THREE.Vector3 }) {
  const rings = useRef<THREE.Mesh[]>([]);
  useFrame((state) => {
    rings.current.forEach((m, i) => {
      if (!m) return;
      const t = (state.clock.elapsedTime * 0.9 + i * 0.33) % 1;
      const s = 0.12 + t * 0.85;
      m.scale.set(s, s, s);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.75;
    });
  });
  return (
    <group position={[at.x, at.y + 0.012, at.z]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { if (m) rings.current[i] = m; }}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#4a2e35" transparent side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Terrain({
  grid,
  channel,
  selected,
  scanning,
  onPick,
  autoRotate,
}: {
  grid: Grid;
  channel: Channel;
  selected: Cell | null;
  scanning: boolean;
  onPick: (c: Cell) => void;
  autoRotate: boolean;
}) {
  const { camera, gl } = useThree();
  const { geo, dx, dz, planeH } = useMemo(
    () => buildGeometry(grid, channel),
    [grid, channel],
  );

  // مصدر الحقيقة لموضع الكاميرا — نحدّثه بلا re-render
  const orbit = useRef<OrbitState>({ theta: 0.5, phi: 0.92, radius: 8.2 });
  const idle = useRef(true);

  useEffect(() => {
    const el = gl.domElement;
    el.tabIndex = 0; // الخريطة يجب أن تُركّز وتُدار بالكيبورد
    return attachOrbit(el, orbit.current, DEFAULT_LIMITS, (i) => {
      idle.current = i;
    });
  }, [gl]);

  useFrame((_, dt) => {
    if (autoRotate && idle.current && !selected) {
      orbit.current.theta += dt * 0.055;
    }
    applyOrbit(camera, orbit.current);
  });

  useEffect(() => () => geo.dispose(), [geo]);

  /** نحوّل نقطة الإصابة إلى فهرس خلية */
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const col = Math.round((p.x + PLANE_W / 2) / dx);
    const row = Math.round((p.z + planeH / 2) / dz);
    const { cols, rows } = grid.header;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    if (Number.isNaN(grid.plane[channel][row * cols + col])) return; // فجوة
    const { lat, lon } = grid.latLon(col, row);
    onPick({ col, row, lat, lon });
  };

  const mark = selected
    ? cellToWorld(grid, channel, selected, dx, dz, planeH)
    : null;

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 8, 3]} intensity={1.15} />
      <directionalLight position={[-5, 3, -4]} intensity={0.32} color="#bfa06e" />

      <mesh geometry={geo} onClick={handleClick}>
        <meshStandardMaterial
          vertexColors
          roughness={0.86}
          metalness={0.04}
          side={THREE.DoubleSide}
          flatShading={false}
        />
      </mesh>

      {mark && (
        <>
          <Drone target={mark} scanning={scanning} />
          {scanning && <ScanPulse at={mark} />}
          {/* عمود ضوئي يثبّت الخلية المختارة بصرياً */}
          <mesh position={[mark.x, mark.y + 0.6, mark.z]}>
            <cylinderGeometry args={[0.012, 0.012, 1.2, 8]} />
            <meshBasicMaterial color="#4a2e35" transparent opacity={0.35} />
          </mesh>
        </>
      )}
    </>
  );
}

export default function RadiometricTerrain({
  grid,
  channel,
  selected,
  scanning,
  onPick,
}: {
  grid: Grid;
  channel: Channel;
  selected: Cell | null;
  scanning: boolean;
  onPick: (c: Cell) => void;
}) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  return (
    <Canvas
      camera={{ fov: 42, position: [0, 5, 7] }}
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      style={{ touchAction: "none" }}
    >
      <Terrain
        grid={grid}
        channel={channel}
        selected={selected}
        scanning={scanning}
        onPick={onPick}
        autoRotate={!reduced}
      />
    </Canvas>
  );
}
