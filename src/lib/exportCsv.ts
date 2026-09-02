import { db } from "./db";
import { computeTeamStandings, pointsForEntry } from "./derive";
import { getEvent } from "./scoring";
import { STATUS_LABELS } from "./types";

function csvCell(v: unknown): string {
  return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
}

export async function exportCsv(meetId: string): Promise<void> {
  const meet = await db.meets.get(meetId);
  const teams = (await db.teams.where({ meetId }).toArray()).filter((t) => !t.deleted);
  const entries = (await db.entries.where({ meetId }).toArray()).filter((e) => !e.deleted);
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";

  const header = ["Номер", "Дисциплина", "Возраст", "Пол", "Команда", "ФИО", "Результат", "Статус", "Очки", "Источник очков"];
  const rows = entries.map((e) => {
    const ev = getEvent(e.eventKey);
    const { pts, source } = pointsForEntry(e);
    return [
      e.bib ?? "",
      ev.name,
      e.ageGroup,
      e.gender,
      teamName(e.teamId),
      e.athleteName,
      e.status ? "" : e.resultRaw,
      e.status ? STATUS_LABELS[e.status] : "ОК",
      pts,
      source === "official" ? "официальные" : source === "estimate" ? "оценка" : "—",
    ];
  });

  const standings = computeTeamStandings(entries, teams);
  const standingsRows = standings.map((s, i) => ["", "", "", "", "", `${i + 1}. ${s.teamName}`, "", "", s.total, ""]);

  const all = [header, ...rows, [], ["", "", "", "", "", "Командный зачёт", "", "", "", ""], ...standingsRows];
  const csv = all.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meet?.name ?? "meet"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}