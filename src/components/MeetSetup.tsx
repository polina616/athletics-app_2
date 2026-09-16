"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createMeet, addTeamsBulk } from "@/lib/actions";
import { EVENT_GROUPS, EVENTS } from "@/lib/scoring";
import { EventCustomParams, EventEligibility, Gender } from "@/lib/types";
import Button from "./ui/Button";
import { IconChevronLeft, IconJump, IconRunning, IconShooting, IconThrow } from "./ui/icons";
import ParallaxHero from "./ui/Parallaxhero";

interface Props {
  ownerId: string;
  onCreated?: (id: string) => void;
  onBack?: () => void;
}

type EligibilityDraft = Record<string, Partial<Record<Gender, string[]>>>;

// Дистанция для дисциплин с произвольной дистанцией БЕЗ этапов (лыжи).
type CustomParamsDraft = Record<string, { distanceMeters?: string }>;

// Черновик эстафеты: число этапов + либо одна общая дистанция этапа
// (mode "same"), либо своя дистанция для каждого этапа (mode "custom").
interface RelayDraft {
  legsCount: string;
  mode: "same" | "custom";
  sameDistance: string;
  legDistances: string[];
}

const DEFAULT_RELAY_LEGS = 4;
const DEFAULT_LEG_DISTANCE = "100";

function makeDefaultRelayDraft(): RelayDraft {
  return {
    legsCount: String(DEFAULT_RELAY_LEGS),
    mode: "same",
    sameDistance: DEFAULT_LEG_DISTANCE,
    legDistances: Array.from({ length: DEFAULT_RELAY_LEGS }, () => DEFAULT_LEG_DISTANCE),
  };
}

const groupIcon: Record<string, (props: any) => JSX.Element> = {
  "Бег": IconRunning,
  "Прыжки": IconJump,
  "Метания": IconThrow,
  "Стрельба": IconShooting,
};

