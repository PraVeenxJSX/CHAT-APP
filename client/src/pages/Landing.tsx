import { useEffect, useRef, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  AnimatePresence,
  useInView,
} from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import Lenis from "lenis";
import {
  MessageSquare,
  Zap,
  Shield,
  Users,
  Mic,
  Sparkles,
  Check,
  ChevronDown,
  Send,
  Code2,
  AtSign,
  ArrowRight,
  Lock,
  Globe,
  Cpu,
} from "lucide-react";
import type { Mesh } from "three";
import * as THREE from "three";
import { companion, heroPointer, orbs, perch, nextOrbId, type OrbEntry } from "@/lib/companionState";

/* -------------------------------------------------------------------------- */
/*  3D HERO SCENE                                                             */
/* -------------------------------------------------------------------------- */

function FloatingOrb({
  position,
  color,
  speed = 1,
  scale = 1,
  distort = 0.4,
  reactivity = 1,
}: {
  position: [number, number, number];
  color: string;
  speed?: number;
  scale?: number;
  distort?: number;
  reactivity?: number;
}) {
  const ref = useRef<Mesh>(null);
  const base = useRef(new THREE.Vector3(...position));
  const current = useRef(new THREE.Vector3(...position));
  const target = useRef(new THREE.Vector3());
  const projected = useRef(new THREE.Vector3());
  const hoverRef = useRef(false);
  const popTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const [popping, setPopping] = useState(false);
  const entryRef = useRef<OrbEntry | null>(null);
  if (!entryRef.current) {
    entryRef.current = {
      id: nextOrbId(),
      color,
      scale,
      pos: { x: position[0], y: position[1], z: position[2] },
      screen: { x: -9999, y: -9999, r: 90 * scale },
      alive: true,
    };
  }

  const burstOrb = () => {
    const entry = entryRef.current!;
    if (!entry.alive) return;
    entry.alive = false;
    if (ref.current) {
      const world = ref.current.position.clone();
      window.dispatchEvent(
        new CustomEvent("orb:burst", {
          detail: {
            world: [world.x, world.y, world.z],
            color,
            id: entry.id,
            screen: { ...entry.screen },
          },
        })
      );
    }
    setPopping(true);
    if (popTimeout.current) clearTimeout(popTimeout.current);
    popTimeout.current = setTimeout(() => {
      current.current.copy(base.current);
      entry.alive = true;
      setPopping(false);
    }, 2500);
  };

  useEffect(() => {
    const entry = entryRef.current!;
    orbs.push(entry);
    const onExternalBlast = (e: Event) => {
      if ((e as CustomEvent).detail?.id === entry.id) burstOrb();
    };
    window.addEventListener("orb:blast", onExternalBlast as EventListener);
    return () => {
      window.removeEventListener("orb:blast", onExternalBlast as EventListener);
      if (popTimeout.current) clearTimeout(popTimeout.current);
      const i = orbs.indexOf(entry);
      if (i >= 0) orbs.splice(i, 1);
      if (perch.targetId === entry.id) perch.targetId = null;
    };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * 0.15 * speed;
    ref.current.rotation.y = state.clock.elapsedTime * 0.2 * speed;

    // Pointer in normalized device coords (-1..1). Convert to world-ish offset.
    const px = state.pointer.x * 3.5;
    const py = state.pointer.y * 2.2;

    const dx = base.current.x - px;
    const dy = base.current.y - py;
    const dist = Math.max(0.4, Math.sqrt(dx * dx + dy * dy));

    // Repel: stronger when close; falls off with distance.
    const repelStrength = (1.6 / dist) * reactivity;
    let ox = (dx / dist) * repelStrength;
    let oy = (dy / dist) * repelStrength;

    // Also repel from the phoenix companion (cross-canvas shared state).
    if (companion.active) {
      const bx = base.current.x - companion.x;
      const by = base.current.y - companion.y;
      const bdist = Math.max(0.5, Math.sqrt(bx * bx + by * by));
      const bStr = (2.2 / bdist) * reactivity;
      ox += (bx / bdist) * bStr;
      oy += (by / bdist) * bStr;
    }

    target.current.set(
      base.current.x + ox,
      base.current.y + oy,
      base.current.z
    );

    current.current.lerp(target.current, 0.08);
    ref.current.position.copy(current.current);

    // Publish true world/screen position for the phoenix + click hit tests.
    const entry = entryRef.current!;
    ref.current.getWorldPosition(projected.current);
    entry.pos.x = projected.current.x;
    entry.pos.y = projected.current.y;
    entry.pos.z = projected.current.z;

    // Publish live screen position so clicks/hover still work even when the
    // landing copy is visually layered above the WebGL canvas.
    projected.current.project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    entry.screen.x = rect.left + (projected.current.x * 0.5 + 0.5) * rect.width;
    entry.screen.y = rect.top + (-projected.current.y * 0.5 + 0.5) * rect.height;
    entry.screen.r = Math.max(70, scale * rect.height * 0.11);

    const pdx = entry.screen.x - heroPointer.x;
    const pdy = entry.screen.y - heroPointer.y;
    const pointerNear =
      heroPointer.active && entry.alive && Math.hypot(pdx, pdy) < entry.screen.r * 1.25;
    if (pointerNear !== hoverRef.current) {
      hoverRef.current = pointerNear;
      setHovered(pointerNear);
      document.body.style.cursor = pointerNear ? "pointer" : "";
    }

    // Scale bump on hover / pop
    const targetScale = popping ? 0.001 : hovered ? scale * 1.18 : scale;
    ref.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.12
    );
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    burstOrb();
  };

  return (
    <Float speed={2 * speed} rotationIntensity={0.6} floatIntensity={1.4}>
      <Sphere
        ref={ref}
        args={[1, 64, 64]}
        position={position}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
        onClick={handleClick}
      >
        <MeshDistortMaterial
          color={color}
          distort={hovered ? distort + 0.25 : distort}
          speed={hovered ? 5 : 2}
          roughness={0.15}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : 0.05}
        />
      </Sphere>
    </Float>
  );
}

