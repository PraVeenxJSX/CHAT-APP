import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Shield, Sparkles, Zap } from "lucide-react";

type Props = {
  children: React.ReactNode;
  mode: "login" | "register";
};

const highlights = [
  { icon: Shield, title: "End-to-end secured", desc: "Your conversations, encrypted by default." },
  { icon: Zap, title: "Realtime, everywhere", desc: "Sub-100ms delivery across devices." },
  { icon: Sparkles, title: "AI that helps you reply", desc: "Smart suggestions, translations, summaries." },
];

const PremiumAuthShell: React.FC<Props> = ({ children, mode }) => {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!orbRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      orbRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0d12] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div
          ref={orbRef}
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full blur-3xl opacity-40 transition-transform duration-300 ease-out"
          style={{ background: "radial-gradient(circle at center, #5865F2 0%, transparent 60%)" }}
        />
        <div
          className="absolute -bottom-56 -right-32 h-[700px] w-[700px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle at center, #a855f7 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: brand + highlights */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16">
          <motion.a
            href="/"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 group w-fit"
          >
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-gradient-to-br from-[#5865F2] to-[#a855f7] shadow-lg shadow-indigo-500/30">
              <MessageSquare className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight text-lg group-hover:text-white/90">
              Pulse
            </span>
          </motion.a>

          <div className="max-w-lg">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.1]"
            >
              {mode === "login" ? (
                <>Welcome back.<br />
                  <span className="bg-gradient-to-r from-[#8ab4ff] via-[#c4b5fd] to-[#f0abfc] bg-clip-text text-transparent">
                    Your people are waiting.
                  </span>
                </>
              ) : (
                <>Say hi to the crew.<br />
                  <span className="bg-gradient-to-r from-[#8ab4ff] via-[#c4b5fd] to-[#f0abfc] bg-clip-text text-transparent">
                    Start your first chat in seconds.
                  </span>
                </>
              )}
            </motion.h1>
            <p className="mt-5 text-white/60 text-base xl:text-lg leading-relaxed">
              A premium messaging experience — beautiful, fast, and built for
              conversations that matter.
            </p>

            <div className="mt-10 space-y-4">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-start gap-4"
                >
                  <div className="grid place-items-center h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur">
                    <h.icon className="h-5 w-5 text-white/80" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/90">{h.title}</div>
                    <div className="text-sm text-white/50">{h.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/40">
            © {new Date().getFullYear()} Pulse — Crafted with care.
          </div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md"
          >
            {/* Card glow */}
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-60 blur-sm" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.6)]">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PremiumAuthShell;