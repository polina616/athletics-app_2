"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EVENTS } from "@/lib/scoring";
import { athleteEventBreakdown, personalAllAround } from "@/lib/derive";
import { STATUS_LABELS } from "@/lib/types";
import ProtocolTable from "./ProtocolTable";
import StandingsTable from "./StandingsTable";
import TeamStandingsByEvent from "./TeamStandingsByEvent";
import ChartsPanel from "./ChartsPanel";
import EmptyState from "./ui/EmptyState";
import { IconMedal } from "./ui/icons";
import RelayProtocolTable from "./RelayProtocolTable";


type Tab = "protocols" | "individual" | "teams" | "charts";

const medalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

export default function StandingsTabs({ meetId }: { meetId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("protocols");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);

  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  if (!meet || !entries || !athletes || !teams) {
    return <div className="skeleton h-64 rounded-xl2" />;
  }

  const eventKeys = Array.from(new Set(meet.eventEligibility.map((el) => el.eventKey))).filter((key) =>
  EVENTS.some((e) => e.key === key)
);
  const currentEvent = selectedEvent && eventKeys.includes(selectedEvent) ? selectedEvent : eventKeys[0];
  const allAroundByCategory = personalAllAround(entries, athletes, teams);

  const tabs: { key: Tab; label: string }[] = [
    { key: "protocols", label: "Протоколы дисциплин" },
    { key: "individual", label: "Личный многоборный зачёт" },
    { key: "teams", label: "Общекомандный зачёт" },
    { key: "charts", label: "Аналитика" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative flex border-b border-white/10 gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative px-3.5 pb-3 pt-1 font-bold text-sm whitespace-nowrap transition ${
              activeTab === t.key ? "text-[var(--ink)]" : "text-muted hover:text-[var(--ink)]/80"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <motion.span
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute left-0 right-0 -bottom-px h-[2px] bg-track rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === "protocols" && (
            <div className="space-y-4">
              {eventKeys.length === 0 ? (
                <div className="card-flat p-5 rounded-xl">
                  <EmptyState
                    title="В соревновании ещё нет ни одной дисциплины"
                    description="Задайте их при создании соревнования."
                  />
                </div>
              ) : (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {eventKeys.map((key) => {
                      const ev = EVENTS.find((e) => e.key === key);
                      const isActive = currentEvent === key;
                      return (
                        <motion.button
                          key={key}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedEvent(key)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                            isActive
                              ? "bg-track border-track text-white shadow-glow-track"
                              : "bg-white/[0.03] border-white/10 text-muted hover:text-[var(--ink)] hover:border-white/20"
                          }`}
                        >
                          {ev?.name || key}
                        </motion.button>
                      );
                    })}
                  </div>
                  {currentEvent === "relay" ? (
  <RelayProtocolTable meetId={meetId} />
) : (
  currentEvent && <ProtocolTable meetId={meetId} eventKey={currentEvent} />
)}
                </>
              )}
            </div>
          )}

          {activeTab === "individual" && (
            <div className="card-flat p-5 rounded-xl space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <IconMedal className="w-5 h-5 text-gold" />
                Личный зачёт (сумма очков по всем дисциплинам)
              </h3>
              <p className="text-xs text-muted -mt-4">
                Нажмите на спортсмена, чтобы увидеть, из каких результатов сложилась его сумма.
              </p>

              {allAroundByCategory.size === 0 ? (
                <EmptyState title="Результатов пока нет" description="Внесите первый результат, чтобы увидеть многоборный зачёт." />
              ) : (
                [...allAroundByCategory.entries()].map(([catKey, rows], catIdx) => {
                  const [ageGroup, gender] = catKey.split("__");
                  return (
                    <motion.div
                      key={catKey}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: catIdx * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="eyebrow text-blue border-b border-white/10 pb-1.5">
                        {ageGroup} • {gender === "м" ? "Юноши" : "Девушки"}
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="text-muted border-b border-white/10 font-bold uppercase text-[10px] tracking-wide">
                          <tr>
                            <th className="py-2 w-8">Место</th>
                            <th className="py-2 w-14">№</th>
                            <th className="py-2">Спортсмен</th>
                            <th className="py-2">Команда</th>
                            <th className="py-2">Видов</th>
                            <th className="py-2 text-right">Всего очков</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {rows.map((r) => {
                            const isExpanded = expandedAthleteId === r.athleteId;
                            const breakdown = isExpanded ? athleteEventBreakdown(entries, r.athleteId) : [];
                            return (
                              <>
                                <tr
                                  key={r.athleteId}
                                  onClick={() => setExpandedAthleteId(isExpanded ? null : r.athleteId)}
                                  className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                                >
                                  <td className="py-2 font-bold num text-muted">
                                    {r.place <= 3 ? (
                                      <span
                                        className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${
                                          r.place === 1
                                            ? "bg-gold text-black"
                                            : r.place === 2
                                            ? "bg-white/25 text-black"
                                            : "bg-track-dark text-white"
                                        }`}
                                      >
                                        {r.place}
                                      </span>
                                    ) : (
                                      r.place
                                    )}
                                  </td>
                                  <td className="py-2 num text-muted">{r.bib ?? "—"}</td>
                                  <td className="py-2 font-medium">{r.athleteName}</td>
                                  <td className="py-2 text-muted">{r.teamName}</td>
                                  <td className="py-2 num text-muted">{Object.keys(r.perEvent).length}</td>
                                  <td className="py-2 text-right num font-bold text-track text-sm flex items-center justify-end gap-1.5">
                                    {r.total}
                                    <motion.span
                                      animate={{ rotate: isExpanded ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="text-[10px] text-muted"
                                    >
                                      ▼
                                    </motion.span>
                                  </td>
                                </tr>
                                <tr key={`${r.athleteId}-detail`}>
                                  <td colSpan={6} className="p-0 border-0">
                                    <AnimatePresence initial={false}>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                          className="overflow-hidden"
                                        >
                                          <div className="bg-[var(--surface)] border-y border-white/10 p-3">
                                            {breakdown.length === 0 ? (
                                              <p className="text-[11px] text-muted italic">Нет результатов.</p>
                                            ) : (
                                              <table className="w-full text-left">
                                                <thead className="text-muted font-bold border-b border-white/5 text-[10px] uppercase tracking-wide">
                                                  <tr>
                                                    <th className="py-1 w-10">Место</th>
                                                    <th className="py-1">Дисциплина</th>
                                                    <th className="py-1">Рез-т</th>
                                                    <th className="py-1 text-right">Очки</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                  {breakdown.map((b) => {
                                                    const resText = b.status ? STATUS_LABELS[b.status] : b.resultRaw || "—";
                                                    return (
                                                      <tr key={b.eventKey}>
                                                        <td className="py-1.5 num">
                                                          {b.place ? (
                                                            <span
                                                              className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${medalClass(
                                                                b.place
                                                              )}`}
                                                            >
                                                              {b.place}
                                                            </span>
                                                          ) : (
                                                            <span className="text-muted">—</span>
                                                          )}
                                                        </td>
                                                        <td className="py-1.5 font-medium">{b.eventName}</td>
                                                        <td className={`py-1.5 num ${b.status ? "text-status-fail" : ""}`}>
                                                          {resText}
                                                        </td>
                                                        <td className="py-1.5 text-right font-bold num text-track">
                                                          +{b.pts}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </td>
                                </tr>
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "teams" && (
  <div className="space-y-6">
    <StandingsTable meetId={meetId} />
    <TeamStandingsByEvent meetId={meetId} />
  </div>
)}

          {activeTab === "charts" && <ChartsPanel meetId={meetId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
