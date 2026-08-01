"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface Props {
  label: string;
  value: number;
  icon?: ReactNode;
  accent?: "track" | "blue" | "gold";
  index?: number;
}

const accentMap = {
  track: { text: "text-track", ring: "shadow-glow-track", bg: "bg-track/10" },
  blue: { text: "text-blue", ring: "shadow-glow-blue", bg: "bg-blue/10" },
  gold: { text: "text-gold", ring: "shadow-glow-gold", bg: "bg-gold/10" },
};

export default function StatCard({ label, value, icon, accent = "track", index = 0 }: Props) {
  const a = accentMap[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="card-flat p-4 flex items-center gap-3.5"
    >
      <div className={`w-10 h-10 rounded-xl2 flex items-center justify-center shrink-0 ${a.bg} ${a.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="eyebrow mb-0.5 truncate">{label}</div>
        <div className={`font-display text-3xl leading-none ${a.text}`}>
          <AnimatedNumber value={value} />
        </div>
      </div>
    </motion.div>
  );
}
