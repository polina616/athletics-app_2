"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { teamBreakdowns, teamStandingsByEvent, TeamBreakdownRow } from "@/lib/derive";
import { Gender, STATUS_LABELS } from "@/lib/types";
import EmptyState from "./ui/EmptyState";

type TeamGenderFilter = "all" | Gender;

const medalClass = (rank: number) =>
  rank === 0
    ? "bg-gold text-black"
    : rank === 1
    ? "bg-white/25 text-black""use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { teamBreakdowns, teamStandingsByEvent, teamStandingsByEventTop3, TeamBreakdownRow } from "@/lib/derive";
import { Gender, STATUS_LABELS } from "@/lib/types";
import EmptyState from "./ui/EmptyState";

type TeamGenderFilter = "all" | Gender;
type ScoringMode = "all" | "top3";

const medalClass = (rank: number) =>
  rank === 0
    ? "bg-gold text-black"
    : rank === 1
    ? "bg-white/25 text-black"
    : rank === 2
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

const placeMedalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

/** Строки раскладки одной команды в ОДНОЙ дисциплине — переиспользуем
 *  teamBreakdowns() (который считает сразу по всем дисциплинам команды) и
 *  просто отфильтровываем нужный eventKey. Так не дублируется логика
 *  подсчёта места/очков между общим зачётом и разбивкой по дисциплинам.
 *  Используется в режиме "все участники". */
function rowsForTeamEvent(
  breakdowns: ReturnType<typeof teamBreakdowns>,
  teamId: string,
  eventKey: string
): TeamBreakdownRow[] {
  const team = breakdowns.find((b) => b.teamId === teamId);
  if (!team) return [];
  return team.rows.filter((r) => r.eventKey === eventKey).sort((a, b) => b.pts - a.pts);
}

