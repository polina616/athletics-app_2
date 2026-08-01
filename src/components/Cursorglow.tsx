"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient light that tracks the pointer across the whole app (unchanged
 * from the original cursor-glow), plus a small "photo-finish flash" ring
 * that fires on click/tap — a quiet nod to the finish-line camera rather
 * than a loud effect. Both layers are pointer-events: none end to end and
 * fully disabled under prefers-reduced-motion.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringsHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    const ringsHost = ringsHostRef.current;
    if (!glow || !ringsHost) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 50;
    let my = 30;

    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth) * 100;
      my = (e.clientY / window.innerHeight) * 100;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          glow.style.setProperty("--mx", `${mx}%`);
          glow.style.setProperty("--my", `${my}%`);
          raf = 0;
        });
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const ring = document.createElement("span");
      ring.className = "cursor-ring";
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      ringsHost.appendChild(ring);
      ring.addEventListener("animationend", () => ring.remove());
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={glowRef} className="cursor-glow" aria-hidden="true" />
      <div ref={ringsHostRef} className="cursor-rings" aria-hidden="true" />
    </>
  );
}