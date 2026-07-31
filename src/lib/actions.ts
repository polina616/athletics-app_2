import { v4 as uuid } from "uuid";
import { db } from "./db";
import { fullSync } from "./sync";
import { AgeGroup, Athlete, Entry, EventEligibility, Gender, Meet, ResultStatus, Team } from "./types";
import { computeAutoPoints, getEvent, parseResult } from "./scoring";

function nowIso() {
  return new Date().toISOString();
}

/** Fire-and-forget фоновая синхронизация — UI никогда её не ждёт, поэтому
 *  не блокируется на сети даже когда есть интернет. */
function kickSync(meetId: string) {
  void fullSync(meetId);
}

export async function createMeet(
  ownerId: string,
  name: string,
  date: string | null,
  place: string | null,
  ageGroups: string[],
  eventEligibility: EventEligibility[]
): Promise<Meet> {
  const meet: Meet = {
    id: uuid(),
    ownerId,
    name,
    date,
    place,
    ageGroups,
    eventEligibility,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    dirty: true,
  };
  await db.meets.put(meet);
  kickSync(meet.id);
  return meet;
}

export async function addTeam(meetId: string, name: string): Promise<Team> {
  const team: Team = {
    id: uuid(),
    meetId,
    name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deleted: false,
    dirty: true,
  };
  await db.teams.put(team);
  kickSync(meetId);
  return team;
}

export async function addTeamsBulk(meetId: string, names: string[]): Promise<void> {
  const teams: Team[] = names
    .map((n) => n.trim())
    .filter(Boolean)
    .map((name) => ({
      id: uuid(),
      meetId,
      name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deleted: false,
      dirty: true,
    }));
  await db.teams.bulkPut(teams);
  kickSync(meetId);
}

/** Сохраняет спортсмена один раз — дальше он выбирается из справочника при
 *  внесении результатов по любой дисциплине, без повторного ввода ФИО. */
export async function addAthlete(
  meetId: string,
  teamId: string,
  fullName: string,
  ageGroup: AgeGroup,
  gender: Gender
): Promise<Athlete> {
  const athlete: Athlete = {
    id: uuid(),
    meetId,
    teamId,
    fullName: fullName.trim(),
    ageGroup,
    gender,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deleted: false,
    dirty: true,
  };
  await db.athletes.put(athlete);
  kickSync(meetId);
  return athlete;
}

export async function updateAthlete(
  id: string,
  meetId: string,
  patch: Partial<Pick<Athlete, "fullName" | "teamId" | "ageGroup" | "gender">>
): Promise<void> {
  const a = await db.athletes.get(id);
  if (!a) return;
  await db.athletes.put({ ...a, ...patch, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);

  // Держим уже внесённые результаты в согласованном состоянии: если у
  // спортсмена поменялась команда/возраст/пол — старые Entry обновляем
  // тоже, иначе протокол и командный зачёт "разъедутся" с реальностью.
  if (patch.teamId || patch.ageGroup || patch.gender) {
    const entries = await db.entries.where({ meetId, athleteId: id }).toArray();
    await db.transaction("rw", db.entries, async () => {
      for (const e of entries) {
        if (e.deleted) continue;
        await db.entries.update(e.id, {
          teamId: patch.teamId ?? e.teamId,
          ageGroup: patch.ageGroup ?? e.ageGroup,
          gender: patch.gender ?? e.gender,
          athleteName: patch.fullName ?? e.athleteName,
          updatedAt: nowIso(),
          dirty: true,
        });
      }
    });
    kickSync(meetId);
  }
}

export async function deleteAthlete(id: string, meetId: string): Promise<void> {
  const a = await db.athletes.get(id);
  if (!a) return;
  await db.athletes.put({ ...a, deleted: true, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}

export interface NewEntryInput {
  meetId: string;
  eventKey: string;
  athleteId: string;
  /** DNS/DNF/DQ/NM — если задано, результат/очки игнорируются, очки = 0 */
  status: ResultStatus | null;
  resultRaw: string; // пусто, если status задан
  manualPoints: number | null;
}

export async function addEntry(input: NewEntryInput): Promise<Entry> {
  const ev = getEvent(input.eventKey);
  const athlete = await db.athletes.get(input.athleteId);
  if (!athlete) throw new Error("Спортсмен не найден в справочнике");

  let resultSeconds: number | null = null;
  let auto = 0;
  let resultRaw = "";

  if (!input.status) {
    const value = parseResult(ev, input.resultRaw);
    resultSeconds = Number.isNaN(value) ? null : value;
    auto = computeAutoPoints(ev, athlete.gender, value);
    resultRaw = input.resultRaw.trim();
  }

  const existingCount = await db.entries.where({ meetId: input.meetId }).count();
  const entry: Entry = {
    id: uuid(),
    meetId: input.meetId,
    teamId: athlete.teamId,
    eventKey: input.eventKey,
    ageGroup: athlete.ageGroup,
    gender: athlete.gender,
    athleteId: athlete.id,
    athleteName: athlete.fullName,
    bib: String(existingCount + 1).padStart(3, "0"),
    status: input.status,
    resultRaw,
    resultSeconds,
    manualPoints: input.status ? null : input.manualPoints,
    autoPoints: input.status ? 0 : auto,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    deleted: false,
    dirty: true,
  };
  await db.entries.put(entry);
  kickSync(input.meetId);
  return entry;
}

export interface UpdateEntryInput {
  /** DNS/DNF/DQ/NM — если задано, результат/очки игнорируются, очки = 0 */
  status: ResultStatus | null;
  resultRaw: string; // пусто, если status задан
  manualPoints: number | null;
}

/** Корректировка уже внесённого результата: смена статуса (ДНС/ДФ/ДСК/Х),
 *  самого результата или проставление официальных очков вручную (они
 *  всегда полностью заменяют автоматическую оценку). */
export async function updateEntry(entryId: string, meetId: string, input: UpdateEntryInput): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry) return;
  const ev = getEvent(entry.eventKey);
  const athlete = await db.athletes.get(entry.athleteId);

  let resultSeconds: number | null = null;
  let auto = 0;
  let resultRaw = "";

  if (!input.status) {
    const value = parseResult(ev, input.resultRaw);
    resultSeconds = Number.isNaN(value) ? null : value;
    auto = computeAutoPoints(ev, athlete?.gender ?? entry.gender, value);
    resultRaw = input.resultRaw.trim();
  }

  await db.entries.put({
    ...entry,
    status: input.status,
    resultRaw,
    resultSeconds,
    manualPoints: input.status ? null : input.manualPoints,
    autoPoints: input.status ? 0 : auto,
    updatedAt: nowIso(),
    dirty: true,
  });
  kickSync(meetId);
}

export async function deleteEntry(entryId: string, meetId: string): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry) return;
  await db.entries.put({ ...entry, deleted: true, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}

export async function updateManualPoints(entryId: string, meetId: string, manualPoints: number | null): Promise<void> {
  const entry = await db.entries.get(entryId);
  if (!entry) return;
  await db.entries.put({ ...entry, manualPoints, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}