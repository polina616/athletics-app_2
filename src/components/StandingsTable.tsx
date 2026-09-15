"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/scoring";
import { teamBreakdowns, TeamBreakdownRow } from "@/lib/derive";
import { Gender, STATUS_LABELS } from "@/lib/types";
import AnimatedNumber from "./ui/AnimatedNumber";
import EmptyState from "./ui/EmptyState";

type TeamGenderFilter = "all" | Gender;

/** Группирует строки раскладки команды по дисциплине — "откуда сколько
 *  очков и кто принёс" читается по видам, а не одним общим списком. */
function groupRowsByEvent(rows: TeamBreakdownRow[]) {
  const map = new Map<string, TeamBreakdownRow[]>();
  for (const r of rows) {
    const list = map.get(r.eventKey) ?? [];
    list.push(r);
    map.set(r.eventKey, list);
  }
  return [...map.entries()]
    .map(([eventKey, groupRows]) => ({
      eventKey,
      eventName: getEvent(eventKey).name,
      rows: [...groupRows].sort((a, b) => b.pts - a.pts),
    }))
    .sort((a, b) => a.eventName.localeCompare(b.eventName, "ru"));
}

const medalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

export default function StandingsTable({ meetId }: { meetId: string }) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<TeamGenderFilter>("all");

  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );

  if (!teams || !entries) return <div className="skeleton h-48 rounded-xl2" />;

  const filteredEntries = genderFilter === "all" ? entries : entries.filter((e) => e.gender === genderFilter);
  const breakdowns = teamBreakdowns(filteredEntries, teams);

  const filterOptions: { key: TeamGenderFilter; label: string }[] = [
    { key: "all", label: "Общий" },
    { key: "м", label: "Юноши" },
    { key: "ж", label: "Девушки" },
  ];

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3 space-y-3">
        <div>
          <h3 className="text-lg font-bold">Общекомандный зачёт</h3>
          <p className="text-xs text-muted">Нажмите на команду для детализации очков по дисциплинам</p>
        </div>
        <div className="flex gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setGenderFilter(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                genderFilter === opt.key
                  ? "bg-track border-track text-white"
                  : "border-white/10 text-muted hover:text-[var(--ink)] hover:border-white/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {breakdowns.length === 0 ? (
        <EmptyState title="Команды ещё не добавлены" />
      ) : (
        <div className="space-y-2">
          {breakdowns.map((team, rank) => {
            const isExpanded = expandedTeam === team.teamId;
            const groups = isExpanded ? groupRowsByEvent(team.rows) : [];

            return (
              <motion.div
                layout
                key={team.teamId}
                className="border border-white/10 rounded-lg overflow-hidden surface-inset transition"
              >
                <button
                  onClick={() => setExpandedTeam(isExpanded ? null : team.teamId)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-white/[0.04] transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs num ${
                        rank === 0
                          ? "bg-gold text-black"
                          : rank === 1
                          ? "bg-white/25 text-black"
                          : rank === 2
                          ? "bg-track-dark text-white"
                          : "bg-white/10 text-[var(--ink)]"
                      }`}
                    >
                      {rank + 1}
                    </span>
                    <span className="font-semibold text-sm">{team.teamName}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="num font-bold text-track text-sm">
                      <AnimatedNumber value={team.total} /> очков
                    </span>
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-muted"
                    >
                      ▼
                    </motion.span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-[var(--surface)] border-t border-white/10 space-y-4 text-xs">
                        {team.rows.length === 0 ? (
                          <p className="text-muted italic">Нет зафиксированных результатов</p>
                        ) : (
                          groups.map((group) => (
                            <div key={group.eventKey} className="space-y-1.5">
                              <div className="font-bold text-blue uppercase text-[10px] tracking-wide border-b border-white/5 pb-1">
                                {group.eventName}
                                <span className="text-muted font-normal normal-case ml-1.5">
                                  ({group.rows.reduce((s, r) => s + r.pts, 0)} очк.)
                                </span>
                              </div>
                              <table className="w-full text-left">
                                <thead className="text-muted font-bold border-b border-white/5">
                                  <tr>
                                    <th className="py-1 w-10">Место</th>
                                    <th className="py-1">№</th>
                                    <th className="py-1">Спортсмен</th>
                                    <th className="py-1">Категория</th>
                                    <th className="py-1">Рез-т</th>
                                    <th className="py-1 text-right">Очки</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {group.rows.map((r, idx) => {
                                    const resText = r.status ? STATUS_LABELS[r.status] : r.resultRaw;
                                    return (
                                      <tr key={idx}>
                                        <td className="py-1.5 num">
                                          {r.place ? (
                                            <span
                                              className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${medalClass(r.place)}`}
                                            >
                                              {r.place}
                                            </span>
                                          ) : (
                                            <span className="text-muted">—</span>
                                          )}
                                        </td>
                                        <td className="py-1.5 num text-muted">{r.bib ?? "—"}</td>
                                        <td className="py-1.5 font-medium">{r.athleteName}</td>
                                        <td className="py-1.5 text-[var(--ink)]/70">
                                          {r.ageGroup} ({r.gender === "м" ? "Ю" : "Д"})
                                        </td>
                                        <td className={`py-1.5 num ${r.status ? "text-status-fail" : ""}`}>{resText}</td>
                                        <td className="py-1.5 text-right font-bold num text-track">+{r.pts}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
