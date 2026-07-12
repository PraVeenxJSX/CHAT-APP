import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import modelAsset from "@/assets/phoenix_bird.glb.asset.json";
import { companion, orbs, perch } from "@/lib/companionState";

/**
 * Hero-only phoenix. Sits beside the bubbles, gently floats, and reacts to
 * the pointer. It fades out once the user scrolls past the hero so it never
 * appears on other sections. No trail, no scroll-driven flight path.
 */

const MODEL_URL = modelAsset.url;
useGLTF.preload(MODEL_URL);

const shared = {
  mouse: { x: 0.5, y: 0.5 },
  smoothedMouse: { x: 0.5, y: 0.5 },
};

function Phoenix() {
  const gltf = useGLTF(MODEL_URL) as any;
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const posCurr = useRef(new THREE.Vector3());
  const facingRef = useRef(0);
  const perchOffset = useRef(new THREE.Vector3(0, 1.4, 0.4));

  const isVisibleOrb = (orb: (typeof orbs)[number]) => {
    if (typeof window === "undefined") return true;
    return (
      orb.screen.x > 170 &&
      orb.screen.x < window.innerWidth - 170 &&
      orb.screen.y > 115 &&
      orb.screen.y < window.innerHeight * 0.72
    );
  };

  const setPerch = (orb: (typeof orbs)[number]) => {
    perch.targetId = orb.id;
    const side = typeof window !== "undefined" && orb.screen.x < window.innerWidth / 2 ? 1 : -1;
    const topCrowded = typeof window !== "undefined" && orb.screen.y < window.innerHeight * 0.22;
    perchOffset.current.set(
      side * (0.22 + Math.random() * 0.18),
      topCrowded ? -(orb.scale * 0.28 + 0.12) : orb.scale * 0.55 + 0.28,
      0.35 + Math.random() * 0.35
    );
  };

  const pickOrb = (excludeIds: number[] = []) => {
    const alive = orbs.filter((o) => o.alive && !excludeIds.includes(o.id));
    const visible = alive.filter(isVisibleOrb);
    const pool = visible.length ? visible : alive;
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };

  const model = useMemo(() => {
    if (!gltf?.scene) return null;
    const cloned = cloneSkeleton(gltf.scene);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const fitScale = 2.1 / Math.max(size.x, size.y, size.z);
    cloned.scale.setScalar(fitScale);
    cloned.position.set(-center.x * fitScale, -center.y * fitScale, -center.z * fitScale);
    // Face the camera (front side visible). Original model faces +X, so
    // rotate +Y by +π/2 to bring the front toward the viewer.
    cloned.rotation.set(-0.05, Math.PI / 2, 0);
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m: any) => {
          if (!m) return;
          m.side = THREE.DoubleSide;
          m.transparent = false;
          m.opacity = 1;
          m.toneMapped = false;
          m.needsUpdate = true;
        });
      }
    });
    return cloned;
  }, [gltf]);

  useEffect(() => {
    if (!model || !gltf.animations?.length) return;
    mixerRef.current = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip: THREE.AnimationClip) => {
      mixerRef.current?.clipAction(clip).play();
    });
    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
    };
  }, [gltf, model]);

  // When a bubble bursts, hop to another alive bubble. Also grab a random
  // perch offset each time so the bird doesn't sit in an identical pose.
  useEffect(() => {
    const pickNew = (excludeIds: number[] = []) => {
      const next = pickOrb(excludeIds) || pickOrb();
      if (!next) {
        perch.targetId = null;
        return;
      }
      setPerch(next);
    };
    const onBurst = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number | undefined;
      pickNew([...(id != null ? [id] : []), ...(perch.targetId != null ? [perch.targetId] : [])]);
    };
    window.addEventListener("orb:burst", onBurst);
    return () => window.removeEventListener("orb:burst", onBurst);
  }, []);

  useFrame((state, dt) => {
    if (!group.current) return;
    mixerRef.current?.update(dt);
    const t = state.clock.elapsedTime;

    // Smooth pointer
    const k = 1 - Math.pow(0.001, dt);
    shared.smoothedMouse.x += (shared.mouse.x - shared.smoothedMouse.x) * k * 0.35;
    shared.smoothedMouse.y += (shared.mouse.y - shared.smoothedMouse.y) * k * 0.35;

    // Find the perched bubble. If none / dead, fall back to any alive orb.
    let orb = orbs.find((o) => o.id === perch.targetId && o.alive);
    if (!orb || !isVisibleOrb(orb)) {
      const next = pickOrb(orb ? [orb.id] : []);
      if (next) {
        setPerch(next);
        orb = next;
      }
    }

    // Subtle idle sway on top of the bubble.
    const swayX = Math.sin(t * 0.9) * 0.08;
    const swayY = Math.sin(t * 1.4) * 0.06;
    // Tiny pointer influence so it still feels reactive while perched.
    const mx = (shared.smoothedMouse.x - 0.5) * 0.5;
    const my = -(shared.smoothedMouse.y - 0.5) * 0.35;

    const goalX = (orb ? orb.pos.x : 0) + perchOffset.current.x + swayX + mx;
    const goalY = (orb ? orb.pos.y : 0) + perchOffset.current.y + swayY + my;
    const goalZ = (orb ? orb.pos.z : 0) + perchOffset.current.z;

    const follow = 1 - Math.pow(0.002, dt);
    posCurr.current.x += (goalX - posCurr.current.x) * follow * 0.55;
    posCurr.current.y += (goalY - posCurr.current.y) * follow * 0.55;
    posCurr.current.z += (goalZ - posCurr.current.z) * follow * 0.55;
    // Never drift below the scroll indicator at the bottom of the hero.
    const minY = -(0.68 - 0.5) * viewport.height;
    const maxY = (0.5 - 0.05) * viewport.height;
    if (posCurr.current.y < minY) posCurr.current.y = minY;
    if (posCurr.current.y > maxY) posCurr.current.y = maxY;
    const minX = -viewport.width * 0.5 + 1.65;
    const maxX = viewport.width * 0.5 - 1.65;
    if (posCurr.current.x < minX) posCurr.current.x = minX;
    if (posCurr.current.x > maxX) posCurr.current.x = maxX;
    group.current.position.copy(posCurr.current);

    // Publish position so bubbles can react.
    companion.x = posCurr.current.x;
    companion.y = posCurr.current.y;
    companion.z = posCurr.current.z;
    companion.active = true;

    // Face travel direction
    const dxv = goalX - posCurr.current.x;
    const targetYaw = THREE.MathUtils.clamp(dxv * 0.6, -0.9, 0.9);
    facingRef.current += (targetYaw - facingRef.current) * Math.min(1, dt * 2.5);
    group.current.rotation.y = facingRef.current + Math.sin(t * 0.7) * 0.08;
    group.current.rotation.z = Math.sin(t * 0.9) * 0.06;
    group.current.rotation.x = Math.sin(t * 0.6) * 0.05 - (shared.smoothedMouse.y - 0.5) * 0.3;

    const breathe = 1 + Math.sin(t * 1.6) * 0.03;
    group.current.scale.setScalar(breathe);
  });

  if (!model) return null;
  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.6} />
      <hemisphereLight args={["#ffffff", "#334155", 1.1]} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-6, -2, 3]} intensity={0.4} color="#ffffff" />
      <Suspense fallback={null}>
        <Phoenix />
      </Suspense>
    </>
  );
}

export default function LandingCompanion() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      shared.mouse.x = e.clientX / window.innerWidth;
      shared.mouse.y = e.clientY / window.innerHeight;
    };
    const onScroll = () => {
      // Only show while the hero (first viewport) is in view.
      setVisible(window.scrollY < window.innerHeight * 0.85);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const t = setTimeout(() => setReady(true), 200);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0"
      style={{
        height: "100vh",
        zIndex: 8,
        opacity: ready && visible ? 1 : 0,
        transition: "opacity 600ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 6], fov: 42 }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}