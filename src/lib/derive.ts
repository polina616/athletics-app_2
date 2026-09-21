import { Athlete, Entry, Gender, RelayTeam, Team } from "./types";
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
    // бег — меньше время лучше; прыжки/метания/стрельба/сила — больше лучше
    return ev.cat === "track" ? av - bv : bv - av;
  });

  // Одинаковый результат — одно и то же место, БЕЗ пропусков после связки
  // (1,2,3,3,4,4,5...), а не спортивное competition ranking (1,2,3,3,5...).
  const validRows: ProtocolRow[] = [];
  let lastValue: number | null = null;
  let lastPlace = 0;
  valid.forEach((entry) => {
    const { pts, source } = pointsForEntry(entry);
    const value = entry.resultSeconds as number;
    const place = value === lastValue ? lastPlace : lastPlace + 1;
    lastValue = value;
    lastPlace = place;
    validRows.push({ entry, pts, source, place });
  });
  const invalidRows: ProtocolRow[] = invalid.map((entry) => {
    const { pts, source } = pointsForEntry(entry);
    return { entry, pts, source, place: null };
  });

  return [...validRows, ...invalidRows];
}
export function pointsForRelayTeam(rt: RelayTeam): PointsResult {
  if (rt.status) return { pts: 0, source: "status" };
  if (rt.manualPoints !== null && rt.manualPoints !== undefined) {
    return { pts: Math.round(rt.manualPoints), source: "official" };
  }
  return { pts: rt.autoPoints, source: "estimate" };
}

export interface RelayProtocolRow {
  relayTeam: RelayTeam;
  pts: number;
  source: PointsResult["source"];
  place: number | null;
}

export function relayProtocolRows(relayTeams: RelayTeam[], ageGroup: string, gender: Gender): RelayProtocolRow[] {
  const rows = relayTeams.filter((r) => !r.deleted && r.ageGroup === ageGroup && r.gender === gender);
  const valid = rows.filter((r) => !r.status && r.resultSeconds !== null);
  const invalid = rows.filter((r) => r.status || r.resultSeconds === null);

  valid.sort((a, b) => (a.resultSeconds as number) - (b.resultSeconds as number));

  const validRows = valid.map((relayTeam, idx) => {
    const { pts, source } = pointsForRelayTeam(relayTeam);
    return { relayTeam, pts, source, place: idx + 1 };
  });
  const invalidRows = invalid.map((relayTeam) => {
    const { pts, source } = pointsForRelayTeam(relayTeam);
    return { relayTeam, pts, source, place: null };
  });
  return [...validRows, ...invalidRows];
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  total: number;
}
export function computeTeamStandings(
  entries: Entry[],
  teams: Team[],
  relayTeams: RelayTeam[] = []
): TeamStanding[] {
  const totals = new Map<string, number>();
  for (const t of teams) totals.set(t.id, 0);
  for (const e of entries) {
    if (e.deleted) continue;
    const { pts } = pointsForEntry(e);
    totals.set(e.teamId, (totals.get(e.teamId) ?? 0) + pts);
  }
  for (const r of relayTeams) {
    if (r.deleted) continue;
    const { pts } = pointsForRelayTeam(r);
    totals.set(r.teamId, (totals.get(r.teamId) ?? 0) + pts);
  }
  return teams
    .map((t) => ({ teamId: t.id, teamName: t.name, total: totals.get(t.id) ?? 0 }))
    .sort((a, b) => b.total - a.total);
}

export interface TeamBreakdownRow {
  eventKey: string;
  athleteName: string;
  bib: string | null;
  ageGroup: string;
  gender: Gender;
  status: Entry["status"];
  resultRaw: string;
  pts: number;
  place: number | null;
}

export interface TeamBreakdown {
  teamId: string;
  teamName: string;
  total: number;
  rows: TeamBreakdownRow[];
}

/** Подробная раскладка командного результата: какая дисциплина/спортсмен
 *  сколько очков принёс в общий итог команды, плюс место в протоколе. */
