"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteAthlete } from "@/lib/actions";
import { getEvent } from "@/lib/scoring";
import { Athlete } from "@/lib/types";
import AthleteModal from "./AthleteModal";
import EmptyState from "./ui/EmptyState";
import { IconUsers } from "./ui/icons";

export default function AthletesList({ meetId }: { meetId: string }) {
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);

  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );

  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "—";

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Удалить спортсмена ${name}? Он также будет убран из уже составленных протоколов и зачётов.`)) {
      await deleteAthlete(id, meetId);
    }
  };

  if (!athletes || !teams || !entries) return <div className="skeleton h-48 rounded-xl2" />;

  if (athletes.length === 0) {
    return (
      <div className="card-flat p-5 rounded-xl">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <IconUsers className="w-4 h-4 text-track" /> Список участников
        </h3>
        <EmptyState title="Спортсмены ещё не добавлены" />
      </div>
    );
  }

  // Дисциплины по каждому спортсмену — какие виды он уже бежал/прыгал/метал.
  const eventsByAthlete = new Map<string, string[]>();
  for (const e of entries) {
    const list = eventsByAthlete.get(e.athleteId) ?? [];
    if (!list.includes(e.eventKey)) list.push(e.eventKey);
    eventsByAthlete.set(e.athleteId, list);
  }

  // Команда → возрастная группа → пол → ФИО — читается как бумажная заявка.
  const sorted = [...athletes].sort((a, b) => {
    const teamCmp = teamName(a.teamId).localeCompare(teamName(b.teamId), "ru");
    if (teamCmp !== 0) return teamCmp;
    const ageCmp = a.ageGroup.localeCompare(b.ageGroup, "ru");
    if (ageCmp !== 0) return ageCmp;
    const genderCmp = a.gender.localeCompare(b.gender, "ru");
    if (genderCmp !== 0) return genderCmp;
    return a.fullName.localeCompare(b.fullName, "ru");
  });

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <IconUsers className="w-4 h-4 text-track" /> Список всех участников
        </h3>
        <span className="text-xs font-bold num bg-blue/10 text-blue px-2.5 py-1 rounded-full">
          Всего: {athletes.length}
        </span>
      </div>

      <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[var(--surface)] border-b border-white/10 text-muted uppercase font-bold text-[10px] tracking-wide">
            <tr>
              <th className="py-2 w-14">№</th>
              <th className="py-2">ФИО</th>
              <th className="py-2">Команда</th>
              <th className="py-2">Категория</th>
              <th className="py-2">Дисциплины</th>
              <th className="py-2 text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((a, idx) => {
              const eventKeys = eventsByAthlete.get(a.id) ?? [];
              return (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.3) }}
                  className="group hover:bg-white/[0.04] transition-colors"
                >
                  <td className="py-2 num font-bold text-track align-top">{a.bib ?? "—"}</td>
                  <td className="py-2 font-medium align-top">{a.fullName}</td>
                  <td className="py-2 text-[var(--ink)]/80 align-top">{teamName(a.teamId)}</td>
                  <td className="py-2 align-top">
                    {a.ageGroup} ({a.gender === "м" ? "Ю" : "Д"})
                  </td>
                  <td className="py-2 align-top">
                    {eventKeys.length === 0 ? (
                      <span className="text-muted italic">нет результатов</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {eventKeys.map((key) => (
                          <span
                            key={key}
                            className="px-1.5 py-0.5 rounded bg-blue/10 text-blue text-[10px] font-bold whitespace-nowrap"
                          >
                            {getEvent(key).name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right space-x-2 align-top whitespace-nowrap">
                    <button
                      onClick={() => setEditingAthlete(a)}
                      className="text-blue hover:text-blue-light opacity-60 group-hover:opacity-100 font-bold px-1 transition"
                      title="Редактировать спортсмена"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(a.id, a.fullName)}
                      className="text-status-fail hover:text-status-fail/80 opacity-60 group-hover:opacity-100 font-bold px-1 transition"
                      title="Удалить спортсмена"
                    >
                      ✕
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AthleteModal
        meetId={meetId}
        isOpen={!!editingAthlete}
        onClose={() => setEditingAthlete(null)}
        editingAthlete={editingAthlete}
      />
    </div>
  );
}