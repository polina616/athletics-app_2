import Dexie, { Table } from "dexie";
import { Athlete, Entry, Meet, Team } from "./types";

/**
 * Local-first storage.
 *
 * UI НИКОГДА не обращается к Supabase напрямую для чтения/записи — только
 * к этой Dexie-базе. sync.ts — единственный модуль, который переносит
 * данные между ней и Supabase. Именно это позволяет приложению работать
 * полностью офлайн.
 *
 * `dirty: true` — у строки есть локальные изменения, ещё не подтверждённые
 * как сохранённые в Supabase (см. sync.ts pushDirty).
 */
export class AthleticsDB extends Dexie {
  meets!: Table<Meet, string>;
  teams!: Table<Team, string>;
  athletes!: Table<Athlete, string>;
  entries!: Table<Entry, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("athletics-meet-db");

    this.version(1).stores({
      meets: "id, updatedAt, dirty",
      teams: "id, meetId, updatedAt, dirty",
      entries: "id, meetId, eventKey, ageGroup, gender, teamId, updatedAt, dirty",
      meta: "key",
    });

    this.version(2).stores({
      meets: "id, ownerId, updatedAt, dirty",
      teams: "id, meetId, updatedAt, dirty",
      entries: "id, meetId, eventKey, ageGroup, gender, teamId, updatedAt, dirty",
      meta: "key",
    });

    // v3: добавлен справочник спортсменов (athletes) + допуск дисциплин по
    // категориям в meets (ageGroups/eventEligibility) + статус результата
    // (DNS/DNF/DQ/NM) и ссылка на спортсмена в entries.
    this.version(3).stores({
      meets: "id, ownerId, updatedAt, dirty",
      teams: "id, meetId, updatedAt, dirty",
      athletes: "id, meetId, teamId, ageGroup, gender, updatedAt, dirty",
      entries: "id, meetId, eventKey, ageGroup, gender, teamId, athleteId, status, updatedAt, dirty",
      meta: "key",
    });
  }
}

export const db = new AthleticsDB();

export async function getLastSyncedAt(meetId: string): Promise<string | null> {
  const row = await db.meta.get(`lastSync:${meetId}`);
  return row?.value ?? null;
}

export async function setLastSyncedAt(meetId: string, iso: string): Promise<void> {
  await db.meta.put({ key: `lastSync:${meetId}`, value: iso });
}