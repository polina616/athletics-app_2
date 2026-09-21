"use client";

import { useState } from "react";
import { setEventCustomParams, setEventEligibilityByGender, updateMeet } from "@/lib/actions";
import { EVENT_GROUPS } from "@/lib/scoring";
import { EventCustomParams, Gender, Meet } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addTeam, setEventCustomParams, setEventEligibilityByGender, updateMeet } from "@/lib/actions";

interface Props {
  meet: Meet;
  isOpen: boolean;
  onClose: () => void;
}

const CUSTOM_DISTANCE_EVENTS = EVENT_GROUPS.flatMap((g) => g.events).filter((ev) => ev.customDistance);
// Лыжи и подобные — одна общая дистанция без этапов. Эстафета редактируется
// отдельным блоком ниже (число этапов + дистанция каждого этапа).
const SIMPLE_DISTANCE_EVENTS = CUSTOM_DISTANCE_EVENTS.filter((ev) => ev.key !== "relay");
const RELAY_EVENT = CUSTOM_DISTANCE_EVENTS.find((ev) => ev.key === "relay");

interface RelayDraft {
  legsCount: string;
  mode: "same" | "custom";
  sameDistance: string;
  legDistances: string[];
}

function relayDraftFromParams(params?: EventCustomParams): RelayDraft {
  const legs = params?.legDistances?.length || params?.legs || 4;
  const legDistances =
    params?.legDistances?.map((d) => String(d)) ??
    Array.from({ length: legs }, () =>
      params?.distanceMeters ? String(Math.round(params.distanceMeters / legs)) : ""
    );
  const allSame = legDistances.length > 0 && legDistances.every((d) => d === legDistances[0]);
  return {
    legsCount: String(legs),
    mode: allSame ? "same" : "custom",
    sameDistance: legDistances[0] ?? "",
    legDistances,
  };
}

export default function MeetSettingsModal({ meet, isOpen, onClose }: Props) {
  const [name, setName] = useState(meet.name);
  const [date, setDate] = useState(meet.date ?? "");
  const [place, setPlace] = useState(meet.place ?? "");
  const [ageGroupsText, setAgeGroupsText] = useState(meet.ageGroups.join("\n"));
const [newTeamName, setNewTeamName] = useState("");
const [addingTeam, setAddingTeam] = useState(false);
  const teams = useLiveQuery(
  () => db.teams.where({ meetId: meet.id }).filter((t) => !t.deleted).toArray(),
  [meet.id]
);

async function handleAddTeam(e: React.FormEvent) {
  e.preventDefault();
  const name = newTeamName.trim();
  if (!name) return;
  setAddingTeam(true);
  try {
    await addTeam(meet.id, name);
    setNewTeamName("");
  } finally {
    setAddingTeam(false);
  }
}
  const [distanceDrafts, setDistanceDrafts] = useState<Record<string, string>>(
    Object.fromEntries(
      SIMPLE_DISTANCE_EVENTS.map((ev) => [ev.key, meet.eventParams?.[ev.key]?.distanceMeters?.toString() ?? ""])
    )
  );

  const [relayDraft, setRelayDraft] = useState<RelayDraft>(() => relayDraftFromParams(meet.eventParams?.relay));

  if (!isOpen) return null;

  const ageGroups = ageGroupsText.split("\n").map((a) => a.trim()).filter(Boolean);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    await updateMeet(meet.id, { name, date: date || null, place: place || null, ageGroups });
  }

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
    const distanceMeters = Number(distanceDrafts[eventKey]);
    if (!distanceMeters) {
      alert("Укажите дистанцию в метрах.");
      return;
    }
    await setEventCustomParams(meet.id, eventKey, { distanceMeters });
  }

  // ---------- эстафета: число этапов + дистанция каждого этапа ----------

  function setRelayLegsCount(value: string) {
    setRelayDraft((prev) => {
      const n = Math.max(1, parseInt(value, 10) || 0);
      const fallback = prev.legDistances[prev.legDistances.length - 1] ?? prev.sameDistance ?? "";
      const legDistances = Array.from({ length: n }, (_, i) => prev.legDistances[i] ?? fallback);
      return { ...prev, legsCount: value, legDistances };
    });
  }

  function setRelayMode(mode: "same" | "custom") {
    setRelayDraft((prev) => ({ ...prev, mode }));
  }

  function setRelaySameDistance(value: string) {
    setRelayDraft((prev) => ({ ...prev, sameDistance: value }));
  }

  function setRelayLegDistance(idx: number, value: string) {
    setRelayDraft((prev) => {
      const legDistances = [...prev.legDistances];
      legDistances[idx] = value;
      return { ...prev, legDistances };
    });
  }

  function resolvedRelayLegDistances(): number[] {
    const legs = Math.max(1, parseInt(relayDraft.legsCount, 10) || 0);
    if (relayDraft.mode === "same") {
      const d = Number(relayDraft.sameDistance) || 0;
      return Array.from({ length: legs }, () => d);
    }
    return relayDraft.legDistances.slice(0, legs).map((d) => Number(d) || 0);
  }

  async function handleSaveRelay() {
    const legDistances = resolvedRelayLegDistances();
    if (legDistances.length === 0 || legDistances.some((v) => !v)) {
      alert("Укажите дистанцию для каждого этапа эстафеты.");
      return;
    }
    const distanceMeters = legDistances.reduce((s, v) => s + v, 0);
    await setEventCustomParams(meet.id, "relay", { distanceMeters, legs: legDistances.length, legDistances });
  }

  const activeSimpleDistanceEvents = SIMPLE_DISTANCE_EVENTS.filter((ev) =>
    meet.eventEligibility.some((el) => el.eventKey === ev.key)
  );
  const relayActive = RELAY_EVENT
    ? meet.eventEligibility.some((el) => el.eventKey === RELAY_EVENT.key)
    : false;

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
  <div className="field-label !mb-1">Команды</div>
  <p className="text-[11px] text-muted -mt-1">
    Уже заявленные команды нельзя удалить отсюда (чтобы не потерять их результаты) — можно только
    добавить новую.
  </p>

  {teams === undefined ? (
    <div className="skeleton h-8 rounded-xl2" />
  ) : teams.length === 0 ? (
    <p className="text-xs text-gold">Команд пока нет.</p>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {teams
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "ru"))
        .map((t) => (
          <span
            key={t.id}
            className="px-2 py-1 rounded border border-white/10 text-[11px] text-[var(--ink)]/80"
          >
            {t.name}
          </span>
        ))}
    </div>
  )}

  <form onSubmit={handleAddTeam} className="flex gap-2">
    <input
      type="text"
      value={newTeamName}
      onChange={(e) => setNewTeamName(e.target.value)}
      placeholder="Название новой команды"
      className="field !py-1.5 !text-xs flex-1"
    />
    <Button
      variant="secondary"
      type="submit"
      disabled={addingTeam || !newTeamName.trim()}
      className="!py-1.5 !px-3 !text-[11px] shrink-0"
    >
      {addingTeam ? "..." : "Добавить"}
    </Button>
  </form>
