import type { Table } from "dexie";
import { supabase } from "./supabaseClient";
import { db, getLastSyncedAt, setLastSyncedAt } from "./db";
import { Athlete, Entry, Meet, Team } from "./types";

/**
 * SYNC STRATEGY — без изменений по сути (см. README): пишем сначала в
 * Dexie (dirty: true), затем pushDirty() делает upsert в Supabase по
 * client-generated uuid, pullRemote() подтягивает всё изменённое с сервера
 * с момента последней синхронизации, конфликты — "последняя запись
 * побеждает" по updatedAt. Athletes синхронизируются так же, как teams,
 * плюс поле bib (стартовый номер) и Meet.eventParams (дистанция/этапы для
 * лыж/эстафеты).
 */

let syncing = false;
let syncTimer: ReturnType<typeof setInterval> | null = null;

// ---------- row <-> supabase column mapping ----------

function entryToRow(e: Entry) {
  return {
    id: e.id,
    meet_id: e.meetId,
    team_id: e.teamId,
    event_key: e.eventKey,
    age_group: e.ageGroup,
    gender: e.gender,
    athlete_id: e.athleteId,
    athlete_name: e.athleteName,
    bib: e.bib,
    status: e.status,
    result_raw: e.resultRaw,
    result_seconds: e.resultSeconds,
    manual_points: e.manualPoints,
    auto_points: e.autoPoints,
    deleted: e.deleted,
    created_at: e.createdAt,
  };
}

function rowToEntry(r: any): Entry {
  return {
    id: r.id,
    meetId: r.meet_id,
    teamId: r.team_id,
    eventKey: r.event_key,
    ageGroup: r.age_group,
    gender: r.gender,
    athleteId: r.athlete_id,
    athleteName: r.athlete_name,
    bib: r.bib ?? null,
    status: r.status ?? null,
    resultRaw: r.result_raw,
    resultSeconds: r.result_seconds,
    manualPoints: r.manual_points,
    autoPoints: r.auto_points,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: r.deleted,
    dirty: false,
  };
}

function teamToRow(t: Team) {
  return { id: t.id, meet_id: t.meetId, name: t.name, deleted: t.deleted, created_at: t.createdAt };
}
function rowToTeam(r: any): Team {
  return {
    id: r.id,
    meetId: r.meet_id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: r.deleted,
    dirty: false,
  };
}

function athleteToRow(a: Athlete) {
  return {
    id: a.id,
    meet_id: a.meetId,
    team_id: a.teamId,
    full_name: a.fullName,
    bib: a.bib,
    age_group: a.ageGroup,
    gender: a.gender,
    deleted: a.deleted,
    created_at: a.createdAt,
  };
}
function rowToAthlete(r: any): Athlete {
  return {
    id: r.id,
    meetId: r.meet_id,
    teamId: r.team_id,
    fullName: r.full_name,
    bib: r.bib ?? null,
    ageGroup: r.age_group,
    gender: r.gender,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deleted: r.deleted,
    dirty: false,
  };
}

function meetToRow(m: Meet) {
  return {
    id: m.id,
    owner_id: m.ownerId,
    name: m.name,
    date: m.date,
    place: m.place,
    age_groups: m.ageGroups,
    event_eligibility: m.eventEligibility,
    event_params: m.eventParams ?? {},
    created_at: m.createdAt,
  };
}
function rowToMeet(r: any): Meet {
  return {
    id: r.id,
    ownerId: r.owner_id,
    name: r.name,
    date: r.date,
    place: r.place,
    ageGroups: r.age_groups ?? [],
    eventEligibility: r.event_eligibility ?? [],
    eventParams: r.event_params ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    dirty: false,
  };
}

// ---------- push ----------

