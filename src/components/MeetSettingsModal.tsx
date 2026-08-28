"use client";

import { useState } from "react";
import { updateMeet, setEventEligibility } from "@/lib/actions";
import { EVENT_GROUPS } from "@/lib/scoring";
import { Meet } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Props {
  meet: Meet;
  isOpen: boolean;
  onClose: () => void;
}

/** Настройки уже созданного соревнования: правка названия/даты/места и
 *  возрастных групп, плюс добавление/снятие дисциплин — раньше это можно
 *  было задать только один раз при создании в MeetSetup. */
export default function MeetSettingsModal({ meet, isOpen, onClose }: Props) {
  const [name, setName] = useState(meet.name);
  const [date, setDate] = useState(meet.date ?? "");
  const [place, setPlace] = useState(meet.place ?? "");
  const [ageGroupsText, setAgeGroupsText] = useState(meet.ageGroups.join("\n"));

  if (!isOpen) return null;

  const ageGroups = ageGroupsText.split("\n").map((a) => a.trim()).filter(Boolean);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    await updateMeet(meet.id, { name, date: date || null, place: place || null, ageGroups });
  }

  async function toggleEvent(eventKey: string, active: boolean) {
    if (active) {
      await setEventEligibility(meet.id, eventKey, [], []);
    } else {
      await setEventEligibility(meet.id, eventKey, ageGroups.length ? ageGroups : meet.ageGroups, ["м", "ж"]);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg">
      <h2 className="font-display text-2xl tracking-wide">Настройки соревнования</h2>

      <form onSubmit={handleSaveGeneral} className="space-y-3">
        <div>
          <label className="field-label">Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Дата</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field num" />
          </div>
          <div>
            <label className="field-label">Место</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} className="field" />
          </div>
        </div>
        <div>
          <label className="field-label">Возрастные группы (по одной на строку)</label>
          <textarea rows={3} value={ageGroupsText} onChange={(e) => setAgeGroupsText(e.target.value)} className="field num" />
        </div>
        <Button variant="primary" type="submit" className="w-full">
          Сохранить основные данные
        </Button>
      </form>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="field-label !mb-1">Дисциплины</div>
        <p className="text-[11px] text-muted -mt-1">
          Клик добавляет дисциплину сразу для всех текущих возрастных групп и обоих полов. Точную
          настройку по конкретному возрасту/полу для отдельной дисциплины пока нужно менять здесь же
          повторным переключением — тонкая раздельная настройка не реализована.
        </p>
        {EVENT_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <div className="eyebrow">{group.label}</div>
            <div className="flex flex-wrap gap-2">
              {group.events.map((ev) => {
                const active = meet.eventEligibility.some((el) => el.eventKey === ev.key);
                return (
                  <button
                    key={ev.key}
                    type="button"
                    onClick={() => toggleEvent(ev.key, active)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
                      active ? "bg-track border-track text-white" : "border-white/10 text-muted hover:border-white/20"
                    }`}
                  >
                    {ev.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Modal>
  );
}