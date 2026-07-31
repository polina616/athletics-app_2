"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { EVENTS } from "@/lib/scoring";
import { personalAllAround } from "@/lib/derive";
import ProtocolTable from "./ProtocolTable";
import StandingsTable from "./StandingsTable";
import ChartsPanel from "./ChartsPanel";

type Tab = "protocols" | "individual" | "teams" | "charts";

export default function StandingsTabs({ meetId }: { meetId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("protocols");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const entries = useLiveQuery(
    () => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(),
    [meetId]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  if (!meet || !entries || !athletes || !teams) return null;

  const eventKeys = meet.eventEligibility.map((el) => el.eventKey);
  const currentEvent = selectedEvent && eventKeys.includes(selectedEvent) ? selectedEvent : eventKeys[0];
  const allAroundByCategory = personalAllAround(entries, athletes, teams);

  const tabs: { key: Tab; label: string }[] = [
    { key: "protocols", label: "📋 Протоколы дисциплин" },
    { key: "individual", label: "🥇 Личный многоборный зачёт" },
    { key: "teams", label: "🏆 Общекомандный зачёт" },
    { key: "charts", label: "📊 Аналитика" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-white/10 gap-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-3 font-bold text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === t.key
                ? "border-track text-[#F2F4F8]"
                : "border-transparent text-muted hover:text-[#F2F4F8]/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "protocols" && (
        <div className="space-y-4">
          {eventKeys.length === 0 ? (
            <p className="text-sm text-muted italic">
              В соревновании ещё нет ни одной дисциплины (задайте их при создании соревнования).
            </p>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {eventKeys.map((key) => {
                  const ev = EVENTS.find((e) => e.key === key);
                  const isActive = currentEvent === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedEvent(key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                        isActive
                          ? "bg-track border-track text-white shadow-card"
                          : "bg-white/[0.03] border-white/10 text-muted hover:text-[#F2F4F8] hover:border-white/20"
                      }`}
                    >
                      {ev?.name || key}
                    </button>
                  );
                })}
              </div>
              {currentEvent && <ProtocolTable meetId={meetId} eventKey={currentEvent} />}
            </>
          )}
        </div>
      )}

      {activeTab === "individual" && (
        <div className="card-flat p-5 rounded-xl space-y-6">
          <h3 className="text-lg font-bold">Личный зачёт (сумма очков по всем дисциплинам)</h3>

          {allAroundByCategory.size === 0 ? (
            <p className="text-xs text-muted italic">Результатов пока нет</p>
          ) : (
            [...allAroundByCategory.entries()].map(([catKey, rows]) => {
              const [ageGroup, gender] = catKey.split("__");
              return (
                <div key={catKey} className="space-y-2">
                  <div className="eyebrow text-blue border-b border-white/10 pb-1.5">
                    {ageGroup} • {gender === "м" ? "Юноши" : "Девушки"}
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted border-b border-white/10 font-bold uppercase text-[10px] tracking-wide">
                      <tr>
                        <th className="py-2 w-8">№</th>
                        <th className="py-2">Спортсмен</th>
                        <th className="py-2">Команда</th>
                        <th className="py-2">Видов</th>
                        <th className="py-2 text-right">Всего очков</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((r) => (
                        <tr key={r.athleteId} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-2 font-bold num text-muted">{r.place}</td>
                          <td className="py-2 font-medium">{r.athleteName}</td>
                          <td className="py-2 text-muted">{r.teamName}</td>
                          <td className="py-2 num text-muted">{Object.keys(r.perEvent).length}</td>
                          <td className="py-2 text-right num font-bold text-track text-sm">{r.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "teams" && <StandingsTable meetId={meetId} />}

      {activeTab === "charts" && <ChartsPanel meetId={meetId} />}
    </div>
  );
}