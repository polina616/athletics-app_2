"use client";

import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addEntry } from "@/lib/actions";
import { getEvent } from "@/lib/scoring";
import { ResultStatus, STATUS_LABELS } from "@/lib/types";

interface Props {
  meetId: string;
  eventKey: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResultModal({ meetId, eventKey, isOpen, onClose }: Props) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );
  
  // Получаем уже существующие записи для этой дисциплины
  const existingEntries = useLiveQuery(
    () => db.entries.where({ meetId, eventKey }).filter((e) => !e.deleted).toArray(),
    [meetId, eventKey]
  );

  const eligibility = meet?.eventEligibility.find((el) => el.eventKey === eventKey);
  const allowedGenders = eligibility?.genders.length ? eligibility.genders : ["м", "ж"];
  const allowedAgeGroups = eligibility?.ageGroups.length ? eligibility.ageGroups : meet?.ageGroups ?? [];

  // Множество ID спортсменов, которые уже имеют результат в этой дисциплине
  const athleteIdsWithResults = useMemo(() => {
    return new Set(existingEntries?.map((e) => e.athleteId) ?? []);
  }, [existingEntries]);

  const filteredAthletes = useMemo(() => {
    if (!athletes) return [];
    return athletes.filter(
      (a) => 
        allowedGenders.includes(a.gender) && 
        allowedAgeGroups.includes(a.ageGroup) &&
        !athleteIdsWithResults.has(a.id) // исключаем тех, у кого уже есть результат
    );
  }, [athletes, allowedGenders, allowedAgeGroups, athleteIdsWithResults]);

  const teamName = (id: string) => teams?.find((t) => t.id === id)?.name ?? "—";

  const [athleteId, setAthleteId] = useState("");
  const [resultRaw, setResultRaw] = useState("");
  const [status, setStatus] = useState<ResultStatus | null>(null);

  if (!isOpen || !meet) return null;

  const eventConfig = getEvent(eventKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!athleteId) {
      alert("Выберите спортсмена из списка");
      return;
    }
    await addEntry({
      meetId,
      eventKey,
      athleteId,
      status,
      resultRaw,
      manualPoints: null,
    });

    setResultRaw("");
    setAthleteId("");
    setStatus(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12151C] rounded-xl max-w-md w-full p-6 space-y-4 border border-white/10 shadow-card">
        <h2 className="font-display text-2xl tracking-wide">Добавить результат: {eventConfig.name}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Спортсмен</label>
            <select
              required
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
            >
              <option value="">-- выберите спортсмена --</option>
              {filteredAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName} ({teamName(a.teamId)}, {a.ageGroup}, {a.gender === "м" ? "Ю" : "Д"})
                </option>
              ))}
            </select>
            
            {filteredAthletes.length === 0 && (
              <p className="text-[11px] text-gold mt-1.5">
                {athletes && athletes.length > 0 
                  ? "Все спортсмены в этой категории уже имеют результат в данной дисциплине."
                  : "Нет спортсменов, допущенных к этой дисциплине (проверьте пол/возраст, заданные при создании соревнования, либо зарегистрируйте спортсмена нужной категории)."
                }
              </p>
            )}
            
            {/* Показываем количество уже внесённых результатов */}
            {existingEntries && existingEntries.length > 0 && (
              <p className="text-[10px] num text-muted mt-1.5">
                Уже внесено результатов: {existingEntries.length}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Статус</label>
            <select
              value={status ?? "OK"}
              onChange={(e) => setStatus(e.target.value === "OK" ? null : (e.target.value as ResultStatus))}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm font-bold text-[#F2F4F8] outline-none focus:border-track transition"
            >
              <option value="OK">ОК (Засчитано)</option>
              <option value="DNS">{STATUS_LABELS.DNS} — не явился к старту</option>
              <option value="DNF">{STATUS_LABELS.DNF} — сошёл с дистанции</option>
              <option value="DQ">{STATUS_LABELS.DQ} — дисквалифицирован</option>
              <option value="NM">{STATUS_LABELS.NM} — все попытки не засчитаны</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">
              Результат {status && "(не требуется)"}
            </label>
            <input
              type="text"
              required={!status}
              disabled={!!status}
              placeholder={!status ? eventConfig.unitHint : STATUS_LABELS[status]}
              value={!status ? resultRaw : ""}
              onChange={(e) => setResultRaw(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm num text-[#F2F4F8] outline-none focus:border-track transition disabled:opacity-40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-[#F2F4F8] hover:bg-white/5 transition"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={filteredAthletes.length === 0}
              className="px-4 py-2 rounded-lg text-sm bg-track hover:bg-track-dark text-white font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}