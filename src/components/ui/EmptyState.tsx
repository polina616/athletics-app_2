"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center text-center py-10 px-4"
    >
      <svg width="72" height="56" viewBox="0 0 72 56" fill="none" className="mb-3 opacity-70">
        <path d="M4 48c8-2 12-10 16-18s10-16 16-16 10 6 14 12 12 20 20 22" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 7" />
        <circle cx="20" cy="30" r="3" fill="var(--track)" opacity="0.7" />
        <circle cx="52" cy="34" r="3" fill="var(--blue)" opacity="0.6" />
      </svg>
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      {description && <p className="text-xs text-muted mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