</div>
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

      {(activeSimpleDistanceEvents.length > 0 || relayActive) && (
        <div className="border-t border-white/10 pt-4 space-y-4">
          <div>
            <div className="field-label !mb-1">Дистанция (лыжи / эстафета)</div>
            <p className="text-[11px] text-muted -mt-1">
              Задайте реальную дистанцию — от неё зависит оценка очков.
            </p>
          </div>

          {activeSimpleDistanceEvents.map((ev) => (
            <div key={ev.key} className="flex flex-wrap items-end gap-2">
              <span className="text-[11px] font-bold text-muted w-full sm:w-auto">{ev.name}:</span>
              <input
                type="number"
                min={1}
                placeholder="дистанция, м"
                value={distanceDrafts[ev.key] ?? ""}
                onChange={(e) => setDistanceDrafts((prev) => ({ ...prev, [ev.key]: e.target.value }))}
                className="field num !w-28 !py-1 !text-xs"
              />
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

          {relayActive && RELAY_EVENT && (
            <div className="space-y-2.5 surface-inset rounded-lg p-3 border border-white/10">
              <span className="text-[11px] font-bold text-muted">{RELAY_EVENT.name}</span>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="field-label !mb-1">Число этапов</label>
                  <input
                    type="number"
                    min={1}
                    value={relayDraft.legsCount}
                    onChange={(e) => setRelayLegsCount(e.target.value)}
                    className="field num !w-24 !py-1 !text-xs"
                  />
                </div>
                <div className="flex items-center gap-3 pb-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
                    <input
                      type="radio"
                      name="relay-mode-settings"
                      checked={relayDraft.mode === "same"}
                      onChange={() => setRelayMode("same")}
                      className="accent-track"
                    />
                    Одинаковые
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
                    <input
                      type="radio"
                      name="relay-mode-settings"
                      checked={relayDraft.mode === "custom"}
                      onChange={() => setRelayMode("custom")}
                      className="accent-track"
                    />
                    Разные
                  </label>
                </div>
              </div>

              {relayDraft.mode === "same" ? (
                <div>
                  <label className="field-label !mb-1">Дистанция этапа (метры)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="напр. 100"
                    value={relayDraft.sameDistance}
                    onChange={(e) => setRelaySameDistance(e.target.value)}
                    className="field num !w-28 !py-1 !text-xs"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="field-label !mb-1">Дистанция каждого этапа (метры)</label>
                  <div className="flex flex-wrap gap-2">
                    {relayDraft.legDistances.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-[10px] text-muted num">{idx + 1}.</span>
                        <input
                          type="number"
                          min={1}
                          value={d}
                          onChange={(e) => setRelayLegDistance(idx, e.target.value)}
                          className="field num !w-20 !py-1 !text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted num">
                Общая дистанция: {resolvedRelayLegDistances().reduce((s, v) => s + v, 0)} м
              </p>

              <Button variant="secondary" type="button" className="!py-1 !px-2 !text-[11px]" onClick={handleSaveRelay}>
                Сохранить
              </Button>
            </div>
          )}
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
