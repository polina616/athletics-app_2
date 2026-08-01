"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import MeetsHome from "@/components/MeetsHome";
import Dashboard from "@/components/Dashboard";
import SyncStatus from "@/components/SyncStatus";

export default function HomePage() {
  const currentMeetId = useAppStore((s) => s.currentMeetId);
  const setCurrentMeetId = useAppStore((s) => s.setCurrentMeetId);

  return (
    <main className="min-h-screen bg-transparent relative z-0">
      <AnimatePresence mode="wait">
        {!currentMeetId ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <MeetsHome onSelect={(id) => setCurrentMeetId(id)} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Dashboard meetId={currentMeetId} />
          </motion.div>
        )}
      </AnimatePresence>
      <SyncStatus />
    </main>
  );
}