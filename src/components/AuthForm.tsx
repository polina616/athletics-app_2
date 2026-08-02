"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import Button from "./ui/Button";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Очищаем URL от хэша авторизации (#access_token=...), чтобы избежать зацикливания
  // (актуально для перехода по ссылке подтверждения email при регистрации).
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

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setConfirmSent(true);
      return;
    }

    // Вход: email + пароль, без письма — работает сразу, на любом устройстве,
    // сессия дальше держится persistSession в supabaseClient.ts.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
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
          <span className="live-dot" /> {mode === "signin" ? "Вход судьи" : "Регистрация судьи"}
        </div>
        <h1 className="font-display text-display-lg tracking-wide mb-4">Athletics // Protocol</h1>

        {confirmSent ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-muted">
              Письмо с подтверждением отправлено на <b className="text-[var(--ink)]">{email}</b>.
              Перейдите по ссылке из письма — это нужно сделать один раз. После подтверждения
              сможете входить сразу по email и паролю, без писем.
            </p>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="text-xs font-semibold text-blue hover:text-blue-light"
            >
              ← Уже подтвердили? Войти
            </button>
          </motion.div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                placeholder="judge@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field !py-3"
                autoComplete="email"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Пароль (минимум 6 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field !py-3"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-status-fail"
                >
                  {error}
                </motion.p>
              )}
              <Button variant="primary" type="submit" disabled={loading} className="w-full !py-3">
                {loading ? "Подождите..." : mode === "signin" ? "Войти" : "Зарегистрироваться"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs text-muted hover:text-blue transition mt-4 block mx-auto"
            >
              {mode === "signin" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
