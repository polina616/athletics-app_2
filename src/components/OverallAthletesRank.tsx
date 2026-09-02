"use client";

import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { pointsForEntry } from "@/lib/derive";
import EmptyState from "./ui/EmptyState";
import { IconMedal } from "./ui/icons";

interface AthleteScore {
  athleteId: string;
  fullName: string;
  bib: string | null;
  teamName: string;
  ageGroup: string;
  gender: string;
  totalPoints: number;
  eventsCount: number;
}

export default function OverallAthletesRank({ meetId }: { meetId: string }) {
  const entries = useLiveQuery(
    () => db.entries.where("meetId").equals(meetId).filter((e) => !e.deleted).toArray(),
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

  if (!entries || !athletes || !teams) {
    return <div className="skeleton h-40 rounded-xl2" />;
  }

  const header = (
    <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
      <IconMedal className="w-4 h-4 text-gold" /> Общий личный зачёт (Многоборье)
    </h3>
  );

  if (entries.length === 0) {
    return (
      <div className="card-flat p-5 rounded-xl">
        {header}
        <EmptyState title="Результатов пока нет" />
      </div>
    );
  }

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const athleteMap = new Map(athletes.map((a) => [a.id, a]));

  // Группируем результаты по каждому спортсмену
  const athleteScores: Record<string, AthleteScore> = {};

  entries.forEach((e) => {
    const athlete = athleteMap.get(e.athleteId);
    if (!athlete) return;

    const { pts } = pointsForEntry(e);
    const key = e.athleteId;

    if (!athleteScores[key]) {
      athleteScores[key] = {
        athleteId: e.athleteId,
        fullName: athlete.fullName,
        bib: athlete.bib,
        teamName: teamMap.get(e.teamId) ?? "—",
        ageGroup: e.ageGroup,
        gender: e.gender,
        totalPoints: 0,
        eventsCount: 0,
      };
    }

    athleteScores[key].totalPoints += pts;
    athleteScores[key].eventsCount += 1;
  });

  // Группируем по категориям: Возраст + Пол
  const categoryRanks: Record<string, AthleteScore[]> = {};

  Object.values(athleteScores).forEach((ath) => {
    const genderLabel = ath.gender === "м" ? "Юноши" : "Девушки";
    const catKey = `${ath.ageGroup} • ${genderLabel}`;

    if (!categoryRanks[catKey]) categoryRanks[catKey] = [];
    categoryRanks[catKey].push(ath);
  });

  // Сортируем внутри каждой категории по сумме очков
  Object.keys(categoryRanks).forEach((catKey) => {
    categoryRanks[catKey].sort((a, b) => b.totalPoints - a.totalPoints);
  });

  return (
    <div className="card-flat p-5 rounded-xl space-y-6">
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-xl font-display tracking-wide flex items-center gap-2">
          <IconMedal className="w-5 h-5 text-gold" /> Личный зачёт (Сумма по всем видам)
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(categoryRanks).map(([catTitle, athletesList], catIdx) => (
          <motion.div
            key={catTitle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: catIdx * 0.05 }}
            className="border border-white/10 rounded-lg p-3 surface-inset space-y-2"
          >
            <div className="eyebrow text-blue border-b border-white/10 pb-1.5">Категория: {catTitle}</div>

            <table className="w-full text-left text-xs">
              <thead className="text-muted font-bold border-b border-white/10 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="py-1 w-8">№</th>
                  <th className="py-1 w-14">Номер</th>
                  <th className="py-1">Спортсмен</th>
                  <th className="py-1 text-center">Видов</th>
                  <th className="py-1 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {athletesList.map((ath, idx) => (
                  <tr key={`${ath.athleteId}_${idx}`}>
                    <td className="py-2 font-bold num text-muted">{idx + 1}</td>
                    <td className="py-2 num text-muted">{ath.bib ?? "—"}</td>
                    <td className="py-2 font-medium">
                      <div>{ath.fullName}</div>
                      <div className="text-[10px] text-muted">{ath.teamName}</div>
                    </td>
                    <td className="py-2 text-center num text-[var(--ink)]/70">{ath.eventsCount}</td>
                    <td className="py-2 text-right font-bold num text-track">{ath.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ))}
      </div>
    </div>
  );
}