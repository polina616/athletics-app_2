import { db } from "./db";
import { pointsForEntry, pointsForRelayTeam, protocolRows, relayProtocolRows } from "./derive";
import { EVENTS, formatSeconds, getEvent } from "./scoring";
import { Entry, Gender, Meet, RelayTeam, STATUS_LABELS, Team } from "./types";

function csvCell(v: unknown): string {
  return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}

/** Пары "возрастная группа × пол" для одной дисциплины, в порядке
 *  возрастных групп (как заданы в настройках) и с юношами перед
 *  девушками — та же логика, что в ProtocolTable/RelayProtocolTable, но
 *  без React, т.к. нужна только для формирования CSV. */
function eventPairs(meet: Meet, eventKey: string): { ag: string; g: Gender }[] {
  const eligibilityRows = meet.eventEligibility.filter((el) => el.eventKey === eventKey);
  const pairs: { ag: string; g: Gender }[] = [];
  const seen = new Set<string>();
  const addPair = (ag: string, g: Gender) => {
    const key = `${ag}__${g}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ ag, g });
    }
  };

  if (eligibilityRows.length > 0) {
    for (const el of eligibilityRows) {
      const ags = el.ageGroups.length ? el.ageGroups : meet.ageGroups;
      const gs: Gender[] = el.genders.length ? el.genders : ["м", "ж"];
      for (const ag of ags) for (const g of gs) addPair(ag, g);
    }
  } else {
    for (const ag of meet.ageGroups) for (const g of ["м", "ж"] as Gender[]) addPair(ag, g);
  }

  pairs.sort((a, b) => {
    const ai = meet.ageGroups.indexOf(a.ag);
    const bi = meet.ageGroups.indexOf(b.ag);
    if (ai !== bi) return ai - bi;
    if (a.g === b.g) return 0;
    return a.g === "м" ? -1 : 1;
  });
  return pairs;
}

function isEligible(meet: Meet, eventKey: string, ag: string, g: Gender): boolean {
  return meet.eventEligibility.some(
    (el) => el.eventKey === eventKey && el.ageGroups.includes(ag) && el.genders.includes(g)
  );
}

function resultText(eventKey: string, entry: Entry): string {
  if (entry.status) return STATUS_LABELS[entry.status];
  const ev = getEvent(eventKey);
  if (ev.cat === "track") return formatSeconds(entry.resultSeconds ?? NaN);
  if (ev.cat === "strength") return `${entry.resultSeconds ?? "—"} раз`;
  return `${entry.resultSeconds ?? "—"} м`;
}

/**
 * Таблица 1 — общая сводная: команды по строкам, возрастные группы →
 * дисциплины → пол по столбцам (три строки заголовка, т.к. CSV не умеет
 * объединять ячейки). Значение в ячейке — сумма очков команды в этой
 * возрастной группе/дисциплине/поле; "—" — если категория не допущена к
 * этой дисциплине вовсе (в отличие от 0 — допущена, но очков ноль).
 * Команды отсортированы по итоговой сумме (месту), как и все остальные
 * таблицы экспорта.
 */
function buildOverviewTable(meet: Meet, teams: Team[], entries: Entry[]): string[] {
  const ageGroups = meet.ageGroups;
  const eventsByAgeGroup = ageGroups.map((ag) => {
    const keys = new Set(
      meet.eventEligibility.filter((el) => el.eventKey !== "relay" && el.ageGroups.includes(ag)).map((el) => el.eventKey)
    );
    return { ag, events: EVENTS.filter((e) => keys.has(e.key)) };
  });

  const headerRow1: string[] = ["", ""];
  const headerRow2: string[] = ["", ""];
  const headerRow3: string[] = ["Место", "Команда"];

  for (const { ag, events } of eventsByAgeGroup) {
    for (const ev of events) {
      headerRow1.push(ag, ag);
      headerRow2.push(ev.name, ev.name);
      headerRow3.push("Ю", "Д");
    }
  }
  headerRow1.push("");
  headerRow2.push("");
  headerRow3.push("Итого");

  const sumPoints = (teamId: string, ag: string, eventKey: string, g: Gender) =>
    entries
      .filter((e) => !e.deleted && e.teamId === teamId && e.ageGroup === ag && e.eventKey === eventKey && e.gender === g)
      .reduce((s, e) => s + pointsForEntry(e).pts, 0);

  const teamRows = teams.map((t) => {
    const cells: (string | number)[] = [];
    let total = 0;
    for (const { ag, events } of eventsByAgeGroup) {
      for (const ev of events) {
        (["м", "ж"] as Gender[]).forEach((g) => {
          if (!isEligible(meet, ev.key, ag, g)) {
            cells.push("—");
            return;
          }
          const pts = sumPoints(t.id, ag, ev.key, g);
          total += pts;
          cells.push(pts);
        });
      }
    }
    return { team: t, cells, total };
  });

  teamRows.sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name, "ru"));

  const rows = [headerRow1, headerRow2, headerRow3].map(csvRow);
  teamRows.forEach((r, idx) => {
    rows.push(csvRow([idx + 1, r.team.name, ...r.cells, r.total]));
  });
  return rows;
}

/**
 * Таблица 2 — эстафета отдельно: состав (каждый этап с новой строки в
 * одной ячейке), команда, возрастная категория (с полом), результат
 * временем, результат очками, место. Строки идут по категориям
 * (возраст × пол) друг за другом, внутри категории — по месту.
 */
function buildRelayTable(meet: Meet, relayTeams: RelayTeam[], teams: Team[], athletes: { id: string; bib: string | null; fullName: string }[]): string[] {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const athleteLabel = (id: string) => {
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.bib ? `№${a.bib} ` : ""}${a.fullName}` : "—";
  };

  const rows = [csvRow(["Состав команды", "Название команды", "Возрастная категория", "Результат (время)", "Результат (очки)", "Место"])];

  const pairs = eventPairs(meet, "relay");
  for (const { ag, g } of pairs) {
    const catRows = relayProtocolRows(relayTeams, ag, g);
    for (const { relayTeam, place } of catRows) {
      const composition = relayTeam.legAthleteIds.map((id) => (id ? athleteLabel(id) : "—")).join("\n");
      const timeText = relayTeam.status
        ? STATUS_LABELS[relayTeam.status]
        : relayTeam.resultSeconds !== null
        ? formatSeconds(relayTeam.resultSeconds)
        : "—";
      const { pts } = pointsForRelayTeam(relayTeam);
      rows.push(
        csvRow([
          composition,
          teamName(relayTeam.teamId),
          `${ag} (${g === "м" ? "Ю" : "Д"})`,
          timeText,
          pts,
          place ?? "—",
        ])
      );
    }
  }
  return rows;
}

