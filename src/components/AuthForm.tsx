"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#0B0D12]">
      <div className="card-flat p-8 max-w-sm w-full shadow-card">
        <div className="eyebrow text-track mb-2">
          Вход судьи
        </div>
        <h1 className="font-display text-4xl tracking-wide mb-4">Athletics // Protocol</h1>
        {sent ? (
          <p className="text-sm text-muted">
            Ссылка для входа отправлена на <b className="text-[#F2F4F8]">{email}</b>. Откройте её на этом
            устройстве, чтобы продолжить.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="judge@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg px-3 py-3 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
            />
            {error && <p className="text-xs text-status-fail">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-track hover:bg-track-dark text-white font-bold rounded-lg py-3 text-sm transition disabled:opacity-50 shadow-card"
            >
              {loading ? "Отправка..." : "Получить ссылку для входа"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}