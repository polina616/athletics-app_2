"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { fullSync } from "@/lib/sync";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const currentMeetId = useAppStore((s) => s.currentMeetId);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (currentMeetId) {
        fullSync(currentMeetId).catch(console.warn);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Периодическая фоновая синхронизация
    const interval = setInterval(() => {
      if (currentMeetId && navigator.onLine) {
        fullSync(currentMeetId).catch(console.warn);
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [currentMeetId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="fixed bottom-4 right-4 z-40 text-xs px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 bg-black/80 border-white/10 text-[var(--ink)] shadow-card print:hidden"
    >
      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-status-ok" : "bg-gold"} ${isOnline ? "" : "live-dot"}`} />
      <span>{isOnline ? "Онлайн (автосинхронизация)" : "Офлайн режим"}</span>
    </motion.div>
  );
}