/**
 * Таблицы 3+ — отдельная таблица на каждую пару "дисциплина × возрастная
 * категория × пол", уже отсортированная по месту (см. protocolRows).
 * Категории без единого внесённого результата пропускаются, чтобы не
 * плодить пустые таблицы.
 */
function buildDisciplineTables(meet: Meet, entries: Entry[], teams: Team[]): string[] {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const eventKeys = Array.from(new Set(meet.eventEligibility.map((el) => el.eventKey))).filter(
    (key) => key !== "relay" && EVENTS.some((e) => e.key === key)
  );
  const orderedKeys = EVENTS.filter((e) => eventKeys.includes(e.key)).map((e) => e.key);

  const rows: string[] = [];
  for (const eventKey of orderedKeys) {
    const ev = getEvent(eventKey);
    for (const { ag, g } of eventPairs(meet, eventKey)) {
      const catRows = protocolRows(entries, eventKey, ag, g);
      if (catRows.length === 0) continue;

      rows.push(csvRow([`Дисциплина: ${ev.name} — ${ag} (${g === "м" ? "Ю" : "Д"})`]));
      rows.push(csvRow(["Место", "№", "ФИО", "Команда", "Результат", "Очки"]));
      for (const r of catRows) {
        rows.push(
          csvRow([
            r.place ?? "—",
            r.entry.bib ?? "",
            r.entry.athleteName,
            teamName(r.entry.teamId),
            resultText(eventKey, r.entry),
            r.pts,
          ])
        );
      }
      rows.push("");
    }
  }
  return rows;
}

export async function exportCsv(meetId: string): Promise<void> {
  const meet = await db.meets.get(meetId);
  if (!meet) return;
  const teams = (await db.teams.where({ meetId }).toArray()).filter((t) => !t.deleted);
  const entries = (await db.entries.where({ meetId }).toArray()).filter((e) => !e.deleted);
  const relayTeams = (await db.relayTeams.where({ meetId }).toArray()).filter((r) => !r.deleted);
  const athletes = (await db.athletes.where({ meetId }).toArray()).filter((a) => !a.deleted);

  const lines: string[] = [];

  lines.push(csvRow([`Общая таблица команд — ${meet.name}`]));
  lines.push(...buildOverviewTable(meet, teams, entries));
  lines.push("");
  lines.push("");

  if (relayTeams.length > 0) {
    lines.push(csvRow(["Эстафета"]));
    lines.push(...buildRelayTable(meet, relayTeams, teams, athletes));
    lines.push("");
    lines.push("");
  }

  lines.push(...buildDisciplineTables(meet, entries, teams));

  const csv = lines.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${meet.name ?? "meet"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
