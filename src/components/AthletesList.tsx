"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteAthlete, updateAthlete } from "@/lib/actions";
import { getEvent } from "@/lib/scoring";
import { Athlete } from "@/lib/types";
import AthleteModal from "./AthleteModal";
import EmptyState from "./ui/EmptyState";
import { IconUsers } from "./ui/icons";

function BibCell({ athlete, meetId }: { athlete: Athlete; meetId: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(athlete.bib ?? "");

  useEffect(() => setValue(athlete.bib ?? ""), [athlete.bib]);

  async function save() {
    await updateAthlete(athlete.id, meetId, { bib: value.trim() || null });
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        onBlur={save}
        className="field !py-0.5 !px-1.5 !text-[11px] num w-16"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`num font-bold hover:underline ${athlete.bib ? "text-track" : "text-gold italic"}`}
      title="Нажмите, чтобы присвоить/изменить номер"
    >
      {athlete.bib ?? "назначить"}
    </button>
  );
}
export default function AthletesList({ meetId }: { meetId: string }) {
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  // Свёрнутые команды — изначально свёрнуты ВСЕ (см. эффект ниже, который
  // заполняет набор id команд один раз, как только список команд известен).
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [collapsedInitialized, setCollapsedInitialized] = useState(false);
  const [search, setSearch] = useState("");

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

  // Как только список команд загрузился впервые — сворачиваем их все разом.
  // Делаем это ровно один раз за сеанс (флаг collapsedInitialized), чтобы
  // потом судья мог свободно разворачивать/сворачивать конкретные команды
  // без того, чтобы фоновая синхронизация (см. SyncStatus.tsx) сбрасывала
  // его выбор обратно.
  useEffect(() => {
    if (collapsedInitialized || !teams) return;
    setCollapsedTeams(new Set(teams.map((t) => t.id)));
    setCollapsedInitialized(true);
  }, [teams, collapsedInitialized]);

  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "—";

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Удалить спортсмена ${name}? Он также будет убран из уже составленных протоколов и зачётов.`)) {
      await deleteAthlete(id, meetId);
    }
  };

  function toggleTeam(teamId: string) {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

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

  const eventsByAthlete = new Map<string, string[]>();
  for (const e of entries) {
    const list = eventsByAthlete.get(e.athleteId) ?? [];
    if (!list.includes(e.eventKey)) list.push(e.eventKey);
    eventsByAthlete.set(e.athleteId, list);
  }

  const q = search.trim().toLowerCase();
  const matchesQuery = (a: Athlete) =>
    !q || a.fullName.toLowerCase().includes(q);

  // Группируем спортсменов по команде — каждая команда своим блоком,
  // внутри блока как раньше: пол → возраст → ФИО. Поиск по ФИО фильтрует
  // спортсменов внутри команды и скрывает команды, где ничего не найдено —
  // при активном поиске так проще найти нужного человека, не разворачивая
  // все команды подряд вручную.
  const byTeam = new Map<string, Athlete[]>();
  for (const a of athletes) {
    if (!matchesQuery(a)) continue;
    const list = byTeam.get(a.teamId) ?? [];
    list.push(a);
    byTeam.set(a.teamId, list);
  }

  const teamGroups = [...byTeam.entries()]
    .map(([teamId, list]) => ({
      teamId,
      name: teamName(teamId),
      athletes: [...list].sort((a, b) => {
        if (a.gender !== b.gender) return a.gender === "м" ? -1 : 1;
        const ageCmp = a.ageGroup.localeCompare(b.ageGroup, "ru");
        if (ageCmp !== 0) return ageCmp;
        return a.fullName.localeCompare(b.fullName, "ru");
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const totalMatches = q ? teamGroups.reduce((s, g) => s + g.athletes.length, 0) : null;

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

      <div className="space-y-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО спортсмена..."
          className="field !text-xs"
        />
        {q && (
          <p className="text-[11px] text-muted num">
            {totalMatches ? `Найдено: ${totalMatches}` : "Ничего не найдено по этому запросу."}
          </p>
        )}
      </div>

      <div className="max-h-[52rem] overflow-y-auto space-y-3 pr-1">
        {teamGroups.length === 0 ? (
          <p className="text-xs text-muted italic py-4 text-center">Ничего не найдено.</p>
        ) : (
          teamGroups.map(({ teamId, name, athletes: teamAthletes }, idx) => {
            const collapsed = collapsedTeams.has(teamId);
            return (
              <motion.div
                key={teamId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                className="border border-white/10 rounded-lg surface-inset overflow-hidden"
              >
                <button
                  onClick={() => toggleTeam(teamId)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.04] transition"
                >
                  <span className="font-bold text-sm">{name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold num bg-white/10 text-muted px-2 py-0.5 rounded-full">
                      {teamAthletes.length}
                    </span>
                    <motion.span
                      animate={{ rotate: collapsed ? 0 : 180 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-muted"
                    >
                      ▼
                    </motion.span>
                  </span>
                </button>

                {!collapsed && (
                  <div className="overflow-x-auto border-t border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--surface)] border-b border-white/10 text-muted uppercase font-bold text-[10px] tracking-wide">
                        <tr>
                          <th className="py-2 px-3 w-14">№</th>
                          <th className="py-2 px-3">ФИО</th>
                          <th className="py-2 px-3">Категория</th>
                          <th className="py-2 px-3">Дисциплины</th>
                          <th className="py-2 px-3 text-right">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {teamAthletes.map((a) => {
                          const eventKeys = eventsByAthlete.get(a.id) ?? [];
                          return (
                            <tr key={a.id} className="group hover:bg-white/[0.04] transition-colors">
                              <td className="py-2 px-3 align-top">
                                <BibCell athlete={a} meetId={meetId} />
                              </td>
                              <td className="py-2 px-3 font-medium align-top">{a.fullName}</td>
                              <td className="py-2 px-3 align-top">
                                {a.ageGroup} ({a.gender === "м" ? "Ю" : "Д"})
                              </td>
                              <td className="py-2 px-3 align-top">
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
                              <td className="py-2 px-3 text-right space-x-2 align-top whitespace-nowrap">
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
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
