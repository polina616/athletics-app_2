"use client";

import { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addAthlete, updateAthlete } from "@/lib/actions";
import { Athlete, Gender } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

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

  // Последние выбранные команда/возраст/пол для ЭТОГО соревнования — судья
  // обычно регистрирует несколько спортсменов подряд из одной команды и
  // категории, так что не нужно каждый раз выбирать заново.
  const lastDefaults = useAppStore((s) => s.lastAthleteDefaults[meetId]);
  const setLastAthleteDefaults = useAppStore((s) => s.setLastAthleteDefaults);

  const [fullName, setFullName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [gender, setGender] = useState<Gender>("м");
  const [ageGroup, setAgeGroup] = useState("");

  // Инициализируем поля формы РОВНО ОДИН РАЗ за сеанс открытия модалки —
  // не на каждое изменение `meet`/`teams`. useLiveQuery отдаёт новый объект
  // при любой записи в соответствующую Dexie-таблицу, включая запись,
  // прилетевшую из фоновой синхронизации от ДРУГОГО судьи (см. sync.ts /
  // SyncStatus.tsx — фоновый sync каждые 15 сек). Без этой защиты, если
  // пока один судья печатает ФИО, второй в этот момент правит команду
  // или соревнование, поле ФИО обнулялось прямо посреди ввода.
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (editingAthlete) {
      setFullName(editingAthlete.fullName);
      setTeamId(editingAthlete.teamId);
      setGender(editingAthlete.gender);
      setAgeGroup(editingAthlete.ageGroup);
    } else {
      setFullName("");

      // Берём запомненное значение, только если оно всё ещё существует в
      // текущем составе команд/возрастных групп (их могли удалить/менять).
      const rememberedTeamValid = lastDefaults && teams?.some((t) => t.id === lastDefaults.teamId);
      const rememberedAgeGroupValid = lastDefaults && meet?.ageGroups?.includes(lastDefaults.ageGroup);

      setTeamId(rememberedTeamValid ? lastDefaults!.teamId : teams?.[0]?.id ?? "");
      setAgeGroup(rememberedAgeGroupValid ? lastDefaults!.ageGroup : meet?.ageGroups?.[0] ?? "");
      setGender(lastDefaults?.gender ?? "м");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingAthlete, isOpen]);

  if (!isOpen) return null;

  if (!meet) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <p className="text-sm text-muted text-center py-6">Загрузка...</p>
      </Modal>
    );
  }

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
      // Запоминаем выбор для следующей регистрации в рамках этого соревнования.
      setLastAthleteDefaults(meetId, { teamId: finalTeamId, ageGroup: finalAgeGroup, gender });
    }

    onClose();
  }

  if (teamsList.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="font-display text-xl tracking-wide">
          {editingAthlete ? "Редактировать спортсмена" : "Зарегистрировать спортсмена"}
        </h2>
        <p className="text-sm text-gold">
          Сначала добавьте хотя бы одну команду при создании соревнования.
        </p>
        <Button variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </Button>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="font-display text-xl tracking-wide">
        {editingAthlete ? "Редактировать спортсмена" : "Зарегистрировать спортсмена"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="field-label">ФИО Спортсмена</label>
          <input
            type="text"
            required
            placeholder="Иванов Иван"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="field"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Команда</label>
            <select
              value={teamId || teamsList[0]?.id || ""}
              onChange={(e) => setTeamId(e.target.value)}
              className="field"
            >
              {teamsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Возрастная группа</label>
            <select
              value={ageGroup || meet.ageGroups?.[0] || ""}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="field"
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
          <label className="field-label">Пол</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="field">
            <option value="м">Юноши (м)</option>
            <option value="ж">Девушки (ж)</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit">
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}