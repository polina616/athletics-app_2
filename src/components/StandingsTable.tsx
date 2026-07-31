"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/scoring";
import { teamBreakdowns } from "@/lib/derive";
import { STATUS_LABELS } from "@/lib/types";

export default function StandingsTable({ meetId }: { meetId: string }) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );

  if (!teams || !entries) return null;

  const breakdowns = teamBreakdowns(entries, teams);

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-lg font-bold">Общекомандный зачёт</h3>
        <p className="text-xs text-muted">Нажмите на команду для детализации очков</p>
      </div>

      <div className="space-y-2">
        {breakdowns.map((team, rank) => {
          const isExpanded = expandedTeam === team.teamId;

          return (
            <div
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
                        : "bg-white/10 text-[#F2F4F8]"
                    }`}
                  >
                    {rank + 1}
                  </span>
                  <span className="font-semibold text-sm">{team.teamName}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="num font-bold text-track text-sm">{team.total} очков</span>
                  <span className="text-xs text-muted">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 bg-[#12151C] border-t border-white/10 space-y-2 text-xs">
                  <div className="font-bold text-muted uppercase text-[10px] tracking-wide">
                    Вклад участников в результат команды:
                  </div>

                  {team.rows.length === 0 ? (
                    <p className="text-muted italic">Нет зафиксированных результатов</p>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="text-muted font-bold border-b border-white/5">
                        <tr>
                          <th className="py-1">Спортсмен</th>
                          <th className="py-1">Вид</th>
                          <th className="py-1">Категория</th>
                          <th className="py-1">Рез-т</th>
                          <th className="py-1 text-right">Очки</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {team.rows.map((r, idx) => {
                          const ev = getEvent(r.eventKey);
                          const resText = r.status ? STATUS_LABELS[r.status] : r.resultRaw;

                          return (
                            <tr key={idx}>
                              <td className="py-1.5 font-medium">{r.athleteName}</td>
                              <td className="py-1.5 text-[#F2F4F8]/80">{ev.name}</td>
                              <td className="py-1.5 text-[#F2F4F8]/70">
                                {r.ageGroup} ({r.gender === "м" ? "Ю" : "Д"})
                              </td>
                              <td className={`py-1.5 num ${r.status ? "text-status-fail" : ""}`}>{resText}</td>
                              <td className="py-1.5 text-right font-bold num text-track">+{r.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}