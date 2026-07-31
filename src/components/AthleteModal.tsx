"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addAthlete, updateAthlete } from "@/lib/actions";
import { Athlete, Gender } from "@/lib/types";

interface Props {
  meetId: string;
  isOpen: boolean;
  onClose: () => void;
  /** если задано — модалка работает в режиме редактирования этого спортсмена */
  editingAthlete?: Athlete | null;
}

export default function AthleteModal({ meetId, isOpen, onClose, editingAthlete }: Props) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [gender, setGender] = useState<Gender>("м");
  const [ageGroup, setAgeGroup] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingAthlete) {
      setFullName(editingAthlete.fullName);
      setTeamId(editingAthlete.teamId);
      setGender(editingAthlete.gender);
      setAgeGroup(editingAthlete.ageGroup);
    } else {
      setFullName("");
      setGender("м");
      setAgeGroup(meet?.ageGroups?.[0] ?? "");
      setTeamId(teams?.[0]?.id ?? "");
    }
  }, [editingAthlete, isOpen, meet, teams]);

  // Если данные ещё загружаются или модалка закрыта
  if (!isOpen) return null;
  
  // Если meet ещё не загружен — показываем индикатор загрузки
  if (!meet) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#12151C] rounded-xl max-w-md w-full p-6 text-center border border-white/10">
          <p className="text-sm text-muted">Загрузка...</p>
        </div>
      </div>
    );
  }

  // teams может быть undefined во время загрузки
  const teamsList = teams ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    
    const finalTeamId = teamId || teamsList[0]?.id;
    const finalAgeGroup = ageGroup || meet?.ageGroups?.[0];
    
    if (!finalTeamId) {
      alert("Добавьте хотя бы одну команду перед регистрацией спортсмена.");
      return;
    }
    if (!finalAgeGroup) {
      alert("Добавьте хотя бы одну возрастную группу перед регистрацией спортсмена.");
      return;
    }

    if (editingAthlete) {
      await updateAthlete(editingAthlete.id, meetId, {
        fullName: fullName.trim(),
        teamId: finalTeamId,
        ageGroup: finalAgeGroup,
        gender,
      });
    } else {
      await addAthlete(meetId, finalTeamId, fullName.trim(), finalAgeGroup, gender);
    }

    onClose();
  }

  if (teamsList.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#12151C] rounded-xl max-w-md w-full p-6 space-y-4 border border-white/10 shadow-card">
          <h2 className="font-display text-xl tracking-wide">
            {editingAthlete ? "Редактировать спортсмена" : "Зарегистрировать спортсмена"}
          </h2>
          <p className="text-sm text-gold">
            Сначала добавьте хотя бы одну команду при создании соревнования.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-[#F2F4F8] hover:bg-white/5 transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12151C] rounded-xl max-w-md w-full p-6 space-y-4 border border-white/10 shadow-card">
        <h2 className="font-display text-xl tracking-wide">
          {editingAthlete ? "Редактировать спортсмена" : "Зарегистрировать спортсмена"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">ФИО Спортсмена</label>
            <input
              type="text"
              required
              placeholder="Иванов Иван"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Команда</label>
              <select
                value={teamId || teamsList[0]?.id || ""}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
              >
                {teamsList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Возрастная группа</label>
              <select
                value={ageGroup || meet.ageGroups?.[0] || ""}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
              >
                {meet.ageGroups?.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Пол</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
            >
              <option value="м">Юноши (м)</option>
              <option value="ж">Девушки (ж)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-[#F2F4F8] hover:bg-white/5 transition"
            >
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-track hover:bg-track-dark text-white font-bold transition">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}