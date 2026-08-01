"use client";

import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/db";
import { computeTeamStandings, eventCoverage } from "@/lib/derive";
import { EVENTS } from "@/lib/scoring";
import EmptyState from "./ui/EmptyState";

const tooltipStyle = {
  background: "#171B24",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  fontSize: 12,
  color: "#F2F4F8",
  boxShadow: "0 12px 30px -10px rgba(0,0,0,0.6)",
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="card-flat p-5 rounded-xl"
      >
        <h3 className="font-display text-lg tracking-wide mb-3">Командный зачёт — сумма очков</h3>
        {standings.length === 0 ? (
          <EmptyState title="Команды ещё не добавлены" />
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={standings} margin={{ left: 0, right: 10 }}>
                <defs>
                  <linearGradient id="trackGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6A4D" />
                    <stop offset="100%" stopColor="#B8341F" />
                  </linearGradient>
                </defs>
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
                <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="url(#trackGradient)" animationDuration={700} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="card-flat p-5 rounded-xl"
      >
        <h3 className="font-display text-lg tracking-wide mb-3">Заполненность протоколов по видам</h3>
        {coverageData.length === 0 ? (
          <EmptyState title="Результатов пока нет" />
        ) : (
          <div style={{ width: "100%", height: Math.max(220, coverageData.length * 32) }}>
            <ResponsiveContainer>
              <BarChart data={coverageData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1E4FCB" />
                    <stop offset="100%" stopColor="#5B8CFF" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#FFFFFF" opacity={0.08} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#8A93A6" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8A93A6" }} width={140} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="url(#blueGradient)" animationDuration={700} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
}
