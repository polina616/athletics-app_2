"use client";

import { useState } from "react";
import { createMeet, addTeamsBulk } from "@/lib/actions";
import { EVENT_GROUPS } from "@/lib/scoring";
import { EventEligibility, Gender } from "@/lib/types";

interface Props {
  ownerId: string;
  onCreated?: (id: string) => void;
}

type EligibilityDraft = Record<string, { ageGroups: string[]; genders: Gender[] }>;

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

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <div className="eyebrow text-track mb-1.5">Новый протокол</div>
        <h1 className="font-display text-4xl tracking-wide">Новое соревнование</h1>
      </div>
      <form
        onSubmit={handleCreate}
        className="space-y-5 rounded-xl border border-white/10 p-6 bg-[#12151C] shadow-card"
      >
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Название соревнования</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Первенство области по лёгкой атлетике"
            className="w-full bg-[#171B24] border border-white/10 rounded-lg p-3 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Дата</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-3 text-sm num text-[#F2F4F8] outline-none focus:border-track transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Место проведения</label>
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Стадион 'Олимпиец'"
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-3 text-sm text-[#F2F4F8] outline-none focus:border-track transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">
            Возрастные группы (по одной на строку)
          </label>
          <textarea
            rows={3}
            value={ageGroupsText}
            onChange={(e) => setAgeGroupsText(e.target.value)}
            className="w-full bg-[#171B24] border border-white/10 rounded-lg p-3 text-sm num text-[#F2F4F8] outline-none focus:border-track transition"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">
            Заявленные команды (по одной на строку)
          </label>
          <textarea
            rows={3}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
            className="w-full bg-[#171B24] border border-white/10 rounded-lg p-3 text-sm num text-[#F2F4F8] outline-none focus:border-track transition"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted">
              Дисциплины соревнования — и кто в них допущен
            </label>
            <p className="text-[11px] text-muted mt-0.5">
              Отметьте дисциплину, затем укажите для неё пол и возрастные группы. При заполнении
              результатов список спортсменов будет отфильтрован именно по этим условиям.
            </p>
          </div>

          {EVENT_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="eyebrow">{group.label}</div>
              <div className="space-y-2">
                {group.events.map((ev) => {
                  const active = !!eligibility[ev.key];
                  return (
                    <div
                      key={ev.key}
                      className={`rounded-lg border p-3 text-xs transition ${
                        active
                          ? "border-track/60 bg-track/5"
                          : "border-white/10 text-[#F2F4F8]/60"
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
                        <div className="pl-6 space-y-2">
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
                                      : "border-white/10 text-[#F2F4F8]/70 hover:border-white/20"
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-track hover:bg-track-dark text-white font-bold rounded-lg py-3.5 text-sm transition shadow-card"
        >
          Создать соревнование
        </button>
      </form>
    </div>
  );
}