export function teamBreakdowns(
  entries: Entry[],
  teams: Team[],
  relayTeams: RelayTeam[] = [],
  athletes: Athlete[] = []
): TeamBreakdown[] {
  const placeByEntryId = new Map<string, number | null>();
  const combos = new Map<string, { eventKey: string; ageGroup: string; gender: Gender }>();
  for (const e of entries) {
    if (e.deleted) continue;
    const key = JSON.stringify([e.eventKey, e.ageGroup, e.gender]);
    if (!combos.has(key)) combos.set(key, { eventKey: e.eventKey, ageGroup: e.ageGroup, gender: e.gender });
  }
  for (const { eventKey, ageGroup, gender } of combos.values()) {
    for (const row of protocolRows(entries, eventKey, ageGroup, gender)) {
      placeByEntryId.set(row.entry.id, row.place);
    }
  }

  const relayPlaceById = new Map<string, number | null>();
  const relayCombos = new Map<string, { ageGroup: string; gender: Gender }>();
  for (const r of relayTeams) {
    if (r.deleted) continue;
    const key = `${r.ageGroup}__${r.gender}`;
    if (!relayCombos.has(key)) relayCombos.set(key, { ageGroup: r.ageGroup, gender: r.gender });
  }
  for (const { ageGroup, gender } of relayCombos.values()) {
    for (const row of relayProtocolRows(relayTeams, ageGroup, gender)) {
      relayPlaceById.set(row.relayTeam.id, row.place);
    }
  }
  const athleteName = (id: string) => athletes.find((a) => a.id === id)?.fullName ?? "—";

  return teams
    .map((t) => {
      const rows: TeamBreakdownRow[] = entries
        .filter((e) => !e.deleted && e.teamId === t.id)
        .map((e) => {
          const { pts } = pointsForEntry(e);
          return {
            eventKey: e.eventKey,
            athleteName: e.athleteName,
            bib: e.bib,
            ageGroup: e.ageGroup,
            gender: e.gender,
            status: e.status,
            resultRaw: e.resultRaw,
            pts,
            place: placeByEntryId.get(e.id) ?? null,
          };
        });

      const relayRows: TeamBreakdownRow[] = relayTeams
        .filter((r) => !r.deleted && r.teamId === t.id)
        .map((r) => {
          const { pts } = pointsForRelayTeam(r);
          return {
            eventKey: "relay",
            athleteName: r.legAthleteIds.map((id) => (id ? athleteName(id) : "—")).join(" / "),
            bib: null,
            ageGroup: r.ageGroup,
            gender: r.gender,
            status: r.status,
            resultRaw: r.resultRaw,
            pts,
            place: relayPlaceById.get(r.id) ?? null,
          };
        });

      const allRows = [...rows, ...relayRows].sort((a, b) => b.pts - a.pts);
      return { teamId: t.id, teamName: t.name, total: allRows.reduce((s, r) => s + r.pts, 0), rows: allRows };
    })
    .sort((a, b) => b.total - a.total);
}

