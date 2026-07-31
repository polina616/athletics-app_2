import { Athlete, Entry, Gender, Team } from "./types";
import { getEvent } from "./scoring";

export interface PointsResult {
  pts: number;
  source: "official" | "estimate" | "status";
}

/** Очки одного результата: статус (DNS/DNF/DQ/NM) → 0; иначе ручные
 *  (официальные) очки, если заданы, иначе автоматическая оценка. */
export function pointsForEntry(entry: Entry): PointsResult {
  if (entry.status) return { pts: 0, source: "status" };
  if (entry.manualPoints !== null && entry.manualPoints !== undefined) {
    return { pts: Math.round(entry.manualPoints), source: "official" };
  }
  return { pts: entry.autoPoints, source: "estimate" };
}

export interface ProtocolRow {
  entry: Entry;
  pts: number;
  source: PointsResult["source"];
  /** null — для DNS/DNF/DQ/NM, у них нет места */
  place: number | null;
}

/** Строки протокола ОДНОЙ дисциплины в рамках ОДНОЙ категории
 *  (возраст × пол), отсортированные по фактическому результату — а не по
 *  очкам. Так места расставляются корректно, даже если у слабых участников
 *  очки минимальны или совпадают. Статусы (ДНС/ДФ/ДСК/Х) идут внизу без
 *  места. */
export function protocolRows(entries: Entry[], eventKey: string, ageGroup: string, gender: Gender): ProtocolRow[] {
  const ev = getEvent(eventKey);
  const rows = entries.filter(
    (e) => !e.deleted && e.eventKey === eventKey && e.ageGroup === ageGroup && e.gender === gender
  );

  const valid = rows.filter((e) => !e.status && e.resultSeconds !== null);
  const invalid = rows.filter((e) => e.status || e.resultSeconds === null);

  valid.sort((a, b) => {
    const av = a.resultSeconds as number;
    const bv = b.resultSeconds as number;
    // бег — меньше время лучше; прыжки/метания/стрельба — больше лучше
    return ev.cat === "track" ? av - bv : bv - av;
  });

  const validRows: ProtocolRow[] = valid.map((entry, idx) => {
    const { pts, source } = pointsForEntry(entry);
    return { entry, pts, source, place: idx + 1 };
  });

  const invalidRows: ProtocolRow[] = invalid.map((entry) => {
    const { pts, source } = pointsForEntry(entry);
    return { entry, pts, source, place: null };
  });

  return [...validRows, ...invalidRows];
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  total: number;
}

export function computeTeamStandings(entries: Entry[], teams: Team[]): TeamStanding[] {
  const totals = new Map<string, number>();
  for (const t of teams) totals.set(t.id, 0);
  for (const e of entries) {
    if (e.deleted) continue;
    const { pts } = pointsForEntry(e);
    totals.set(e.teamId, (totals.get(e.teamId) ?? 0) + pts);
  }
  return teams
    .map((t) => ({ teamId: t.id, teamName: t.name, total: totals.get(t.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);
}

export interface TeamBreakdownRow {
  eventKey: string;
  athleteName: string;
  ageGroup: string;
  gender: Gender;
  status: Entry["status"];
  resultRaw: string;
  pts: number;
}

export interface TeamBreakdown {
  teamId: string;
  teamName: string;
  total: number;
  rows: TeamBreakdownRow[];
}

/** Подробная раскладка командного результата: какая дисциплина/спортсмен
 *  сколько очков принёс в общий итог команды. */
export function teamBreakdowns(entries: Entry[], teams: Team[]): TeamBreakdown[] {
  return teams
    .map((t) => {
      const rows: TeamBreakdownRow[] = entries
        .filter((e) => !e.deleted && e.teamId === t.id)
        .map((e) => {
          const { pts } = pointsForEntry(e);
          return {
            eventKey: e.eventKey,
            athleteName: e.athleteName,
            ageGroup: e.ageGroup,
            gender: e.gender,
            status: e.status,
            resultRaw: e.resultRaw,
            pts,
          };
        })
        .sort((a, b) => b.pts - a.pts);
      return { teamId: t.id, teamName: t.name, total: rows.reduce((s, r) => s + r.pts, 0), rows };
    })
    .sort((a, b) => b.total - a.total);
}

export interface AllAroundRow {
  athleteId: string;
  athleteName: string;
  teamName: string;
  ageGroup: string;
  gender: Gender;
  perEvent: Record<string, number>; // eventKey -> очки
  total: number;
  place: number;
}

/** Личный зачёт (многоборье): сумма очков спортсмена по ВСЕМ дисциплинам,
 *  в которых он участвовал, места считаются отдельно в рамках каждой
 *  категории (возраст × пол). Возвращает Map "возраст__пол" -> строки. */
export function personalAllAround(entries: Entry[], athletes: Athlete[], teams: Team[]): Map<string, AllAroundRow[]> {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const byAthlete = new Map<string, AllAroundRow>();

  for (const a of athletes) {
    if (a.deleted) continue;
    byAthlete.set(a.id, {
      athleteId: a.id,
      athleteName: a.fullName,
      teamName: teamName(a.teamId),
      ageGroup: a.ageGroup,
      gender: a.gender,
      perEvent: {},
      total: 0,
      place: 0,
    });
  }

  for (const e of entries) {
    if (e.deleted) continue;
    const row = byAthlete.get(e.athleteId);
    if (!row) continue;
    const { pts } = pointsForEntry(e);
    row.perEvent[e.eventKey] = (row.perEvent[e.eventKey] ?? 0) + pts;
    row.total += pts;
  }

  const byCategory = new Map<string, AllAroundRow[]>();
  for (const row of byAthlete.values()) {
    const key = `${row.ageGroup}__${row.gender}`;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(row);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => b.total - a.total);
    list.forEach((r, idx) => (r.place = idx + 1));
  }

  return byCategory;
}

/** Сколько результатов внесено по каждой дисциплине — используется в
 *  ChartsPanel для графика "заполненность протоколов". */
export function eventCoverage(entries: Entry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (e.deleted) continue;
    map[e.eventKey] = (map[e.eventKey] ?? 0) + 1;
  }
  return map;
}