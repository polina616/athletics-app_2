"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/db";
import { computeTeamStandings, eventCoverage } from "@/lib/derive";
import { EVENTS } from "@/lib/scoring";

const tooltipStyle = {
  background: "#171B24",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#F2F4F8",
};

export default function ChartsPanel({ meetId }: { meetId: string }) {
  const teams =
    useLiveQuery(() => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(), [meetId]) ?? [];
  const entries =
    useLiveQuery(() => db.entries.where({ meetId }).filter((e) => !e.deleted).toArray(), [meetId]) ?? [];

  const standings = computeTeamStandings(entries, teams);
  const coverage = eventCoverage(entries);
  const coverageData = EVENTS.filter((e) => coverage[e.key]).map((e) => ({
    name: e.name,
    count: coverage[e.key] ?? 0,
  }));

  return (
    <div className="grid gap-4">
      <div className="card-flat p-5 rounded-xl">
        <h3 className="font-display text-lg tracking-wide mb-3">Командный зачёт — сумма очков</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={standings} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" opacity={0.08} vertical={false} />
              <XAxis
                dataKey="teamName"
                tick={{ fontSize: 10, fill: "#8A93A6" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fontSize: 10, fill: "#8A93A6" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#E0442C" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-flat p-5 rounded-xl">
        <h3 className="font-display text-lg tracking-wide mb-3">Заполненность протоколов по видам</h3>
        {coverageData.length === 0 ? (
          <p className="text-xs text-muted italic">Результатов пока нет</p>
        ) : (
          <div style={{ width: "100%", height: Math.max(220, coverageData.length * 32) }}>
            <ResponsiveContainer>
              <BarChart data={coverageData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" opacity={0.08} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#8A93A6" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8A93A6" }} width={140} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#1E4FCB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}