export interface AllAroundRow {
  athleteId: string;
  athleteName: string;
  bib: string | null;
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
      bib: a.bib,
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
export interface EventTeamStanding {
  eventKey: string;
  eventName: string;
  standings: TeamStanding[];
}

/** Командный зачёт ОТДЕЛЬНО по каждой дисциплине — та же логика, что и
 *  computeTeamStandings(), но entries фильтруются по одной дисциплине за
 *  раз. Возвращает список только по тем дисциплинам, где вообще есть
 *  результаты (хотя бы у одной команды), отсортированный по названию. */
export function teamStandingsByEvent(
  entries: Entry[],
  teams: Team[],
  relayTeams: RelayTeam[] = []
): EventTeamStanding[] {
  const eventKeys = Array.from(new Set(entries.filter((e) => !e.deleted).map((e) => e.eventKey)));

  const result = eventKeys.map((eventKey) => ({
    eventKey,
    eventName: getEvent(eventKey).name,
    standings: computeTeamStandings(entries.filter((e) => e.eventKey === eventKey), teams),
  }));

  const activeRelayTeams = relayTeams.filter((r) => !r.deleted);
  if (activeRelayTeams.length > 0) {
    result.push({
      eventKey: "relay",
      eventName: getEvent("relay").name,
      standings: computeTeamStandings([], teams, activeRelayTeams),
    });
  }

  return result.sort((a, b) => a.eventName.localeCompare(b.eventName, "ru"));
}
export interface AthleteEventBreakdownRow {
  eventKey: string;
  eventName: string;
  status: Entry["status"];
  resultRaw: string;
  pts: number;
  source: PointsResult["source"];
  /** место спортсмена в этой дисциплине (в рамках его категории) */
  place: number | null;
}

/** Детализация одного спортсмена в личном многоборном зачёте: по каждой
 *  дисциплине, в которой у него есть результат — результат, место в этой
 *  дисциплине (в рамках его же возраста/пола) и очки. Используется при
 *  раскрытии строки спортсмена в личном зачёте (StandingsTabs), чтобы
 *  было видно, откуда взялась итоговая сумма. */
export function athleteEventBreakdown(entries: Entry[], athleteId: string): AthleteEventBreakdownRow[] {
  const athleteEntries = entries.filter((e) => !e.deleted && e.athleteId === athleteId);

  // Кэшируем protocolRows по комбинации (дисциплина, возраст, пол) — у
  // одного спортсмена комбинация обычно одна и та же на все его записи,
  // но на всякий случай (правка возраста/пола задним числом) считаем по
  // фактической комбинации каждой записи.
  const comboCache = new Map<string, ProtocolRow[]>();

  const rows: AthleteEventBreakdownRow[] = athleteEntries.map((e) => {
    const comboKey = `${e.eventKey}__${e.ageGroup}__${e.gender}`;
    let catRows = comboCache.get(comboKey);
    if (!catRows) {
      catRows = protocolRows(entries, e.eventKey, e.ageGroup, e.gender);
      comboCache.set(comboKey, catRows);
    }
    const matched = catRows.find((r) => r.entry.id === e.id);
    const { pts, source } = pointsForEntry(e);
    return {
      eventKey: e.eventKey,
      eventName: getEvent(e.eventKey).name,
      status: e.status,
      resultRaw: e.resultRaw,
      pts,
      source,
      place: matched?.place ?? null,
    };
  });

  return rows.sort((a, b) => a.eventName.localeCompare(b.eventName, "ru"));
}
export interface TeamTop3Athlete {
  athleteId: string;
  athleteName: string;
  bib: string | null;
  ageGroup: string;
  gender: Gender;
  /** личная сумма очков по многоборью (все дисциплины, без эстафеты) */
  total: number;
  perEvent: Record<string, number>;
}

export interface TeamTop3Standing {
  teamId: string;
  teamName: string;
  /** до трёх спортсменов с наибольшей личной суммой, зачтённых в команду */
  top3: TeamTop3Athlete[];
  total: number;
}

/** Командный зачёт по системе "три лучших участника": для каждой команды
 *  берём личные суммы (многоборье по всем дисциплинам, БЕЗ эстафеты — она
 *  не привязана к одному спортсмену) всех её спортсменов и суммируем
 *  очки трёх лучших. Если в команде меньше трёх спортсменов с
 *  результатами — считаем по тем, что есть. */
export function computeTeamStandingsTop3(
  entries: Entry[],
  teams: Team[],
  athletes: Athlete[]
): TeamTop3Standing[] {
  const totalsByAthlete = new Map<string, { total: number; perEvent: Record<string, number> }>();
  for (const e of entries) {
    if (e.deleted) continue;
    const { pts } = pointsForEntry(e);
    const cur = totalsByAthlete.get(e.athleteId) ?? { total: 0, perEvent: {} };
    cur.total += pts;
    cur.perEvent[e.eventKey] = (cur.perEvent[e.eventKey] ?? 0) + pts;
    totalsByAthlete.set(e.athleteId, cur);
  }

  return teams
    .map((t) => {
      const teamAthletes = athletes.filter((a) => !a.deleted && a.teamId === t.id);
      const withTotals: TeamTop3Athlete[] = teamAthletes
        .map((a) => {
          const data = totalsByAthlete.get(a.id);
          if (!data || data.total === 0) return null;
          return {
            athleteId: a.id,
            athleteName: a.fullName,
            bib: a.bib,
            ageGroup: a.ageGroup,
            gender: a.gender,
            total: data.total,
            perEvent: data.perEvent,
          };
        })
        .filter((x): x is TeamTop3Athlete => x !== null)
        .sort((a, b) => b.total - a.total);

      const top3 = withTotals.slice(0, 3);
      const total = top3.reduce((s, a) => s + a.total, 0);
      return { teamId: t.id, teamName: t.name, top3, total };
    })
    .sort((a, b) => b.total - a.total);
}
export interface EventTeamTop3Athlete {
  athleteId: string;
  athleteName: string;
  bib: string | null;
  ageGroup: string;
  gender: Gender;
  status: Entry["status"];
  resultRaw: string;
  pts: number;
  /** место в общем протоколе этой дисциплины (не только среди тройки) */
  place: number | null;
}

export interface EventTeamTop3Standing {
  teamId: string;
  teamName: string;
  top3: EventTeamTop3Athlete[];
  total: number;
}

export interface EventTeamStandingsTop3 {
  eventKey: string;
  eventName: string;
  standings: EventTeamTop3Standing[];
}

/** Как teamStandingsByEvent(), но по системе "три лучших участника
 *  команды в этой дисциплине" — для каждой дисциплины отдельно берём трёх
 *  спортсменов команды с наибольшими очками именно в ней (не по общей
 *  многоборной сумме) и суммируем. */
export function teamStandingsByEventTop3(
  entries: Entry[],
  teams: Team[],
  relayTeams: RelayTeam[] = []
): EventTeamStandingsTop3[] {
  const eventKeys = Array.from(new Set(entries.filter((e) => !e.deleted).map((e) => e.eventKey)));

  const result: EventTeamStandingsTop3[] = eventKeys.map((eventKey) => {
    const eventEntries = entries.filter((e) => !e.deleted && e.eventKey === eventKey);

    // Строим места по КАЖДОЙ категории (возраст×пол) этой дисциплины —
    // как protocolRows(), но нужны места сразу по всем категориям вместе.
    const placeByEntryId = new Map<string, number | null>();
    const combos = new Map<string, { ageGroup: string; gender: Gender }>();
    for (const e of eventEntries) {
      const key = `${e.ageGroup}__${e.gender}`;
      if (!combos.has(key)) combos.set(key, { ageGroup: e.ageGroup, gender: e.gender });
    }
    for (const { ageGroup, gender } of combos.values()) {
      for (const row of protocolRows(entries, eventKey, ageGroup, gender)) {
        placeByEntryId.set(row.entry.id, row.place);
      }
    }

    const standings: EventTeamTop3Standing[] = teams
      .map((t) => {
        const teamEntries = eventEntries.filter((e) => e.teamId === t.id);
        const withPts: EventTeamTop3Athlete[] = teamEntries
          .map((e) => {
            const { pts } = pointsForEntry(e);
            return {
              athleteId: e.athleteId,
              athleteName: e.athleteName,
              bib: e.bib,
              ageGroup: e.ageGroup,
              gender: e.gender,
              status: e.status,
              resultRaw: e.resultRaw,
              pts,
              place: placeByEntryId.get(e.id) ?? null,
            };
          })
          .sort((a, b) => b.pts - a.pts);

        const top3 = withPts.slice(0, 3);
        const total = top3.reduce((s, a) => s + a.pts, 0);
        return { teamId: t.id, teamName: t.name, top3, total };
      })
      .sort((a, b) => b.total - a.total);

    return { eventKey, eventName: getEvent(eventKey).name, standings };
  });

  // Эстафета — командная по своей природе (один результат на всю
  // команду, не на спортсмена), поэтому "три лучших участника" к ней не
  // применимо. Показываем как есть (весь результат = очки команды), как
  // в обычном teamStandingsByEvent().
  const activeRelayTeams = relayTeams.filter((r) => !r.deleted);
  if (activeRelayTeams.length > 0) {
    const relayStandings = computeTeamStandings([], teams, activeRelayTeams);
    result.push({
      eventKey: "relay",
      eventName: getEvent("relay").name,
      standings: relayStandings.map((s) => ({ teamId: s.teamId, teamName: s.teamName, top3: [], total: s.total })),
    });
  }

  return result.sort((a, b) => a.eventName.localeCompare(b.eventName, "ru"));
}
