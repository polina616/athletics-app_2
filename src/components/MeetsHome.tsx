"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { db } from "@/lib/db";
import { deleteMeet } from "@/lib/actions";
import { supabase } from "@/lib/supabaseClient";
import { useAppStore } from "@/store/useAppStore";
import MeetSetup from "./MeetSetup";
import Button from "./ui/Button";
import { IconFlag, IconPlus } from "./ui/icons";

interface Props {
  /** Настоящий id авторизованного пользователя (Supabase Auth, auth.uid()) —
   *  соревнования привязываются к нему, чтобы owner_id проходил по типу
   *  uuid и по RLS-политике на сервере при синхронизации. */
  ownerId: string;
  onSelect: (meetId: string) => void;
}

/**
 * Точка входа в приложение. Если у судьи уже есть сохранённые соревнования
 * (в локальной Dexie-базе — работает офлайн), показываем список, чтобы
 * вернуться к любому из них в любой момент, и даём удалить ненужные. Если
 * соревнований ещё нет — сразу открываем форму создания.
 */
export default function MeetsHome({ ownerId, onSelect }: Props) {
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const clearMeetData = useAppStore((s) => s.clearMeetData);

  const meets = useLiveQuery(async () => {
    const rows = await db.meets.where({ ownerId }).toArray();
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [ownerId]);

  async function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `Удалить соревнование «${name}»? Будут безвозвратно удалены все команды, спортсмены и внесённые результаты.`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteMeet(id);
      clearMeetData(id);
    } finally {
      setDeletingId(null);
    }
  }

  // Пока загружается список — не мигаем формой создания.
  if (meets === undefined) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-3">
        <div className="skeleton h-10 w-2/3 rounded-xl2" />
        <div className="skeleton h-24 rounded-xl2" />
        <div className="skeleton h-24 rounded-xl2" />
      </div>
    );
  }

    if (creating || meets.length === 0) {
    return (
      <MeetSetup
        ownerId={ownerId}
        onCreated={(id) => {
          setCreating(false);
          onSelect(id);
        }}
        onBack={meets.length > 0 ? () => setCreating(false) : undefined}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow text-track mb-1.5 flex items-center gap-1.5">
              <span className="live-dot" /> С возвращением
            </div>
            <h1 className="font-display text-display-xl tracking-wide">Ваши соревнования</h1>
            <p className="text-sm text-muted mt-2 max-w-lg">
              Выберите соревнование, чтобы продолжить работу с протоколами, или создайте новое.
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs font-semibold text-muted hover:text-status-fail transition shrink-0 mt-1"
          >
            Выйти
          </button>
        </div>
      </motion.div>

      <Button variant="primary" onClick={() => setCreating(true)} className="w-full !py-3">
        <IconPlus className="w-4 h-4" /> Новое соревнование
      </Button>

      <div className="space-y-2">
        {meets.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
            className="card-flat p-2 pl-4 flex items-center gap-2 border border-transparent hover:border-track/50 transition group"
          >
            <button
              onClick={() => onSelect(m.id)}
              className="flex items-center gap-3 min-w-0 flex-1 text-left py-2"
            >
              <div className="w-9 h-9 rounded-xl2 bg-track/10 text-track flex items-center justify-center shrink-0">
                <IconFlag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{m.name}</div>
                <div className="text-xs text-muted num">
                  {m.date ?? "дата не указана"}
                  {m.place ? ` • ${m.place}` : ""}
                </div>
              </div>
            </button>

            <span className="text-xs font-bold text-blue opacity-0 group-hover:opacity-100 transition whitespace-nowrap shrink-0 hidden sm:inline">
              Открыть →
            </span>

            <button
              onClick={() => handleDelete(m.id, m.name)}
              disabled={deletingId === m.id}
              title="Удалить соревнование"
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-status-fail opacity-60 hover:opacity-100 hover:bg-status-fail/10 transition disabled:opacity-30"
            >
              {deletingId === m.id ? "…" : "✕"}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}