export default function TeamStandingsByEvent({ meetId }: { meetId: string }) {
  const [genderFilter, setGenderFilter] = useState<TeamGenderFilter>("all");
  const [scoringMode, setScoringMode] = useState<ScoringMode>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const relayTeams = useLiveQuery(
    () => db.relayTeams.where({ meetId }).filter((r) => !r.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );

  if (!teams || !entries || !relayTeams || !athletes) return <div className="skeleton h-48 rounded-xl2" />;

  const filteredEntries = genderFilter === "all" ? entries : entries.filter((e) => e.gender === genderFilter);
  const filteredRelayTeams =
    genderFilter === "all" ? relayTeams : relayTeams.filter((r) => r.gender === genderFilter);

  const byEventAll = teamStandingsByEvent(filteredEntries, teams, filteredRelayTeams);
  const breakdowns = teamBreakdowns(filteredEntries, teams, filteredRelayTeams, athletes);

  const byEventTop3 = teamStandingsByEventTop3(filteredEntries, teams, filteredRelayTeams);

  const filterOptions: { key: TeamGenderFilter; label: string }[] = [
    { key: "all", label: "Общий" },
    { key: "м", label: "Юноши" },
    { key: "ж", label: "Девушки" },
  ];

  const modeOptions: { key: ScoringMode; label: string }[] = [
    { key: "all", label: "Все участники" },
    { key: "top3", label: "Три лучших" },
  ];

  const isEmpty = scoringMode === "all" ? byEventAll.length === 0 : byEventTop3.length === 0;

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3 space-y-3">
        <div>
          <h3 className="text-lg font-bold">Распределение мест команд по дисциплинам</h3>
          <p className="text-xs text-muted mt-1">
            {scoringMode === "all"
              ? "Рейтинг команд отдельно в каждой дисциплине — по очкам всех результатов, набранным в ней. Нажмите на команду, чтобы увидеть, из каких результатов сложились её очки."
              : "Рейтинг команд отдельно в каждой дисциплине — по сумме очков трёх лучших спортсменов команды именно в этой дисциплине. Нажмите на команду, чтобы увидеть тройку."}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {modeOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setScoringMode(opt.key);
                setExpandedKey(null);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition border ${
                scoringMode === opt.key
                  ? "bg-blue border-blue text-white"
                  : "border-white/10 text-muted hover:text-[var(--ink)] hover:border-white/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setGenderFilter(opt.key);
                setExpandedKey(null);
              }}
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

      {isEmpty ? (
        <EmptyState title="Результатов пока нет" />
      ) : scoringMode === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byEventAll.map((ev, idx) => (
            <motion.div
              key={ev.eventKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
              className="border border-white/10 rounded-lg p-3 surface-inset space-y-2"
            >
              <div className="eyebrow text-blue border-b border-white/10 pb-1.5">{ev.eventName}</div>
              <ol className="space-y-1">
                {ev.standings.map((s, rank) => {
                  const key = `${ev.eventKey}::${s.teamId}`;
                  const isExpanded = expandedKey === key;
                  const rows = isExpanded ? rowsForTeamEvent(breakdowns, s.teamId, ev.eventKey) : [];

                  return (
                    <li key={s.teamId}>
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        className="w-full flex items-center justify-between text-xs py-1 hover:bg-white/[0.04] rounded transition -mx-1 px-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] num ${medalClass(
                              rank
                            )}`}
                          >
                            {rank + 1}
                          </span>
                          <span className="font-medium truncate">{s.teamName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="num font-bold text-track">{s.total}</span>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-[10px] text-muted"
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
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 mb-2 ml-7 pl-2 border-l border-white/10">
                              {rows.length === 0 ? (
                                <p className="text-[11px] text-muted italic py-1">
                                  Нет зафиксированных результатов в этой дисциплине.
                                </p>
                              ) : (
                                <table className="w-full text-left text-[11px]">
                                  <thead className="text-muted font-bold border-b border-white/5">
                                    <tr>
                                      <th className="py-1 w-8">Место</th>
                                      <th className="py-1">№</th>
                                      <th className="py-1">Спортсмен</th>
                                      <th className="py-1">Категория</th>
                                      <th className="py-1">Рез-т</th>
                                      <th className="py-1 text-right">Очки</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {rows.map((r, i) => {
                                      const resText = r.status ? STATUS_LABELS[r.status] : r.resultRaw || "—";
                                      return (
                                        <tr key={i}>
                                          <td className="py-1.5 num">
                                            {r.place ? (
                                              <span
                                                className={`inline-flex w-4.5 h-4.5 rounded-full items-center justify-center text-[9px] font-bold ${placeMedalClass(
                                                  r.place
                                                )}`}
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
                                          <td className={`py-1.5 num ${r.status ? "text-status-fail" : ""}`}>
                                            {resText}
                                          </td>
                                          <td className="py-1.5 text-right font-bold num text-track">
                                            +{r.pts}
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
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byEventTop3.map((ev, idx) => (
            <motion.div
              key={ev.eventKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
              className="border border-white/10 rounded-lg p-3 surface-inset space-y-2"
            >
              <div className="eyebrow text-blue border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>{ev.eventName}</span>
                {ev.eventKey === "relay" && (
                  <span className="text-[9px] normal-case text-muted font-normal">не применимо к эстафете</span>
                )}
              </div>
              <ol className="space-y-1">
                {ev.standings.map((s, rank) => {
                  const key = `top3::${ev.eventKey}::${s.teamId}`;
                  const isExpanded = expandedKey === key;
                  const isRelay = ev.eventKey === "relay";

                  return (
                    <li key={s.teamId}>
                      <button
                        type="button"
                        disabled={isRelay}
                        onClick={() => !isRelay && setExpandedKey(isExpanded ? null : key)}
                        className={`w-full flex items-center justify-between text-xs py-1 rounded transition -mx-1 px-1 ${
                          isRelay ? "cursor-default" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] num ${medalClass(
                              rank
                            )}`}
                          >
                            {rank + 1}
                          </span>
                          <span className="font-medium truncate">{s.teamName}</span>
                          {!isRelay && (
                            <span className="text-[9px] font-bold num bg-white/10 text-muted px-1 py-0.5 rounded-full shrink-0">
                              {s.top3.length}/3
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="num font-bold text-track">{s.total}</span>
                          {!isRelay && (
                            <motion.span
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-[10px] text-muted"
                            >
                              ▼
                            </motion.span>
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && !isRelay && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 mb-2 ml-7 pl-2 border-l border-white/10">
                              {s.top3.length === 0 ? (
                                <p className="text-[11px] text-muted italic py-1">
                                  Нет зафиксированных результатов в этой дисциплине.
                                </p>
                              ) : (
                                <table className="w-full text-left text-[11px]">
                                  <thead className="text-muted font-bold border-b border-white/5">
                                    <tr>
                                      <th className="py-1 w-8">Место</th>
                                      <th className="py-1">№</th>
                                      <th className="py-1">Спортсмен</th>
                                      <th className="py-1">Категория</th>
                                      <th className="py-1">Рез-т</th>
                                      <th className="py-1 text-right">Очки</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {s.top3.map((r) => {
                                      const resText = r.status ? STATUS_LABELS[r.status] : r.resultRaw || "—";
                                      return (
                                        <tr key={r.athleteId}>
                                          <td className="py-1.5 num">
                                            {r.place ? (
                                              <span
                                                className={`inline-flex w-4.5 h-4.5 rounded-full items-center justify-center text-[9px] font-bold ${placeMedalClass(
                                                  r.place
                                                )}`}
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
                                          <td className={`py-1.5 num ${r.status ? "text-status-fail" : ""}`}>
                                            {resText}
                                          </td>
                                          <td className="py-1.5 text-right font-bold num text-track">
                                            +{r.pts}
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
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
    : rank === 2
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

const placeMedalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

/** Строки раскладки одной команды в ОДНОЙ дисциплине — переиспользуем
 *  teamBreakdowns() (который считает сразу по всем дисциплинам команды) и
 *  просто отфильтровываем нужный eventKey. Так не дублируется логика
 *  подсчёта места/очков между общим зачётом и разбивкой по дисциплинам. */
function rowsForTeamEvent(
  breakdowns: ReturnType<typeof teamBreakdowns>,
  teamId: string,
  eventKey: string
): TeamBreakdownRow[] {
  const team = breakdowns.find((b) => b.teamId === teamId);
  if (!team) return [];
  return team.rows.filter((r) => r.eventKey === eventKey).sort((a, b) => b.pts - a.pts);
}

/** Распределение мест команд ОТДЕЛЬНО по каждой дисциплине — дополняет
 *  общий командный зачёт (StandingsTable), где очки суммируются по всем
 *  дисциплинам сразу. Здесь каждая дисциплина — свой независимый рейтинг
 *  команд, только по очкам, набранным в ней. Поддерживает тот же фильтр
 *  Общий/Юноши/Девушки, что и общий зачёт, и разворачивается по клику на
 *  команду — показывая, из каких именно результатов сложились её очки. */
export default function TeamStandingsByEvent({ meetId }: { meetId: string }) {
  const [genderFilter, setGenderFilter] = useState<TeamGenderFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  const relayTeams = useLiveQuery(
    () => db.relayTeams.where({ meetId }).filter((r) => !r.deleted).toArray(),
    [meetId]
  );
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );

  if (!teams || !entries || !relayTeams || !athletes) return <div className="skeleton h-48 rounded-xl2" />;

  const filteredEntries = genderFilter === "all" ? entries : entries.filter((e) => e.gender === genderFilter);
  const filteredRelayTeams =
    genderFilter === "all" ? relayTeams : relayTeams.filter((r) => r.gender === genderFilter);

  const byEvent = teamStandingsByEvent(filteredEntries, teams, filteredRelayTeams);
  const breakdowns = teamBreakdowns(filteredEntries, teams, filteredRelayTeams, athletes);

  const filterOptions: { key: TeamGenderFilter; label: string }[] = [
    { key: "all", label: "Общий" },
    { key: "м", label: "Юноши" },
    { key: "ж", label: "Девушки" },
  ];

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3 space-y-3">
        <div>
          <h3 className="text-lg font-bold">Распределение мест команд по дисциплинам</h3>
          <p className="text-xs text-muted mt-1">
            Рейтинг команд отдельно в каждой дисциплине — только по очкам, набранным в ней. Нажмите на
            команду, чтобы увидеть, из каких результатов сложились её очки.
          </p>
        </div>
        <div className="flex gap-1.5">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setGenderFilter(opt.key);
                setExpandedKey(null);
              }}
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
                {ev.standings.map((s, rank) => {
                  const key = `${ev.eventKey}::${s.teamId}`;
                  const isExpanded = expandedKey === key;
                  const rows = isExpanded ? rowsForTeamEvent(breakdowns, s.teamId, ev.eventKey) : [];

                  return (
                    <li key={s.teamId}>
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                        className="w-full flex items-center justify-between text-xs py-1 hover:bg-white/[0.04] rounded transition -mx-1 px-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] num ${medalClass(
                              rank
                            )}`}
                          >
                            {rank + 1}
                          </span>
                          <span className="font-medium truncate">{s.teamName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="num font-bold text-track">{s.total}</span>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-[10px] text-muted"
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
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="mt-1 mb-2 ml-7 pl-2 border-l border-white/10">
                              {rows.length === 0 ? (
                                <p className="text-[11px] text-muted italic py-1">
                                  Нет зафиксированных результатов в этой дисциплине.
                                </p>
                              ) : (
                                <table className="w-full text-left text-[11px]">
                                  <thead className="text-muted font-bold border-b border-white/5">
                                    <tr>
                                      <th className="py-1 w-8">Место</th>
                                      <th className="py-1">№</th>
                                      <th className="py-1">Спортсмен</th>
                                      <th className="py-1">Категория</th>
                                      <th className="py-1">Рез-т</th>
                                      <th className="py-1 text-right">Очки</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {rows.map((r, i) => {
                                      const resText = r.status ? STATUS_LABELS[r.status] : r.resultRaw || "—";
                                      return (
                                        <tr key={i}>
                                          <td className="py-1.5 num">
                                            {r.place ? (
                                              <span
                                                className={`inline-flex w-4.5 h-4.5 rounded-full items-center justify-center text-[9px] font-bold ${placeMedalClass(
                                                  r.place
                                                )}`}
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
                                          <td className={`py-1.5 num ${r.status ? "text-status-fail" : ""}`}>
                                            {resText}
                                          </td>
                                          <td className="py-1.5 text-right font-bold num text-track">
                                            +{r.pts}
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
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
