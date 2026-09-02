import { v4 as uuid } from "uuid";
import { db } from "./db";
import { supabase } from "./supabaseClient";
import { fullSync } from "./sync";
import {
  AgeGroup,
  Athlete,
  Entry,
  EventCustomParams,
  EventEligibility,
  Gender,
  Meet,
  ResultStatus,
  Team,
} from "./types";
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
  eventEligibility: EventEligibility[],
  eventParams: Record<string, EventCustomParams> = {}
): Promise<Meet> {
  const meet: Meet = {
    id: uuid(),
    ownerId,
    name,
    date,
    place,
    ageGroups,
    eventEligibility,
    eventParams,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    dirty: true,
  };
  await db.meets.put(meet);
  kickSync(meet.id);
  return meet;
}

/** Полностью удаляет соревнование: сначала локально (Dexie) — команды,
 *  спортсменов, результаты и сам Meet, чтобы список на главном экране
 *  обновился мгновенно и офлайн. Затем — best-effort удаление в Supabase;
 *  там настроен "on delete cascade", так что достаточно удалить только
 *  строку meets, остальное подчистится на сервере само. Если сети нет —
 *  просто не получится, ничего страшного: локально запись уже удалена. */
export async function deleteMeet(meetId: string): Promise<void> {
  await db.transaction("rw", db.meets, db.teams, db.athletes, db.entries, async () => {
    await db.entries.where({ meetId }).delete();
    await db.athletes.where({ meetId }).delete();
    await db.teams.where({ meetId }).delete();
    await db.meets.delete(meetId);
  });

  try {
    const { error } = await supabase.from("meets").delete().eq("id", meetId);
    if (error) throw error;
  } catch (err) {
    console.warn("[actions] remote meet delete failed (offline or network error) — local copy is already gone", err);
  }
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
 *  внесении результатов по любой дисциплине, без повторного ввода ФИО.
 *  Стартовый номер (bib) вводится судьёй вручную — здесь ничего не
 *  подставляется автоматически. */
export async function addAthlete(
  meetId: string,
  teamId: string,
  fullName: string,
  ageGroup: AgeGroup,
  gender: Gender,
  bib: string
): Promise<Athlete> {
  const athlete: Athlete = {
    id: uuid(),
    meetId,
    teamId,
    fullName: fullName.trim(),
    ageGroup,
    gender,
    bib: bib.trim(),
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
  patch: Partial<Pick<Athlete, "fullName" | "teamId" | "ageGroup" | "gender" | "bib">>
): Promise<void> {
  const a = await db.athletes.get(id);
  if (!a) return;
  await db.athletes.put({ ...a, ...patch, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);

  // Держим уже внесённые результаты в согласованном состоянии: если у
  // спортсмена поменялась команда/возраст/пол/ФИО/номер — старые Entry
  // обновляем тоже, иначе протокол и командный зачёт "разъедутся" с
  // реальностью.
  if (patch.teamId || patch.ageGroup || patch.gender || patch.fullName || patch.bib !== undefined) {
    const entries = await db.entries.where({ meetId, athleteId: id }).toArray();
    await db.transaction("rw", db.entries, async () => {
      for (const e of entries) {
        if (e.deleted) continue;
        await db.entries.update(e.id, {
          teamId: patch.teamId ?? e.teamId,
          ageGroup: patch.ageGroup ?? e.ageGroup,
          gender: patch.gender ?? e.gender,
          athleteName: patch.fullName ?? e.athleteName,
          bib: patch.bib !== undefined ? patch.bib : e.bib,
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
  const meet = await db.meets.get(input.meetId);

  let resultSeconds: number | null = null;
  let auto = 0;
  let resultRaw = "";

  if (!input.status) {
    const value = parseResult(ev, input.resultRaw);
    resultSeconds = Number.isNaN(value) ? null : value;
    const distanceMeters = ev.customDistance ? meet?.eventParams?.[input.eventKey]?.distanceMeters : undefined;
    auto = computeAutoPoints(ev, athlete.gender, value, distanceMeters);
    resultRaw = input.resultRaw.trim();
  }

  const entry: Entry = {
    id: uuid(),
    meetId: input.meetId,
    teamId: athlete.teamId,
    eventKey: input.eventKey,
    ageGroup: athlete.ageGroup,
    gender: athlete.gender,
    athleteId: athlete.id,
    athleteName: athlete.fullName,
    bib: athlete.bib,
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
  const meet = await db.meets.get(meetId);

  let resultSeconds: number | null = null;
  let auto = 0;
  let resultRaw = "";

  if (!input.status) {
    const value = parseResult(ev, input.resultRaw);
    resultSeconds = Number.isNaN(value) ? null : value;
    const distanceMeters = ev.customDistance ? meet?.eventParams?.[entry.eventKey]?.distanceMeters : undefined;
    auto = computeAutoPoints(ev, athlete?.gender ?? entry.gender, value, distanceMeters);
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

/** Правка уже созданного соревнования: название/дата/место/возрастные
 *  группы. Уже внесённые результаты не трогаются — если удалить
 *  возрастную группу, у которой есть записи, сами записи не удаляются,
 *  просто перестанут попадать в текущие фильтры протокола. */
export async function updateMeet(
  meetId: string,
  patch: Partial<Pick<Meet, "name" | "date" | "place" | "ageGroups">>
): Promise<void> {
  const meet = await db.meets.get(meetId);
  if (!meet) return;
  await db.meets.put({ ...meet, ...patch, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}

/** Добавляет/снимает допуск дисциплины у уже созданного соревнования —
 *  раньше набор дисциплин задавался один раз в MeetSetup. Пустые
 *  ageGroups/genders означают "снять дисциплину с допуска". */
export async function setEventEligibility(
  meetId: string,
  eventKey: string,
  ageGroups: string[],
  genders: Gender[]
): Promise<void> {
  const meet = await db.meets.get(meetId);
  if (!meet) return;
  const rest = meet.eventEligibility.filter((el) => el.eventKey !== eventKey);
  const eventEligibility =
    ageGroups.length && genders.length ? [...rest, { eventKey, ageGroups, genders }] : rest;
  await db.meets.put({ ...meet, eventEligibility, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}

/** Дистанция/этапы для лыж и эстафеты — задаётся при создании, но можно
 *  поправить и позже через настройки соревнования. */
export async function setEventCustomParams(
  meetId: string,
  eventKey: string,
  params: EventCustomParams
): Promise<void> {
  const meet = await db.meets.get(meetId);
  if (!meet) return;
  const eventParams = { ...(meet.eventParams ?? {}), [eventKey]: params };
  await db.meets.put({ ...meet, eventParams, updatedAt: nowIso(), dirty: true });
  kickSync(meetId);
}

/** Массовая регистрация целой команды: судья один раз выбирает команду,
 *  возраст и пол, затем построчно вводит стартовый номер и ФИО — номер
 *  задаётся вручную для каждого спортсмена, автоматически ничего не
 *  подставляется. */
export async function addAthletesBulk(
  meetId: string,
  teamId: string,
  ageGroup: AgeGroup,
  gender: Gender,
  entries: { bib: string; fullName: string }[]
): Promise<number> {
  const athletes: Athlete[] = entries
    .map((e) => ({ bib: e.bib.trim(), fullName: e.fullName.trim() }))
    .filter((e) => e.bib && e.fullName)
    .map(({ bib, fullName }) => ({
      id: uuid(),
      meetId,
      teamId,
      fullName,
      ageGroup,
      gender,
      bib,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deleted: false,
      dirty: true,
    }));

  await db.athletes.bulkPut(athletes);
  kickSync(meetId);
  return athletes.length;
}

/** Ввод/правка результата прямо из таблицы протокола: если у спортсмена в
 *  этой дисциплине уже есть запись — обновляет её, иначе создаёт новую.
 *  Заменяет отдельные модалки ResultModal/EditResultModal одной функцией
 *  для инлайн-редактора в ProtocolTable. */
export async function saveResultInline(
  meetId: string,
  eventKey: string,
  athleteId: string,
  input: { status: ResultStatus | null; resultRaw: string; manualPoints: number | null }
): Promise<void> {
  const existing = await db.entries
    .where({ meetId, eventKey, athleteId })
    .filter((e) => !e.deleted)
    .first();

  if (existing) {
    await updateEntry(existing.id, meetId, input);
  } else {
    await addEntry({ meetId, eventKey, athleteId, ...input });
  }
}