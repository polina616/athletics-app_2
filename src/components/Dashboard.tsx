"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useAppStore } from "@/store/useAppStore";
import { exportCsv } from "@/lib/exportCsv";
import StandingsTabs from "./StandingsTabs";
import AthletesList from "./AthletesList";
import AthleteModal from "./AthleteModal";
import ResultModal from "./ResultModal";

export default function Dashboard({ meetId }: { meetId: string }) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);

  const {
    isAthleteModalOpen,
    isResultModalOpen,
    selectedEventKey,
    setAthleteModalOpen,
    setResultModalOpen,
    setCurrentMeetId,
  } = useAppStore();

  if (!meet) return <div className="p-8 text-center">Загрузка соревнования...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 relative z-0">
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <button
            onClick={() => setCurrentMeetId(null)}
            className="text-xs font-semibold text-blue hover:text-blue/80 mb-1.5 inline-flex items-center gap-1 transition"
          >
            ← К выбору соревнований
          </button>
          <h1 className="font-display text-4xl tracking-wide">{meet.name}</h1>
          <p className="text-xs text-muted num mt-1">
            {meet.date} • {meet.place}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(meetId)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[#F2F4F8] rounded-lg text-sm font-bold transition"
          >
            ⬇ Экспорт в CSV
          </button>
          <button
            onClick={() => setAthleteModalOpen(true)}
            className="px-4 py-2.5 bg-track hover:bg-track-dark text-white rounded-lg text-sm font-bold transition shadow-card"
          >
            + Зарегистрировать спортсмена
          </button>
        </div>
      </div>

      {/* Основная сетка: протоколы/зачёты слева, реестр участников справа */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <StandingsTabs meetId={meetId} />
        </div>

        <div className="space-y-6">
          <AthletesList meetId={meetId} />
        </div>
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