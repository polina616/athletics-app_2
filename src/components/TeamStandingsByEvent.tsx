"use client";

import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { teamStandingsByEvent } from "@/lib/derive";
import EmptyState from "./ui/EmptyState";

const medalClass = (rank: number) =>
  rank === 0
    ? "bg-gold text-black"
    : rank === 1
    ? "bg-white/25 text-black"
    : rank === 2
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

/** Распределение мест команд ОТДЕЛЬНО по каждой дисциплине — дополняет
 *  общий командный зачёт (StandingsTable), где очки суммируются по всем
 *  дисциплинам сразу. Здесь каждая дисциплина — свой независимый рейтинг
 *  команд, только по очкам, набранным в ней. */
export default function TeamStandingsByEvent({ meetId }: { meetId: string }) {
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );

  if (!teams || !entries) return <div className="skeleton h-48 rounded-xl2" />;

  const byEvent = teamStandingsByEvent(entries, teams);

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-lg font-bold">Распределение мест команд по дисциплинам</h3>
        <p className="text-xs text-muted mt-1">
          Рейтинг команд отдельно в каждой дисциплине — только по очкам, набранным в ней.
        </p>
      </div>

      {byEvent.length === 0 ? (
        <EmptyState title="Результатов пока нет" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byEvent.map((ev, idx) => (
            <motion.div
              key={ev.eventKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
              className="border border-white/10 rounded-lg p-3 surface-inset space-y-2"
            >
              <div className="eyebrow text-blue border-b border-white/10 pb-1.5">{ev.eventName}</div>
              <ol className="space-y-1">
                {ev.standings.map((s, rank) => (
                  <li key={s.teamId} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] num ${medalClass(rank)}`}
                      >
                        {rank + 1}
                      </span>
                      <span className="font-medium truncate">{s.teamName}</span>
                    </div>
                    <span className="num font-bold text-track shrink-0 ml-2">{s.total}</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
