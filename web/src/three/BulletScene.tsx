/**
 * مشهد الرصاصة الزراعية — procedural بالكامل (بدون ملفات نماذج خارجية).
 * يقاد بالسكرول عبر progressRef (بدون إعادة render لكل حركة):
 *   0.00–0.30  الرصاصة كاملة تدور ببطء
 *   0.30–0.60  القشرة تنفصل نصفين وتنكشف الطبقات (exploded)
 *   0.60–0.85  ثبات العرض المفكك
 *   0.85–1.00  إعادة التجميع والغرس في التربة مع إنبات ورقة
 */
import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLORS = {
  shell: "#C8A97E",
  shellInner: "#B08F63",
  clay: "#6B4F3A",
  seed: "#8B5A3C",
  boost: "#BFA06E",
  soil: "#3E2F26",
  leaf: "#4A7C3F",
};

/** مقطع القشرة — شكل الرصاصة من العرض التقديمي */
function shellProfile(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  // من القمة إلى القاعدة (lathe حول محور Y)
  pts.push(new THREE.Vector2(0.02, 1.7));
  pts.push(new THREE.Vector2(0.3, 1.45));
  pts.push(new THREE.Vector2(0.62, 1.05));
  pts.push(new THREE.Vector2(0.85, 0.55));
  pts.push(new THREE.Vector2(0.97, 0.0));
  pts.push(new THREE.Vector2(1.0, -0.55));
  pts.push(new THREE.Vector2(0.97, -1.1));
  pts.push(new THREE.Vector2(0.88, -1.35));
  pts.push(new THREE.Vector2(0.55, -1.48));
  pts.push(new THREE.Vector2(0.0, -1.5));
  return pts;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v); // smoothstep

function BulletRig({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const root = useRef<THREE.Group>(null!);
  const halfR = useRef<THREE.Group>(null!);
  const halfL = useRef<THREE.Group>(null!);
  const clay = useRef<THREE.Mesh>(null!);
  const seed = useRef<THREE.Mesh>(null!);
  const boosts = useRef<THREE.Group>(null!);
  const sprout = useRef<THREE.Group>(null!);
  const soil = useRef<THREE.Mesh>(null!);

  const latheGeo = useMemo(() => {
    const profile = shellProfile();
    return new THREE.LatheGeometry(profile, 48, 0, Math.PI);
  }, []);

  const boostPositions = useMemo(() => {
    const rnd = (seed0: number) => {
      // مولّد حتمي ثابت بين الجلسات
      let s = seed0;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
    const r = rnd(1234);
    return Array.from({ length: 26 }, () => {
      const ang = r() * Math.PI * 2;
      const rad = 0.3 + r() * 0.45;
      const y = -1.1 + r() * 1.9;
      return [Math.cos(ang) * rad, y, Math.sin(ang) * rad] as const;
    });
  }, []);

  useFrame((state, delta) => {
    const p = progressRef.current;

    // مراحل
    const explode = smooth(clamp01((p - 0.3) / 0.3)) * smooth(clamp01((0.97 - p) / 0.12));
    const plant = smooth(clamp01((p - 0.85) / 0.15));

    // دوران مستمر هادئ يتباطأ عند الغرس
    root.current.rotation.y += delta * 0.35 * (1 - plant);
    root.current.rotation.z = THREE.MathUtils.lerp(0.28, 0, plant);

    // انفصال نصفي القشرة
    halfR.current.position.x = 1.55 * explode;
    halfL.current.position.x = -1.55 * explode;

    // الطبقات الداخلية
    clay.current.position.z = -0.95 * explode;
    seed.current.position.z = 0.85 * explode;
    boosts.current.scale.setScalar(1 + 0.55 * explode);

    // الغرس: نزول الرصاصة وظهور التربة والورقة
    root.current.position.y = -1.15 * plant;
    soil.current.position.y = -2.4 + 0.55 * plant;
    (soil.current.material as THREE.MeshStandardMaterial).opacity = plant;
    sprout.current.scale.setScalar(plant);
    sprout.current.position.y = -0.3 + 2.6 * plant;

    // تنفس خفيف للكاميرا
    state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    state.camera.lookAt(0, -0.2, 0);
  });

  const matShell = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: COLORS.shell,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [],
  );

  return (
    <group>
      <group ref={root}>
        {/* نصفا القشرة */}
        <group ref={halfR}>
          <mesh geometry={latheGeo} material={matShell} />
        </group>
        <group ref={halfL} rotation={[0, Math.PI, 0]}>
          <mesh geometry={latheGeo} material={matShell} />
        </group>

        {/* الطين الزراعي */}
        <mesh ref={clay}>
          <cylinderGeometry args={[0.62, 0.68, 1.9, 24]} />
          <meshStandardMaterial color={COLORS.clay} roughness={1} />
        </mesh>

        {/* البذرة */}
        <mesh ref={seed} scale={[0.42, 0.62, 0.42]}>
          <sphereGeometry args={[1, 24, 20]} />
          <meshStandardMaterial color={COLORS.seed} roughness={0.85} />
        </mesh>

        {/* محفزات النمو */}
        <group ref={boosts}>
          {boostPositions.map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color={COLORS.boost} roughness={0.7} />
            </mesh>
          ))}
        </group>
      </group>

      {/* كومة التربة */}
      <mesh ref={soil} position={[0, -2.4, 0]}>
        <coneGeometry args={[2.6, 1.1, 32]} />
        <meshStandardMaterial color={COLORS.soil} roughness={1} transparent opacity={0} />
      </mesh>

      {/* الورقة النابتة */}
      <group ref={sprout} position={[0, -0.3, 0]} scale={0}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={COLORS.leaf} roughness={0.8} />
        </mesh>
        <mesh position={[0.22, 0.48, 0]} rotation={[0, 0, -0.7]} scale={[0.3, 0.14, 0.06]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={COLORS.leaf} roughness={0.8} />
        </mesh>
        <mesh position={[-0.22, 0.55, 0]} rotation={[0, 0, 0.7]} scale={[0.32, 0.15, 0.06]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={COLORS.leaf} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

export default function BulletScene({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.2], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.85} color="#FFF6E8" />
      <directionalLight position={[4, 6, 5]} intensity={1.15} color="#FFEFD8" />
      <directionalLight position={[-5, -2, -4]} intensity={0.35} color="#DFF0E2" />
      <BulletRig progressRef={progressRef} />
    </Canvas>
  );
}