function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, -3, 2]} intensity={2} color="#22d3ee" />
      <pointLight position={[5, 3, -2]} intensity={2} color="#a855f7" />
      <pointLight position={[0, -4, 3]} intensity={1.5} color="#ec4899" />
      <Suspense fallback={null}>
        <FloatingOrb position={[-2.5, 0.5, 0]} color="#22d3ee" scale={1.2} reactivity={1.2} />
        <FloatingOrb position={[2.6, -0.4, -1]} color="#a855f7" scale={1.4} speed={0.8} reactivity={1} />
        <FloatingOrb position={[0.2, 1.6, -2]} color="#ec4899" scale={0.9} speed={1.3} reactivity={0.8} />
        <FloatingOrb position={[-1.2, -1.8, -1.5]} color="#3b82f6" scale={0.7} speed={1.1} reactivity={0.7} />
      </Suspense>
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */
/*  ANIMATED BACKGROUND (blobs + grid + particles)                            */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  PARTICLE BURSTS (click to blast)                                          */
/* -------------------------------------------------------------------------- */

function ParticleBurstsOverlay({
  bursts,
}: {
  bursts: { id: number; x: number; y: number; color: string }[];
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {bursts.map((b) => (
        <Burst key={b.id} x={b.x} y={b.y} color={b.color} />
      ))}
    </div>
  );
}

function Burst({ x, y, color }: { x: number; y: number; color: string }) {
  const particles = Array.from({ length: 18 });
  return (
    <>
      {/* Shockwave ring */}
      <motion.span
        initial={{ opacity: 0.6, scale: 0 }}
        animate={{ opacity: 0, scale: 5 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{
          position: "fixed",
          left: x - 30,
          top: y - 30,
          width: 60,
          height: 60,
          borderRadius: "9999px",
          border: `2px solid ${color}`,
          boxShadow: `0 0 40px ${color}`,
        }}
      />
      {/* Bright core flash */}
      <motion.span
        initial={{ opacity: 0.9, scale: 0.3 }}
        animate={{ opacity: 0, scale: 2.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          position: "fixed",
          left: x - 18,
          top: y - 18,
          width: 36,
          height: 36,
          borderRadius: "9999px",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          filter: "blur(2px)",
        }}
      />
      {/* Particles */}
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const dist = 90 + Math.random() * 90;
        const size = 3 + Math.random() * 5;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: 0.4,
            }}
            transition={{ duration: 0.9 + Math.random() * 0.4, ease: "easeOut" }}
            style={{
              position: "fixed",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "9999px",
              background: color,
              boxShadow: `0 0 12px ${color}`,
            }}
          />
        );
      })}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAGNETIC BUTTON                                                           */
