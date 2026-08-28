"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addAthletesBulk } from "@/lib/actions";
import { Gender } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Props {
  meetId: string;
  isOpen: boolean;
  onClose: () => void;
}

/** Регистрация целой командой одним вводом: выбираем команду/возраст/пол
 *  один раз, затем вставляем ФИО построчно — как ввод команд/возрастных
 *  групп построчно в MeetSetup. */
export default function BulkAthleteImport({ meetId, isOpen, onClose }: Props) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  const [teamId, setTeamId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState<Gender>("м");
  const [namesText, setNamesText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen || !meet) return null;

  const teamsList = teams ?? [];
  const namesCount = namesText.split("\n").map((n) => n.trim()).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalTeamId = teamId || teamsList[0]?.id;
    const finalAgeGroup = ageGroup || meet?.ageGroups?.[0];
    if (!finalTeamId || !finalAgeGroup || namesCount === 0) return;

    setSaving(true);
    try {
      await addAthletesBulk(meetId, finalTeamId, finalAgeGroup, gender, namesText);
      setNamesText("");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (teamsList.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <h2 className="font-display text-xl tracking-wide">Добавить команду списком</h2>
        <p className="text-sm text-gold">Сначала добавьте хотя бы одну команду.</p>
        <Button variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </Button>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="font-display text-xl tracking-wide">Добавить команду списком</h2>
      <p className="text-xs text-muted -mt-2">
        Все спортсмены из списка будут зарегистрированы с выбранными ниже командой, возрастом и полом.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Команда</label>
            <select value={teamId || teamsList[0]?.id || ""} onChange={(e) => setTeamId(e.target.value)} className="field">
              {teamsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Возрастная группа</label>
            <select value={ageGroup || meet.ageGroups?.[0] || ""} onChange={(e) => setAgeGroup(e.target.value)} className="field">
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

        <div>
          <label className="field-label">ФИО спортсменов (по одному на строку)</label>
          <textarea
            rows={8}
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            placeholder={"Иванов Иван\nПетров Пётр\nСидоров Семён"}
            className="field"
            autoFocus
          />
          {namesCount > 0 && <p className="text-[11px] num text-muted mt-1">Будет добавлено: {namesCount}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit" disabled={saving || namesCount === 0}>
            {saving ? "Сохранение..." : `Добавить (${namesCount})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}