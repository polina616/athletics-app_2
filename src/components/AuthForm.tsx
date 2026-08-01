"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import Button from "./ui/Button";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Очищаем URL от хэша авторизации (#access_token=...), чтобы избежать зацикливания
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && typeof window !== "undefined" && window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="card-flat p-8 max-w-sm w-full shadow-card-lg"
      >
        <div className="eyebrow text-track mb-2 flex items-center gap-1.5">
          <span className="live-dot" /> Вход судьи
        </div>
        <h1 className="font-display text-display-lg tracking-wide mb-4">Athletics // Protocol</h1>
        {sent ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted">
            Ссылка для входа отправлена на <b className="text-[var(--ink)]">{email}</b>. Откройте её на этом
            устройстве, чтобы продолжить.
          </motion.p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="judge@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field !py-3"
            />
            {error && (
              <motion.p initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="text-xs text-status-fail">
                {error}
              </motion.p>
            )}
            <Button variant="primary" type="submit" disabled={loading} className="w-full !py-3">
              {loading ? "Отправка..." : "Получить ссылку для входа"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
