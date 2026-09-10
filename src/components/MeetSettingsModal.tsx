"use client";

import { useState } from "react";
import { setEventCustomParams, setEventEligibilityByGender, updateMeet } from "@/lib/actions";
import { EVENT_GROUPS } from "@/lib/scoring";
import { Gender, Meet } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Props {
  meet: Meet;
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOM_DISTANCE_EVENTS = EVENT_GROUPS.flatMap((g) => g.events).filter((ev) => ev.customDistance);

export default function MeetSettingsModal({ meet, isOpen, onClose }: Props) {
  const [name, setName] = useState(meet.name);
  const [date, setDate] = useState(meet.date ?? "");
  const [place, setPlace] = useState(meet.place ?? "");
  const [ageGroupsText, setAgeGroupsText] = useState(meet.ageGroups.join("\n"));

  const [distanceDrafts, setDistanceDrafts] = useState<Record<string, { distanceMeters: string; legs: string }>>(
    Object.fromEntries(
      CUSTOM_DISTANCE_EVENTS.map((ev) => [
        ev.key,
        {
          distanceMeters: meet.eventParams?.[ev.key]?.distanceMeters?.toString() ?? "",
          legs: meet.eventParams?.[ev.key]?.legs?.toString() ?? "",
        },
      ])
    )
  );

  if (!isOpen) return null;

  const ageGroups = ageGroupsText.split("\n").map((a) => a.trim()).filter(Boolean);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    await updateMeet(meet.id, { name, date: date || null, place: place || null, ageGroups });
  }

  // Текущие возрастные группы дисциплины, отдельно по каждому полу —
  // читаем ПРЯМО из meet.eventEligibility (props), поэтому UI всегда
  // отражает актуальное состояние без отдельного черновика.
  function ageGroupsFor(eventKey: string, g: Gender): string[] {
    const result = new Set<string>();
    for (const el of meet.eventEligibility) {
      if (el.eventKey === eventKey && el.genders.includes(g)) {
        for (const ag of el.ageGroups) result.add(ag);
      }
    }
    return [...result];
  }

  function byGenderFor(eventKey: string): Partial<Record<Gender, string[]>> {
    return {
      м: ageGroupsFor(eventKey, "м"),
      ж: ageGroupsFor(eventKey, "ж"),
    };
  }

  async function toggleEventActive(eventKey: string, active: boolean) {
    if (active) {
      await setEventEligibilityByGender(meet.id, eventKey, {});
    } else {
      // включаем сразу для обоих полов со всеми текущими возрастными
      // группами — дальше можно раздельно подправить пол/возраст ниже
      await setEventEligibilityByGender(meet.id, eventKey, { м: meet.ageGroups, ж: meet.ageGroups });
    }
  }

  async function toggleGenderForEvent(eventKey: string, g: Gender) {
    const cur = byGenderFor(eventKey);
    const next = { ...cur };
    if (next[g]?.length) {
      next[g] = [];
    } else {
      next[g] = [...meet.ageGroups];
    }
    await setEventEligibilityByGender(meet.id, eventKey, next);
  }

  async function toggleAgeGroupForEvent(eventKey: string, g: Gender, ag: string) {
    const cur = byGenderFor(eventKey);
    const list = cur[g] ?? [];
    const has = list.includes(ag);
    const nextList = has ? list.filter((x) => x !== ag) : [...list, ag];
    await setEventEligibilityByGender(meet.id, eventKey, { ...cur, [g]: nextList });
  }

  async function handleSaveDistance(eventKey: string) {
    const draft = distanceDrafts[eventKey];
    const distanceMeters = Number(draft?.distanceMeters);
    if (!distanceMeters) {
      alert("Укажите дистанцию в метрах.");
      return;
    }
    const legs = draft?.legs ? Number(draft.legs) : undefined;
    await setEventCustomParams(meet.id, eventKey, { distanceMeters, ...(legs ? { legs } : {}) });
  }

  const activeCustomDistanceEvents = CUSTOM_DISTANCE_EVENTS.filter((ev) =>
    meet.eventEligibility.some((el) => el.eventKey === ev.key)
  );

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
          Отметьте дисциплину, затем настройте для неё пол и возрастные группы — отдельно для юношей
          и для девушек. Список возрастных групп берётся из тех, что сохранены выше (если только
          что изменили их в форме — сначала сохраните основные данные).
        </p>
        {EVENT_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <div className="eyebrow">{group.label}</div>
            <div className="space-y-2">
              {group.events.map((ev) => {
                const active = meet.eventEligibility.some((el) => el.eventKey === ev.key);
                return (
                  <div
                    key={ev.key}
                    className={`rounded-lg border p-3 text-xs transition ${
                      active ? "border-track/60 bg-track/5" : "border-white/10 text-[var(--ink)]/60"
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer font-bold mb-2">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleEventActive(ev.key, active)}
                        className="accent-track"
                      />
                      {ev.name}
                    </label>

                    {active && (
                      <div className="pl-6 space-y-2.5">
                        {(["м", "ж"] as Gender[]).map((g) => {
                          const selectedAgeGroups = ageGroupsFor(ev.key, g);
                          const genderActive = selectedAgeGroups.length > 0;
                          return (
                            <div key={g} className="space-y-1.5">
                              <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
                                <input
                                  type="checkbox"
                                  checked={genderActive}
                                  onChange={() => toggleGenderForEvent(ev.key, g)}
                                  className="accent-track"
                                />
                                {g === "м" ? "Юноши" : "Девушки"}
                              </label>

                              {genderActive && (
                                <div className="flex flex-wrap gap-2 pl-5">
                                  {meet.ageGroups.map((ag) => {
                                    const checked = selectedAgeGroups.includes(ag);
                                    return (
                                      <label
                                        key={ag}
                                        className={`px-2 py-1 rounded border cursor-pointer num transition ${
                                          checked
                                            ? "bg-track text-white border-track"
                                            : "border-white/10 text-[var(--ink)]/70 hover:border-white/20"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="hidden"
                                          checked={checked}
                                          onChange={() => toggleAgeGroupForEvent(ev.key, g, ag)}
                                        />
                                        {ag}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {activeCustomDistanceEvents.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="field-label !mb-1">Дистанция (лыжи / эстафета)</div>
          <p className="text-[11px] text-muted -mt-1">
            Задайте реальную дистанцию — от неё зависит оценка очков.
          </p>
          {activeCustomDistanceEvents.map((ev) => (
            <div key={ev.key} className="flex flex-wrap items-end gap-2 pt-1">
              <span className="text-[11px] font-bold text-muted w-full sm:w-auto">{ev.name}:</span>
              <input
                type="number"
                min={1}
                placeholder="дистанция, м"
                value={distanceDrafts[ev.key]?.distanceMeters ?? ""}
                onChange={(e) =>
                  setDistanceDrafts((prev) => ({ ...prev, [ev.key]: { ...prev[ev.key], distanceMeters: e.target.value } }))
                }
                className="field num !w-28 !py-1 !text-xs"
              />
              {ev.key === "relay" && (
                <input
                  type="number"
                  min={1}
                  placeholder="этапов"
                  value={distanceDrafts[ev.key]?.legs ?? ""}
                  onChange={(e) =>
                    setDistanceDrafts((prev) => ({ ...prev, [ev.key]: { ...prev[ev.key], legs: e.target.value } }))
                  }
                  className="field num !w-20 !py-1 !text-xs"
                />
              )}
              <Button
                variant="secondary"
                type="button"
                className="!py-1 !px-2 !text-[11px]"
                onClick={() => handleSaveDistance(ev.key)}
              >
                Сохранить
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Modal>
  );
}
