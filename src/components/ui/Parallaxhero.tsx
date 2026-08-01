"use client";

import { useCallback, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Stat {
  label: string;
  value: string;
}

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stats?: Stat[];
  className?: string;
}

/**
 * Premium "product shot" treatment for the stadium photo (see .hero-panel
 * in globals.css): the whole image tilts toward the pointer with a spring,
 * a soft highlight follows the cursor across the track like light off wet
 * tartan, and the existing .hero-panel__scan keeps its one signature sweep.
 * Pointer-only — untouched (and untilted) on touch devices, and fully
 * inert under prefers-reduced-motion.
 */
export default function ParallaxHero({ eyebrow, title, subtitle, stats, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // px, py: 0..1 position of the pointer inside the hero, spring-damped so
  // the tilt trails the cursor instead of snapping to it.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 150, damping: 20, mass: 0.5 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateX = useTransform(sy, [0, 1], [7, -7]);
  const rotateY = useTransform(sx, [0, 1], [-9, 9]);
  const glowBackground = useMotionTemplate`radial-gradient(460px circle at ${useTransform(
    sx,
    [0, 1],
    ["10%", "90%"]
  )} ${useTransform(sy, [0, 1], ["90%", "10%"])}, rgba(255,255,255,0.30), transparent 62%)`;

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      px.set((e.clientX - rect.left) / rect.width);
      py.set((e.clientY - rect.top) / rect.height);
    },
    [px, py]
  );

  const handleLeave = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{ perspective: 1400 }}
      className={`hero-panel h-[300px] md:h-[420px] ${className}`}
    >
      <motion.div style={{ rotateX, rotateY }} className="absolute inset-0 will-change-transform">
        <div className="hero-panel__img" />
        <div className="hero-panel__overlay" />
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{ background: glowBackground }}
        />
        <div className="hero-panel__scan" />
      </motion.div>

      <div className="relative z-10 h-full flex flex-col justify-end p-6 md:p-10">
        {eyebrow && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-badge w-fit mb-4"
          >
            <span className="live-dot" /> {eyebrow}
          </motion.span>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-display-xl text-white tracking-wide max-w-xl [text-wrap:balance]"
        >
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="text-sm md:text-base text-white/75 max-w-md mt-3"
          >
            {subtitle}
          </motion.p>
        )}

        {stats && stats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap gap-2.5 mt-6"
          >
            {stats.map((s) => (
              <div key={s.label} className="glass-badge !bg-black/35">
                <span className="num font-bold text-white">{s.value}</span>
                <span className="text-white/60 text-[10px] uppercase tracking-wide ml-1.5">{s.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}