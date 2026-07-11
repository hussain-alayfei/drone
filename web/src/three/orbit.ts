/**
 * تحكّم مداري خفيف — بديل مقصود عن @react-three/drei.
 * المشروع كله procedural بلا اعتماديات ثقيلة (انظر BulletScene.tsx)،
 * وسحب drei كاملة من أجل OrbitControls وحدها يضخّم حزمة three بلا داعٍ.
 *
 * يعمل بالفأرة واللمس والكيبورد، ولا يعيد render أبداً — يحدّث الكاميرا
 * مباشرة داخل حلقة الرسم.
 */
import * as THREE from "three";

export interface OrbitState {
  /** زاوية أفقية (راديان) */
  theta: number;
  /** زاوية رأسية (راديان) — مقيّدة كي لا تنقلب الكاميرا */
  phi: number;
  /** بُعد الكاميرا عن المركز */
  radius: number;
}

export interface OrbitLimits {
  minPhi: number;
  maxPhi: number;
  minRadius: number;
  maxRadius: number;
}

export const DEFAULT_LIMITS: OrbitLimits = {
  minPhi: 0.18,          // لا ننزل للأفق تماماً
  maxPhi: Math.PI / 2.15, // ولا نصل للعمود الرأسي
  minRadius: 3.2,
  maxRadius: 14,
};

/** يضع الكاميرا على الكرة المدارية حول المركز */
export function applyOrbit(
  camera: THREE.Camera,
  s: OrbitState,
  target = new THREE.Vector3(0, 0, 0),
): void {
  camera.position.set(
    target.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta),
    target.y + s.radius * Math.cos(s.phi),
    target.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta),
  );
  camera.lookAt(target);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * يربط مستمعي الإدخال بعنصر DOM ويحدّث `state` في مكانه.
 * يعيد دالة تنظيف.
 *
 * `onIdleChange` تخبر المشهد متى يوقف الدوران التلقائي (أثناء تفاعل المستخدم).
 */
export function attachOrbit(
  el: HTMLElement,
  state: OrbitState,
  limits: OrbitLimits = DEFAULT_LIMITS,
  onIdleChange?: (idle: boolean) => void,
): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  // مسافة الإصبعين في إيماءة التقريب باللمس
  let pinch = 0;

  const setIdle = (idle: boolean) => onIdleChange?.(idle);

  const rotate = (dx: number, dy: number) => {
    state.theta -= dx * 0.005;
    state.phi = clamp(state.phi - dy * 0.005, limits.minPhi, limits.maxPhi);
  };

  const zoom = (delta: number) => {
    state.radius = clamp(
      state.radius * (1 + delta * 0.0012),
      limits.minRadius,
      limits.maxRadius,
    );
  };

  // ---- فأرة ----
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    setIdle(false);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    rotate(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    setIdle(false);
    zoom(e.deltaY);
  };

  // ---- لمس (تقريب بإصبعين) ----
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      pinch = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    );
    if (pinch) zoom((pinch - d) * 2);
    pinch = d;
  };

  // ---- كيبورد: الخريطة يجب أن تبقى قابلة للتشغيل بلا فأرة ----
  const onKeyDown = (e: KeyboardEvent) => {
    const step = 18;
    switch (e.key) {
      case "ArrowLeft":  rotate(-step, 0); break;
      case "ArrowRight": rotate(step, 0); break;
      case "ArrowUp":    rotate(0, -step); break;
      case "ArrowDown":  rotate(0, step); break;
      case "+": case "=": zoom(-120); break;
      case "-": case "_": zoom(120); break;
      default: return;
    }
    e.preventDefault();
    setIdle(false);
  };

  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerUp);
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("touchstart", onTouchStart, { passive: true });
  el.addEventListener("touchmove", onTouchMove, { passive: false });
  el.addEventListener("keydown", onKeyDown);

  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("keydown", onKeyDown);
  };
}
