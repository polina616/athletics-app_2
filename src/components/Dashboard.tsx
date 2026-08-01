"use client";

import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { exportCsv } from "@/lib/exportCsv";
import StandingsTabs from "./StandingsTabs";
import AthletesList from "./AthletesList";
import AthleteModal from "./AthleteModal";
import ResultModal from "./ResultModal";
import Button from "./ui/Button";
import StatCard from "./ui/StatCard";
import { IconChevronLeft, IconDownload, IconFlag, IconPlus, IconUsers } from "./ui/icons";

export default function Dashboard({ meetId }: { meetId: string }) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
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

  const {
    isAthleteModalOpen,
    isResultModalOpen,
    selectedEventKey,
    setAthleteModalOpen,
    setResultModalOpen,
    setCurrentMeetId,
  } = useAppStore();

  if (!meet) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="skeleton h-24 rounded-xl2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-64 rounded-xl2" />
          </div>
          <div className="skeleton h-64 rounded-xl2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 relative z-0">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <button
            onClick={() => setCurrentMeetId(null)}
            className="text-xs font-semibold text-blue hover:text-blue-light mb-2 inline-flex items-center gap-1 transition group"
          >
            <IconChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            К выбору соревнований
          </button>
          <h1 className="font-display text-display-lg tracking-wide">{meet.name}</h1>
          <p className="text-xs text-muted num mt-1.5 flex items-center gap-1.5">
            <span className="live-dot" />
            {meet.date} • {meet.place || "место не указано"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => exportCsv(meetId)}>
            <IconDownload className="w-4 h-4" /> Экспорт в CSV
          </Button>
          <Button variant="primary" onClick={() => setAthleteModalOpen(true)}>
            <IconPlus className="w-4 h-4" /> Зарегистрировать спортсмена
          </Button>
        </div>
      </div>

      {/* Живая сводка соревнования */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Участников" value={athletes?.length ?? 0} icon={<IconUsers className="w-5 h-5" />} accent="track" index={0} />
        <StatCard label="Команд" value={teams?.length ?? 0} icon={<IconFlag className="w-5 h-5" />} accent="blue" index={1} />
        <StatCard label="Дисциплин" value={meet.eventEligibility.length} icon={<IconFlag className="w-5 h-5" />} accent="gold" index={2} />
        <StatCard label="Внесено результатов" value={entries?.length ?? 0} icon={<IconUsers className="w-5 h-5" />} accent="track" index={3} />
      </div>

      {/* Основная сетка: протоколы/зачёты слева, реестр участников справа */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2 space-y-8"
        >
          <StandingsTabs meetId={meetId} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <AthletesList meetId={meetId} />
        </motion.div>
      </div>

      {/* Модальные окна */}
      <AthleteModal meetId={meetId} isOpen={isAthleteModalOpen} onClose={() => setAthleteModalOpen(false)} />

      {selectedEventKey && (
        <ResultModal
          meetId={meetId}
          eventKey={selectedEventKey}
          isOpen={isResultModalOpen}
          onClose={() => setResultModalOpen(false)}
        />
      )}
    </div>
  );
}