/* -------------------------------------------------------------------------- */

function MagneticButton({
  children,
  onClick,
  className = "",
  strength = 18,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setPos({
      x: ((e.clientX - cx) / r.width) * strength,
      y: ((e.clientY - cy) / r.height) * strength,
    });
  };
  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      onClick={onClick}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.5 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(ellipse at 80% 60%, rgba(34,211,238,0.10), transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(236,72,153,0.10), transparent 55%)",
        }}
      />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* soft blobs */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-cyan-500/25 blur-[120px] animate-pulse-slow" />
      <div className="absolute top-1/3 -right-24 h-[520px] w-[520px] rounded-full bg-purple-500/20 blur-[140px] animate-pulse-slower" />
      <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-pink-500/15 blur-[120px] animate-pulse-slow" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MOUSE-TRACKING SPOTLIGHT                                                  */
/* -------------------------------------------------------------------------- */

function Spotlight() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  useEffect(() => {
    const on = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", on);
    return () => window.removeEventListener("mousemove", on);
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
      style={{
        background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(139,92,246,0.10), transparent 60%)`,
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  LOADING SCREEN                                                            */
/* -------------------------------------------------------------------------- */

function IntroLoader({ done }: { done: boolean }) {
  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06060a]"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, filter: "blur(20px)" }}
            animate={{
              scale: [0.6, 1.05, 1],
              opacity: 1,
              filter: "blur(0px)",
            }}
            transition={{ duration: 1.4, times: [0, 0.6, 1], ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500 blur-xl opacity-70" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500 shadow-2xl">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-white">
              Nexus
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  NAV                                                                       */
/* -------------------------------------------------------------------------- */

function Nav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    ["Features", "#features"],
    ["Security", "#security"],
    ["Groups", "#groups"],
    ["Pricing", "#pricing"],
    ["FAQ", "#faq"],
  ] as const;
  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <div
          className={`flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5 transition-all duration-500 ${
            scrolled
              ? "bg-black/60 backdrop-blur-xl shadow-[0_8px_40px_-8px_rgba(139,92,246,0.4)]"
              : "bg-white/[0.03] backdrop-blur-md"
          }`}
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Nexus
            </span>
          </button>
          <nav className="hidden items-center gap-6 md:flex">
            {links.map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-sm text-white/70 transition hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="hidden rounded-full px-4 py-1.5 text-sm text-white/80 transition hover:text-white md:inline-flex"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/register")}
              className="group relative inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/* -------------------------------------------------------------------------- */
/*  HERO                                                                      */
/* -------------------------------------------------------------------------- */

function Hero() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [bursts, setBursts] = useState<
    { id: number; x: number; y: number; color: string }[]
  >([]);

  // Listen for orb clicks (dispatched from 3D scene) — spawn a burst near
  // the cursor, since we don't reproject world→screen here.
  useEffect(() => {
    const lastPointer = { x: 0, y: 0 };
    const track = (e: PointerEvent) => {
      lastPointer.x = e.clientX;
      lastPointer.y = e.clientY;
      heroPointer.x = e.clientX;
      heroPointer.y = e.clientY;
      heroPointer.active = true;
    };
    const leave = () => {
      heroPointer.active = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", track);
    window.addEventListener("pointerleave", leave);
    const onBurst = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        color?: string;
        screen?: { x: number; y: number };
      };
      const id = Date.now() + Math.random();
      setBursts((b) => [
        ...b,
        {
          id,
          x: detail?.screen?.x ?? lastPointer.x,
          y: detail?.screen?.y ?? lastPointer.y,
          color: detail?.color || "#a855f7",
        },
      ]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
    };
    window.addEventListener("orb:burst", onBurst as EventListener);
    return () => {
      window.removeEventListener("pointermove", track);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("orb:burst", onBurst as EventListener);
      leave();
    };
  }, []);

  // Any press close to a visible bubble blasts that exact bubble, even when
  // the hero copy is layered over the WebGL canvas.
  const handleHeroPress = (e: React.PointerEvent) => {
    // Only fire when the click landed on the hero background (not on a button).
    if ((e.target as HTMLElement).closest("button, a")) return;
    const nearest = orbs
      .filter((o) => o.alive && o.screen.x > -1000 && o.screen.y > -1000)
      .map((o) => ({ orb: o, d: Math.hypot(o.screen.x - e.clientX, o.screen.y - e.clientY) }))
      .sort((a, b) => a.d - b.d)[0];
    if (nearest && nearest.d < Math.max(220, nearest.orb.screen.r * 2.1)) {
      window.dispatchEvent(new CustomEvent("orb:blast", { detail: { id: nearest.orb.id } }));
      return;
    }
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);

  return (
    <section
      ref={ref}
      onPointerDown={handleHeroPress}
      className="relative flex min-h-[100svh] cursor-crosshair items-center justify-center overflow-hidden pt-24"
    >
      {/* 3D canvas — pointer-events auto so orbs can be hovered & clicked */}
      <div className="absolute inset-0 z-0 opacity-90">
        <HeroScene />
      </div>

      {/* Particle bursts layer */}
      <ParticleBurstsOverlay bursts={bursts} />

      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70 backdrop-blur-md"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Real-time messaging, reimagined
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-7xl"
        >
          The chat platform that
          <br className="hidden sm:block" />
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              <span id="companion-anchor">feels</span> alive.
            </span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.75, duration: 0.7 }}
          className="mt-6 max-w-xl text-base text-white/60 md:text-lg"
        >
          Blazing-fast group chats, silky voice, and AI that helps you write.
          Built for the way modern teams and friends talk today.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.95, duration: 0.7 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <MagneticButton
            onClick={() => navigate("/register")}
            className="group relative overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-semibold text-black shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              Start chatting free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </MagneticButton>
          <a
            href="#features"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm text-white/80 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.06]"
          >
            See what's inside
            <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.3, duration: 1 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-xs text-white/40 sm:mt-14"
        >
          <span className="w-full sm:w-auto">Trusted by early teams at</span>
          <span className="tracking-widest">◇ ORBIT</span>
          <span className="tracking-widest">△ HELIX</span>
          <span className="tracking-widest">◎ NOVA</span>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 1 }}
        className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-9 w-6 items-start justify-center rounded-full border border-white/20 p-1"
        >
          <span className="h-2 w-1 rounded-full bg-white/70" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  SECTION HEADER + REVEAL                                                   */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60 backdrop-blur-md">
          {eyebrow}
        </span>
      </Reveal>
      <Reveal delay={0.1}>
        <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h2>
      </Reveal>
      {desc ? (
        <Reveal delay={0.2}>
          <p className="mt-4 text-white/60">{desc}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y: 24, filter: "blur(6px)" }
      }
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_30px_80px_-30px_rgba(0,0,0,0.6)] ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FEATURES                                                                  */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  {
    icon: Zap,
    title: "Instant delivery",
    desc: "Sub-100ms message delivery across the world with WebSocket-first architecture.",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    icon: Sparkles,
    title: "AI suggestions",
    desc: "Smart reply drafts, tone shifts, and summaries — right in the compose box.",
    accent: "from-fuchsia-400 to-pink-500",
  },
  {
    icon: Mic,
    title: "Voice notes",
    desc: "Rich audio waveforms, seek scrubbing, and low-latency playback.",
    accent: "from-emerald-400 to-teal-500",
  },
  {
    icon: Users,
    title: "Groups & channels",
    desc: "Organize with roles, mentions, threads, and pinned messages.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    icon: Shield,
    title: "Secure by default",
    desc: "Encrypted transport, JWT sessions, and per-user rate limits baked in.",
    accent: "from-violet-400 to-indigo-500",
  },
  {
    icon: Globe,
    title: "Works anywhere",
    desc: "Snappy on mobile, tablet, and desktop with adaptive layouts.",
    accent: "from-rose-400 to-red-500",
  },
];

function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-24 md:py-32">
      <div data-companion-perch>
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to talk, faster."
          desc="A curated set of primitives that feels obvious the moment you use it."
        />
      </div>
      <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.05}>
            <GlassCard className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05]">
              <div
                className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${f.accent} shadow-lg`}
              >
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {f.desc}
              </p>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  LIVE DEMO — animated fake chat                                            */
/* -------------------------------------------------------------------------- */

const DEMO_MESSAGES: {
  from: "them" | "you";
  name?: string;
  text: string;
  time: string;
}[] = [
  { from: "them", name: "Aria", text: "yo the launch deck is 🔥", time: "10:41" },
  { from: "you", text: "gonna push v2 in an hour", time: "10:41" },
  { from: "them", name: "Aria", text: "typing indicators pls", time: "10:42" },
  { from: "you", text: "already shipped ⚡", time: "10:42" },
  { from: "them", name: "Aria", text: "you're a menace ❤️", time: "10:43" },
];

function LiveDemo() {
  const [visible, setVisible] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    setVisible(0);
    let stopped = false;
    const step = () => {
      if (stopped) return;
      setTyping(true);
      setTimeout(() => {
        if (stopped) return;
        setTyping(false);
        i += 1;
        setVisible(i);
        if (i < DEMO_MESSAGES.length) {
          setTimeout(step, 1200);
        }
      }, 700);
    };
    const t = setTimeout(step, 400);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [inView]);

  return (
    <section className="relative py-20 sm:py-24 md:py-32">
      <div data-companion-perch>
        <SectionHeader
          eyebrow="Live demo"
          title="Feels instant. Because it is."
          desc="Real presence, typing indicators, read receipts — no page reloads, ever."
        />
      </div>
      <div ref={ref} className="mx-auto mt-16 max-w-3xl px-4">
        <Reveal>
          <GlassCard className="p-3 sm:p-5">
            <div className="flex items-center justify-between px-2 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-500 text-sm font-semibold text-white">
                    A
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black bg-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Aria Chen</div>
                  <div className="text-xs text-white/50">
                    {typing ? (
                      <span className="inline-flex items-center gap-1">
                        typing
                        <span className="inline-flex gap-0.5">
                          <span className="h-1 w-1 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
                          <span className="h-1 w-1 animate-bounce rounded-full bg-white/60" />
                        </span>
                      </span>
                    ) : (
                      "online"
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
              </div>
            </div>

            <div className="relative h-[380px] space-y-3 overflow-hidden rounded-2xl bg-black/40 p-4">
              {DEMO_MESSAGES.slice(0, visible).map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`flex ${
                    m.from === "you" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.from === "you"
                        ? "bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-white shadow-[0_8px_30px_-10px_rgba(139,92,246,0.6)]"
                        : "border border-white/10 bg-white/[0.04] text-white/90"
                    }`}
                  >
                    {m.text}
                    <div
                      className={`mt-0.5 text-[10px] ${
                        m.from === "you" ? "text-white/70" : "text-white/40"
                      }`}
                    >
                      {m.time} {m.from === "you" && "✓✓"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  SECURITY / GROUPS / VOICE                                                 */
/* -------------------------------------------------------------------------- */

function TripletSection() {
  return (
    <>
      <section id="security" className="relative py-20 sm:py-24 md:py-32">
        <div data-companion-perch className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                Security
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
                Private conversations,
                <br />
                by design.
              </h2>
              <p className="mt-4 max-w-md text-white/60">
                Encrypted transport, hardened JWT sessions, and least-privilege
                access. Your data lives where you deploy it — never mined,
                never sold.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "TLS everywhere",
                  "Signed JWT sessions with rotation",
                  "Per-user rate limits & abuse controls",
                  "Bring-your-own infra",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-white/80">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="aspect-square p-6 sm:p-8 sm:max-w-sm sm:mx-auto">
              <div className="flex h-full flex-col items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 opacity-40 blur-3xl" />
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                    <Lock className="h-16 w-16 text-white/90" />
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[Cpu, Shield, Globe].map((Icon, i) => (
                    <div
                      key={i}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md"
                    >
                      <Icon className="h-5 w-5 text-white/80" />
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>

      <section id="groups" className="relative py-20 sm:py-24 md:py-32">
        <div data-companion-perch className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2">
          <Reveal>
            <GlassCard className="p-6">
              <div className="space-y-3">
                {["#launch", "#design-critique", "#random"].map((c, i) => (
                  <div
                    key={c}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      i === 0
                        ? "border-fuchsia-400/40 bg-fuchsia-500/10"
                        : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm text-white/80">
                      {c[1]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{c}</div>
                      <div className="text-xs text-white/50">
                        {i === 0
                          ? "12 online · Aria is typing…"
                          : "4 unread messages"}
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="rounded-full bg-fuchsia-400 px-2 py-0.5 text-[10px] font-semibold text-black">
                        12
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                Groups
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
                Communities that
                <br />
                actually feel alive.
              </h2>
              <p className="mt-4 max-w-md text-white/60">
                Create channels, invite friends, and manage roles. Presence,
                reactions, and threads keep every conversation in flow.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative py-20 sm:py-24 md:py-32">
        <div data-companion-perch className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
                Voice ready
              </span>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
                Say it with your voice.
              </h2>
              <p className="mt-4 max-w-md text-white/60">
                Send crisp voice notes with visual waveforms, seek anywhere,
                and never miss the tone.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <GlassCard className="p-6 sm:p-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <button className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg">
                  <Mic className="h-5 w-5 text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-end gap-0.5 sm:gap-1 overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <motion.span
                        key={i}
                        animate={{
                          height: [
                            `${20 + Math.random() * 40}%`,
                            `${20 + Math.random() * 80}%`,
                            `${20 + Math.random() * 40}%`,
                          ],
                        }}
                        transition={{
                          duration: 1.4 + (i % 3) * 0.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: i * 0.03,
                        }}
                        className="block w-1 flex-1 rounded-full bg-gradient-to-t from-cyan-400 to-fuchsia-500"
                        style={{ height: "40%" }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-white/50">
                    <span>0:04</span>
                    <span>0:12</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  TESTIMONIALS                                                              */
/* -------------------------------------------------------------------------- */

const TESTIMONIALS = [
  {
    quote:
      "Nexus made our team chat feel calm again. Threads, groups, presence — it just works.",
    name: "Jordan Rae",
    role: "PM · Helix Labs",
  },
  {
    quote:
      "The animations aren't gimmicks — the whole thing feels intentional.",
    name: "Priya S.",
    role: "Design lead · Orbit",
  },
  {
    quote: "We replaced three tools with Nexus. Speed is the killer feature.",
    name: "M. Alvarez",
    role: "Founder · Nova",
  },
  {
    quote: "Voice notes with waveforms is the small thing that made me switch.",
    name: "Kai N.",
    role: "Engineer",
  },
];

function Testimonials() {
  return (
    <section className="relative py-20 sm:py-24 md:py-32">
      <SectionHeader eyebrow="Loved by early users" title="Words we didn't write." />
      <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 px-4 md:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.05}>
            <GlassCard className="p-6">
              <p className="text-lg leading-relaxed text-white/90">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-xs font-semibold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-white/50">{t.role}</div>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  PRICING                                                                   */
/* -------------------------------------------------------------------------- */

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tag: "For getting started",
    features: ["Unlimited 1:1 chat", "Up to 3 groups", "Voice notes up to 1 min", "Basic AI replies"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$8",
    period: "/ month",
    tag: "For real conversations",
    features: [
      "Unlimited groups",
      "Voice notes up to 15 min",
      "Advanced AI writing tools",
      "Custom themes",
      "Priority delivery",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Team",
    price: "$18",
    period: "/ seat / mo",
    tag: "For serious teams",
    features: [
      "Everything in Pro",
      "Admin roles & SSO",
      "Audit logs",
      "SLA & priority support",
    ],
    cta: "Contact sales",
    highlight: false,
  },
];

function Pricing() {
  const navigate = useNavigate();
  return (
    <section id="pricing" className="relative py-20 sm:py-24 md:py-32">
      <SectionHeader
        eyebrow="Pricing"
        title="Simple plans. Real value."
        desc="Start free. Upgrade only when you outgrow it."
      />
      <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-4 px-4 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.05}>
            <GlassCard
              className={`h-full p-6 ${
                p.highlight
                  ? "border-fuchsia-400/40 shadow-[0_30px_120px_-30px_rgba(217,70,239,0.5)]"
                  : ""
              }`}
            >
              {p.highlight && (
                <span className="mb-3 inline-flex rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-black">
                  Most popular
                </span>
              )}
              <div className="text-sm text-white/60">{p.tag}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-white">
                  {p.price}
                </span>
                <span className="text-sm text-white/50">{p.period}</span>
              </div>
              <div className="mt-1 text-lg font-medium text-white">{p.name}</div>

              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-white/75"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/register")}
                className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition ${
                  p.highlight
                    ? "bg-white text-black hover:bg-white/90"
                    : "border border-white/15 bg-white/[0.03] text-white hover:bg-white/[0.08]"
                }`}
              >
                {p.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                       */
/* -------------------------------------------------------------------------- */

const FAQ = [
  {
    q: "Is Nexus really free to start?",
    a: "Yes. The Free plan covers everything you need for personal use — no card required.",
  },
  {
    q: "Can I run it on my own server?",
    a: "Nexus is built on a standard MERN stack. You can self-host the backend and point the app at your own API.",
  },
  {
    q: "Do you have mobile apps?",
    a: "The web app is fully responsive today. Native mobile apps are on the roadmap.",
  },
  {
    q: "What about my data?",
    a: "Your data lives where you deploy it. We never mine or sell messages. Transport is encrypted end to end.",
  },
  {
    q: "Can I invite my whole team?",
    a: "Yes — Team plan supports SSO, roles, and audit logs for organizations of any size.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-20 sm:py-24 md:py-32">
      <SectionHeader eyebrow="FAQ" title="Questions, answered." />
      <div className="mx-auto mt-12 max-w-3xl space-y-3 px-4">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={item.q} delay={i * 0.04}>
              <GlassCard>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-base font-medium text-white">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 flex-none text-white/60 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-sm leading-relaxed text-white/70">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  CTA + FOOTER                                                              */
/* -------------------------------------------------------------------------- */

function CTA() {
  const navigate = useNavigate();
  return (
    <section className="relative py-20 sm:py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4">
        <Reveal>
            <GlassCard className="relative overflow-hidden p-6 text-center sm:p-10 md:p-16">
            <div
              aria-hidden
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.25), transparent 45%), radial-gradient(circle at 80% 30%, rgba(217,70,239,0.25), transparent 45%), radial-gradient(circle at 50% 90%, rgba(236,72,153,0.25), transparent 55%)",
              }}
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
                Ready to talk in a
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  better way?
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/60">
                Sign up in under 30 seconds. Bring your friends.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/register")}
                  className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
                >
                  Create your account
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-sm text-white/85 backdrop-blur-md hover:bg-white/[0.06]"
                >
                  I already have one
                </button>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 md:grid-cols-4">
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-pink-500">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold text-white">Nexus</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/50">
            Real-time chat, beautifully built. Fast, private, and delightful.
          </p>
          <div className="mt-5 flex gap-3">
            {[AtSign, Code2, Send].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          {
            title: "Product",
            links: ["Features", "Pricing", "Changelog", "Roadmap"],
          },
          {
            title: "Company",
            links: ["About", "Blog", "Contact", "Privacy"],
          },
        ].map((col) => (
          <div key={col.title}>
            <div className="text-xs uppercase tracking-widest text-white/40">
              {col.title}
            </div>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-sm text-white/70 transition hover:text-white"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between px-4 text-xs text-white/40">
        <span>© {new Date().getFullYear()} Nexus Chat. All rights reserved.</span>
        <span>Crafted with care.</span>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  SCROLL PROGRESS                                                           */
/* -------------------------------------------------------------------------- */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  ROOT                                                                      */
/* -------------------------------------------------------------------------- */

export default function Landing() {
  const [loaded, setLoaded] = useState(false);

  // Smooth scroll (Lenis) + intro loader
  // On touch / mobile we leave native scrolling to avoid input conflicts.
  useEffect(() => {
    const isCoarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (!isCoarse) {
      const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      let raf = 0;
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
        lenis.destroy();
      };
    }
  }, []);

  // Loader reveal — independent of scroll lib so it always fires
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <main
      className="relative min-h-[100svh] w-full bg-[#06060a] text-white antialiased"
      style={{
        fontFamily:
          '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        WebkitOverflowScrolling: "touch",
      }}
    >
      <IntroLoader done={loaded} />
      <AmbientBackground />
      <Spotlight />
      <ScrollProgress />
      <Nav />
      <Hero />
      <Features />
      <LiveDemo />
      <TripletSection />
      <Testimonials />
      <Pricing />
      <FaqSection />
      <CTA />
      <Footer />
    </main>
  );
}