export async function pushDirty(meetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const dirtyTeams = await db.teams.where({ meetId }).filter((t) => !!t.dirty).toArray();
    const dirtyAthletes = await db.athletes.where({ meetId }).filter((a) => !!a.dirty).toArray();
    const dirtyEntries = await db.entries.where({ meetId }).filter((e) => !!e.dirty).toArray();
    const meet = await db.meets.get(meetId);

    if (meet?.dirty) {
      const { error } = await supabase.from("meets").upsert(meetToRow(meet));
      if (error) throw error;
      await db.meets.update(meetId, { dirty: false });
    }

    if (dirtyTeams.length) {
      const { error } = await supabase.from("teams").upsert(dirtyTeams.map(teamToRow));
      if (error) throw error;
      await db.transaction("rw", db.teams, async () => {
        for (const t of dirtyTeams) await db.teams.update(t.id, { dirty: false });
      });
    }

    if (dirtyAthletes.length) {
      const { error } = await supabase.from("athletes").upsert(dirtyAthletes.map(athleteToRow));
      if (error) throw error;
      await db.transaction("rw", db.athletes, async () => {
        for (const a of dirtyAthletes) await db.athletes.update(a.id, { dirty: false });
      });
    }

    if (dirtyEntries.length) {
      const { error } = await supabase.from("entries").upsert(dirtyEntries.map(entryToRow));
      if (error) throw error;
      await db.transaction("rw", db.entries, async () => {
        for (const e of dirtyEntries) await db.entries.update(e.id, { dirty: false });
      });
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[sync] push failed", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

// ---------- pull ----------

export async function pullRemote(meetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const since = await getLastSyncedAt(meetId);
    const sinceIso = since ?? "1970-01-01T00:00:00Z";

    const [
      { data: meetRows, error: meetErr },
      { data: teamRows, error: teamErr },
      { data: athleteRows, error: athleteErr },
      { data: entryRows, error: entryErr },
    ] = await Promise.all([
      supabase.from("meets").select("*").eq("id", meetId).gt("updated_at", sinceIso),
      supabase.from("teams").select("*").eq("meet_id", meetId).gt("updated_at", sinceIso),
      supabase.from("athletes").select("*").eq("meet_id", meetId).gt("updated_at", sinceIso),
      supabase.from("entries").select("*").eq("meet_id", meetId).gt("updated_at", sinceIso),
    ]);
    if (meetErr) throw meetErr;
    if (teamErr) throw teamErr;
    if (athleteErr) throw athleteErr;
    if (entryErr) throw entryErr;

    await db.transaction("rw", db.meets, db.teams, db.athletes, db.entries, async () => {
      for (const r of meetRows ?? []) await mergeRemote(db.meets, rowToMeet(r));
      for (const r of teamRows ?? []) await mergeRemote(db.teams, rowToTeam(r));
      for (const r of athleteRows ?? []) await mergeRemote(db.athletes, rowToAthlete(r));
      for (const r of entryRows ?? []) await mergeRemote(db.entries, rowToEntry(r));
    });

    await setLastSyncedAt(meetId, new Date().toISOString());
    return { ok: true };
  } catch (err: any) {
    console.error("[sync] pull failed", err);
    return { ok: false, error: err.message ?? String(err) };
  }
}

/** Last-write-wins merge: не перетираем локальную строку, если она dirty,
 *  либо перетираем только если входящая версия строго новее. */
async function mergeRemote<T extends { id: string; updatedAt: string; dirty?: boolean }>(
  table: Table<T, string>,
  incoming: T
) {
  const local = await table.get(incoming.id);
  if (!local) {
    await table.put(incoming);
    return;
  }
  if (local.dirty) return;
  if (new Date(incoming.updatedAt) >= new Date(local.updatedAt)) {
    await table.put(incoming);
  }
}

// ---------- orchestration ----------

export async function fullSync(meetId: string): Promise<{ ok: boolean; error?: string }> {
  if (syncing) return { ok: true };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, error: "offline" };
  syncing = true;
  try {
    const pushed = await pushDirty(meetId);
    if (!pushed.ok) return pushed;
    const pulled = await pullRemote(meetId);
    return pulled;
  } finally {
    syncing = false;
  }
}

export function startAutoSync(meetId: string, intervalMs = 15000) {
  stopAutoSync();
  const trigger = () => void fullSync(meetId);
  trigger();
  syncTimer = setInterval(trigger, intervalMs);
  if (typeof window !== "undefined") {
    window.addEventListener("online", trigger);
    window.addEventListener("focus", trigger);
  }
}

export function stopAutoSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}