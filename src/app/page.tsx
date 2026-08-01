"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";
import AuthForm from "@/components/AuthForm";
import MeetsHome from "@/components/MeetsHome";
import Dashboard from "@/components/Dashboard";
import SyncStatus from "@/components/SyncStatus";

export default function HomePage() {
  const currentMeetId = useAppStore((s) => s.currentMeetId);
  const setCurrentMeetId = useAppStore((s) => s.setCurrentMeetId);

  // undefined — сессия ещё не проверена (первый тик), null — точно не
  // авторизован, Session — авторизован. Именно на этом id (auth.uid())
  // держится RLS в Supabase, поэтому без реального входа синхронизация
  // с сервером не пройдёт (owner_id должен быть настоящим uuid юзера).
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="skeleton h-12 w-64 rounded-xl2" />
      </main>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return (
    <main className="min-h-screen bg-transparent relative z-0">
      <AnimatePresence>
        {!currentMeetId ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <MeetsHome ownerId={session.user.id} onSelect={(id) => setCurrentMeetId(id)} />
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