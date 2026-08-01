"use client";

import { useEffect, useRef } from "react";
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";

interface Props {
  value: number;
  className?: string;
  decimals?: number;
  suffix?: string;
}

/**
 * Renders a number that smoothly counts up/down toward `value` whenever it
 * changes — used for live-recalculating totals (team points, sums, counts)
 * so a judge's eye is drawn to what just moved, not to a hard jump-cut.
 */
export default function AnimatedNumber({ value, className, decimals = 0, suffix = "" }: Props) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, mv, reduceMotion]);

  useMotionValueEvent(mv, "change", (latest) => {
    if (spanRef.current) {
      spanRef.current.textContent = latest.toFixed(decimals) + suffix;
    }
  });

  return (
    <span ref={spanRef} className={className}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