export default function MeetSetup({ ownerId, onCreated, onBack }: Props) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teamsText, setTeamsText] = useState("Центральный район\nЗаречный район\nЮжный район");
  const [ageGroupsText, setAgeGroupsText] = useState(
    "2012-2013 гг.р.\n2010-2011 гг.р.\n2008-2009 гг.р."
  );
  const [eligibility, setEligibility] = useState<EligibilityDraft>({});
  const [customParams, setCustomParams] = useState<CustomParamsDraft>({});
  const [relayDraft, setRelayDraft] = useState<RelayDraft>(makeDefaultRelayDraft);

  const ageGroups = ageGroupsText
    .split("\n")
    .map((a) => a.trim())
    .filter(Boolean);

  function toggleDiscipline(key: string) {
    setEligibility((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { м: [...ageGroups], ж: [...ageGroups] };
      }
      return next;
    });
  }

  function toggleGenderForEvent(key: string, g: Gender) {
    setEligibility((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const nextForEvent = { ...cur };
      if (nextForEvent[g]) {
        delete nextForEvent[g];
      } else {
        nextForEvent[g] = [...ageGroups];
      }
      return { ...prev, [key]: nextForEvent };
    });
  }

  function toggleAgeGroupForEvent(key: string, g: Gender, ag: string) {
    setEligibility((prev) => {
      const cur = prev[key];
      const list = cur?.[g];
      if (!cur || !list) return prev;
      const has = list.includes(ag);
      return {
        ...prev,
        [key]: { ...cur, [g]: has ? list.filter((x) => x !== ag) : [...list, ag] },
      };
    });
  }

  function setCustomParam(key: string, value: string) {
    setCustomParams((prev) => ({ ...prev, [key]: { distanceMeters: value } }));
  }

  // ---------- эстафета: число этапов + дистанция каждого этапа ----------

  function setRelayLegsCount(value: string) {
    setRelayDraft((prev) => {
      const n = Math.max(1, parseInt(value, 10) || 0);
      const fallback = prev.legDistances[prev.legDistances.length - 1] ?? prev.sameDistance ?? DEFAULT_LEG_DISTANCE;
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

  /** Итоговый массив дистанций этапов с учётом выбранного режима — общая
   *  дистанция для scoring.ts всегда считается как сумма этого массива. */
  function resolvedRelayLegDistances(): number[] {
    const legs = Math.max(1, parseInt(relayDraft.legsCount, 10) || 0);
    if (relayDraft.mode === "same") {
      const d = Number(relayDraft.sameDistance) || 0;
      return Array.from({ length: legs }, () => d);
    }
    return relayDraft.legDistances.slice(0, legs).map((d) => Number(d) || 0);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const teams = teamsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    const eventEligibility: EventEligibility[] = [];
    for (const [eventKey, byGender] of Object.entries(eligibility)) {
      (Object.keys(byGender) as Gender[]).forEach((g) => {
        const ags = byGender[g];
        if (ags && ags.length > 0) {
          eventEligibility.push({ eventKey, ageGroups: ags, genders: [g] });
        }
      });
    }

    // Дистанция (и, для эстафеты, разбивка по этапам) для дисциплин с
    // произвольной дистанцией — вводится судьёй здесь же, при создании.
    const eventParams: Record<string, EventCustomParams> = {};
    for (const eventKey of Object.keys(eligibility)) {
      const ev = EVENTS.find((e) => e.key === eventKey);
      if (!ev?.customDistance) continue;

      if (eventKey === "relay") {
        const legDistances = resolvedRelayLegDistances();
        const distanceMeters = legDistances.reduce((s, v) => s + v, 0);
        if (distanceMeters > 0 && legDistances.every((v) => v > 0)) {
          eventParams[eventKey] = { distanceMeters, legs: legDistances.length, legDistances };
        }
        continue;
      }

      const distanceMeters = customParams[eventKey]?.distanceMeters
        ? Number(customParams[eventKey]?.distanceMeters)
        : undefined;
      if (distanceMeters) eventParams[eventKey] = { distanceMeters };
    }

    const missingDistance = Object.keys(eligibility).some((key) => {
      const ev = EVENTS.find((e) => e.key === key);
      if (!ev?.customDistance) return false;
      if (key === "relay") {
        const p = eventParams[key];
        return !p || !p.distanceMeters || !p.legDistances?.length || p.legDistances.some((v) => !v);
      }
      return !eventParams[key]?.distanceMeters;
    });

    if (teams.length === 0 || ageGroups.length === 0 || eventEligibility.length === 0 || missingDistance) {
      alert(
        missingDistance
          ? "Укажите дистанцию для лыж/эстафеты (для эстафеты — дистанцию каждого этапа) — без неё оценка очков работать не будет."
          : "Укажите хотя бы одну команду, возрастную группу и дисциплину с хотя бы одним допущенным полом и возрастной группой!"
      );
      return;
    }

    const meet = await createMeet(ownerId, name, date || null, place || null, ageGroups, eventEligibility, eventParams);
    await addTeamsBulk(meet.id, teams);

    if (onCreated) onCreated(meet.id);
  }

  const selectedCount = Object.keys(eligibility).length;
  const relayTotalDistance = resolvedRelayLegDistances().reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-blue hover:text-blue-light inline-flex items-center gap-1 transition group"
        >
          <IconChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Назад к списку соревнований
        </button>
      )}

      <ParallaxHero
        eyebrow="Новый протокол"
        title="Новое соревнование"
        subtitle="Задайте команды, возрастные группы и дисциплины один раз — дальше судейская коллегия вносит только результаты."
      />

      <motion.form
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleCreate}
        className="space-y-5 card-flat p-6"
      >
        <div>
          <label className="field-label">Название соревнования</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Первенство области по лёгкой атлетике"
            className="field"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Дата</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="field num" />
          </div>
          <div>
            <label className="field-label">Место проведения</label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Стадион 'Олимпиец'"
              className="field"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Возрастные группы (по одной на строку)</label>
          <textarea rows={3} value={ageGroupsText} onChange={(e) => setAgeGroupsText(e.target.value)} className="field num" />
        </div>

        <div>
          <label className="field-label">Заявленные команды (по одной на строку)</label>
          <textarea rows={3} value={teamsText} onChange={(e) => setTeamsText(e.target.value)} className="field num" />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="field-label !mb-1">Дисциплины соревнования — и кто в них допущен</label>
              <p className="text-[11px] text-muted">
                Отметьте дисциплину, затем укажите для неё пол и возрастные группы — отдельно для юношей и для девушек.
              </p>
            </div>
            {selectedCount > 0 && (
              <span className="text-xs font-bold num bg-track/10 text-track px-2.5 py-1 rounded-full shrink-0">
                Выбрано: {selectedCount}
              </span>
            )}
          </div>

          {EVENT_GROUPS.map((group) => {
            const GroupIcon = groupIcon[group.label] ?? IconRunning;
            return (
              <div key={group.label} className="space-y-2">
                <div className="eyebrow flex items-center gap-1.5">
                  <GroupIcon className="w-3.5 h-3.5" />
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.events.map((ev) => {
                    const active = !!eligibility[ev.key];
                    return (
                      <motion.div
                        key={ev.key}
                        layout
                        className={`rounded-lg border p-3 text-xs transition ${
                          active ? "border-track/60 bg-track/5" : "border-white/10 text-[var(--ink)]/60"
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer font-bold mb-2">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleDiscipline(ev.key)}
                            className="accent-track"
                          />
                          {ev.name}
                        </label>

                        {active && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.2 }}
                            className="pl-6 space-y-3"
                          >
                            {ev.customDistance && ev.key === "relay" && (
                              <div className="space-y-2.5 surface-inset rounded-lg p-3 border border-white/10">
                                <div className="flex flex-wrap items-end gap-3">
                                  <div>
                                    <label className="field-label !mb-1">Число этапов</label>
                                    <input
                                      type="number"
                                      min={1}
                                      required
                                      placeholder="напр. 4"
                                      value={relayDraft.legsCount}
                                      onChange={(e) => setRelayLegsCount(e.target.value)}
                                      className="field num !w-24"
                                    />
                                  </div>

                                  <div className="flex items-center gap-3 pb-2.5">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
                                      <input
                                        type="radio"
                                        name={`relay-mode-${ev.key}`}
                                        checked={relayDraft.mode === "same"}
                                        onChange={() => setRelayMode("same")}
                                        className="accent-track"
                                      />
                                      Все этапы одинаковые
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold uppercase tracking-wide text-muted">
                                      <input
                                        type="radio"
                                        name={`relay-mode-${ev.key}`}
                                        checked={relayDraft.mode === "custom"}
                                        onChange={() => setRelayMode("custom")}
                                        className="accent-track"
                                      />
                                      Разные дистанции
                                    </label>
                                  </div>
                                </div>

                                {relayDraft.mode === "same" ? (
                                  <div>
                                    <label className="field-label !mb-1">Дистанция этапа (метры)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      required
                                      placeholder="напр. 100"
                                      value={relayDraft.sameDistance}
                                      onChange={(e) => setRelaySameDistance(e.target.value)}
                                      className="field num !w-32"
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
                                            required
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
                                  Общая дистанция эстафеты: {relayTotalDistance} м
                                </p>
                              </div>
                            )}

                            {ev.customDistance && ev.key !== "relay" && (
                              <div>
                                <label className="field-label !mb-1">Дистанция (метры)</label>
                                <input
                                  type="number"
                                  min={1}
                                  required
                                  placeholder="напр. 1000"
                                  value={customParams[ev.key]?.distanceMeters ?? ""}
                                  onChange={(e) => setCustomParam(ev.key, e.target.value)}
                                  className="field num !w-32"
                                />
                              </div>
                            )}

                            {(["м", "ж"] as Gender[]).map((g) => {
                              const genderActive = !!eligibility[ev.key]?.[g];
                              const selectedAgeGroups = eligibility[ev.key]?.[g] ?? [];
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
                                      {ageGroups.map((ag) => {
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
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="primary" type="submit" className="w-full !py-3.5 !text-sm">
          Создать соревнование
        </Button>
      </motion.form>
    </div>
  );
}
