"use client";

import { useEffect, useState } from "react";
import { fullSync } from "@/lib/sync";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [currentMeetId, setCurrentMeetId] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    // Получаем текущий meetId из localStorage или Zustand
    // В реальном приложении лучше использовать useAppStore
    const storedId = localStorage.getItem("currentMeetId");
    if (storedId) setCurrentMeetId(storedId);

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
    <div className="fixed bottom-4 right-4 z-40 text-xs px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 bg-black/80 border-white/10 text-[#F2F4F8] shadow-card">
      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-status-ok" : "bg-gold"} ${isOnline ? "" : "live-dot"}`} />
      <span>{isOnline ? "Онлайн (автосинхронизация)" : "Офлайн режим"}</span>
    </div>
  );
}