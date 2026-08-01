"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createMeet, addTeamsBulk } from "@/lib/actions";
import { EVENT_GROUPS } from "@/lib/scoring";
import { EventEligibility, Gender } from "@/lib/types";
import Button from "./ui/Button";
import { IconJump, IconRunning, IconShooting, IconThrow } from "./ui/icons";
import ParallaxHero from "./ui/Parallaxhero";

interface Props {
  ownerId: string;
  onCreated?: (id: string) => void;
}

type EligibilityDraft = Record<string, { ageGroups: string[]; genders: Gender[] }>;

const groupIcon: Record<string, (props: any) => JSX.Element> = {
  "Бег": IconRunning,
  "Прыжки": IconJump,
  "Метания": IconThrow,
  "Стрельба": IconShooting,
};

export default function MeetSetup({ ownerId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teamsText, setTeamsText] = useState("Центральный район\nЗаречный район\nЮжный район");
  const [ageGroupsText, setAgeGroupsText] = useState(
    "2012-2013 гг.р.\n2010-2011 гг.р.\n2008-2009 гг.р."
  );
  const [eligibility, setEligibility] = useState<EligibilityDraft>({});

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
        next[key] = { ageGroups: [...ageGroups], genders: ["м", "ж"] };
      }
      return next;
    });
  }

  function toggleAgeGroupForEvent(key: string, ag: string) {
    setEligibility((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const has = cur.ageGroups.includes(ag);
      return {
        ...prev,
        [key]: { ...cur, ageGroups: has ? cur.ageGroups.filter((x) => x !== ag) : [...cur.ageGroups, ag] },
      };
    });
  }

  function toggleGenderForEvent(key: string, g: Gender) {
    setEligibility((prev) => {
      const cur = prev[key];
      if (!cur) return prev;
      const has = cur.genders.includes(g);
      return {
        ...prev,
        [key]: { ...cur, genders: has ? cur.genders.filter((x) => x !== g) : [...cur.genders, g] },
      };
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const teams = teamsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (teams.length === 0 || ageGroups.length === 0 || Object.keys(eligibility).length === 0) {
      alert("Укажите хотя бы одну команду, возрастную группу и дисциплину!");
      return;
    }

    const eventEligibility: EventEligibility[] = Object.entries(eligibility).map(([eventKey, v]) => ({
      eventKey,
      ageGroups: v.ageGroups,
      genders: v.genders,
    }));

    const meet = await createMeet(ownerId, name, date || null, place || null, ageGroups, eventEligibility);
    await addTeamsBulk(meet.id, teams);

    if (onCreated) onCreated(meet.id);
  }

  const selectedCount = Object.keys(eligibility).length;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
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
                Отметьте дисциплину, затем укажите для неё пол и возрастные группы.
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
                            className="pl-6 space-y-2"
                          >
                            <div className="flex gap-3">
                              {(["м", "ж"] as Gender[]).map((g) => (
                                <label key={g} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={eligibility[ev.key].genders.includes(g)}
                                    onChange={() => toggleGenderForEvent(ev.key, g)}
                                    className="accent-track"
                                  />
                                  {g === "м" ? "Юноши" : "Девушки"}
                                </label>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {ageGroups.map((ag) => {
                                const checked = eligibility[ev.key].ageGroups.includes(ag);
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
                                      onChange={() => toggleAgeGroupForEvent(ev.key, ag)}
                                    />
                                    {ag}
                                  </label>
                                );
                              })}
                            </div>
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
