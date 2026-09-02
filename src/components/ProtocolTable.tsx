"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent, formatSeconds } from "@/lib/scoring";
import { pointsForEntry } from "@/lib/derive";
import { saveResultInline, deleteEntry } from "@/lib/actions";
import { Athlete, Entry, Gender, ResultStatus, STATUS_LABELS } from "@/lib/types";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";

const medalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

interface RowProps {
  meetId: string;
  eventKey: string;
  athlete: Athlete;
  entry: Entry | null;
  place: number | null;
}

/** Одна строка протокола — она же форма ввода. Клик по ячейке результата
 *  открывает инлайн-редактор прямо в таблице, без отдельной модалки. */
function ResultRow({ meetId, eventKey, athlete, entry, place }: RowProps) {
  const eventConfig = getEvent(eventKey);
  const [editing, setEditing] = useState(false);
  const [resultRaw, setResultRaw] = useState(entry?.status ? "" : entry?.resultRaw ?? "");
  const [status, setStatus] = useState<ResultStatus | null>(entry?.status ?? null);
  const [saving, setSaving] = useState(false);

  const isOK = entry && !entry.status;
  const resText = entry
    ? entry.status
      ? STATUS_LABELS[entry.status]
      : eventConfig.cat === "track"
      ? formatSeconds(entry.resultSeconds ?? NaN)
      : eventConfig.cat === "strength"
      ? `${entry.resultSeconds} раз`
      : `${entry.resultSeconds} м`
    : "—";
  const pts = entry ? pointsForEntry(entry).pts : null;

  async function handleSave() {
    if (!status && !resultRaw.trim()) return;
    setSaving(true);
    try {
      await saveResultInline(meetId, eventKey, athlete.id, {
        status,
        resultRaw,
        manualPoints: entry?.manualPoints ?? null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (confirm(`Удалить результат спортсмена ${athlete.fullName}?`)) {
      await deleteEntry(entry.id, meetId);
    }
  }

  if (editing) {
    return (
      <tr className="bg-track/5">
        <td className="py-1.5 font-bold num text-muted">{place ?? "—"}</td>
        <td className="py-1.5 num text-muted">{athlete.bib ?? "—"}</td>
        <td className="py-1.5 font-medium">{athlete.fullName}</td>
        <td className="py-1.5" colSpan={2}>
          <div className="flex items-center gap-1.5">
            <select
              value={status ?? "OK"}
              onChange={(e) => setStatus(e.target.value === "OK" ? null : (e.target.value as ResultStatus))}
              className="field !py-1 !px-1.5 !text-[11px] w-20"
            >
              <option value="OK">ОК</option>
              <option value="DNS">{STATUS_LABELS.DNS}</option>
              <option value="DNF">{STATUS_LABELS.DNF}</option>
              <option value="DQ">{STATUS_LABELS.DQ}</option>
              <option value="NM">{STATUS_LABELS.NM}</option>
            </select>
            {!status && (
              <input
                autoFocus
                type="text"
                value={resultRaw}
                onChange={(e) => setResultRaw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder={eventConfig.unitHint}
                className="field !py-1 !px-1.5 !text-[11px] num w-28"
              />
            )}
          </div>
        </td>
        <td className="py-1.5 text-right whitespace-nowrap">
          <button onClick={handleSave} disabled={saving} className="text-status-ok font-bold text-xs px-1.5">
            {saving ? "…" : "✓"}
          </button>
          <button onClick={() => setEditing(false)} className="text-muted font-bold text-xs px-1.5">
            ✕
          </button>
        </td>
      </tr>
    );
  }

  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="group hover:bg-white/[0.04] transition-colors"
    >
      <td className="py-1.5 font-bold num text-muted">
        {place ? (
          <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold ${medalClass(place)}`}>
            {place}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="py-1.5 num text-muted">{athlete.bib ?? "—"}</td>
      <td className="py-1.5 font-medium">{athlete.fullName}</td>
      <td
        onClick={() => setEditing(true)}
        className={`py-1.5 num font-bold cursor-pointer ${
          entry ? (isOK ? "text-status-ok" : "text-status-fail") : "text-muted italic"
        }`}
        title="Нажмите, чтобы ввести/изменить результат"
      >
        {resText}
      </td>
      <td className="py-1.5 text-right num font-bold text-track">{pts ?? "—"}</td>
      <td className="py-1.5 text-right whitespace-nowrap">
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-blue transition px-1"
          title={entry ? "Редактировать результат" : "Ввести результат"}
        >
          ✎
        </button>
        {entry && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-status-fail transition px-1"
            title="Удалить результат"
          >
            ✕
          </button>
        )}
      </td>
    </motion.tr>
  );
}

export default function ProtocolTable({ meetId, eventKey }: { meetId: string; eventKey: string }) {
  const eventConfig = getEvent(eventKey);
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const entries = useLiveQuery(
    () => db.entries.where({ meetId, eventKey }).filter((e) => !e.deleted).toArray(),
    [meetId, eventKey]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );

  const handlePrint = () => window.print();

    if (!meet || !entries || !athletes) return <div className="skeleton h-48 rounded-xl2" />;

  // Дисциплина может быть допущена раздельно для юношей и девушек со
  // своими возрастными группами (см. MeetSetup) — тогда для одного
  // eventKey в eventEligibility будет несколько записей. Собираем
  // уникальные пары "возраст × пол" из всех подходящих записей; если
  // записей вовсе нет — как и раньше, считаем допущенными всех по общему
  // списку возрастных групп соревнования.
  const eligibilityRows = meet.eventEligibility.filter((el) => el.eventKey === eventKey);

  const pairs: { ag: string; g: Gender }[] = [];
  const seenPairs = new Set<string>();
  const addPair = (ag: string, g: Gender) => {
    const key = `${ag}__${g}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
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

  const categoryTables = pairs.map(({ ag, g }) => {
      const eligibleAthletes = athletes.filter((a) => a.ageGroup === ag && a.gender === g);
      const entryByAthlete = new Map(
        entries.filter((e) => e.ageGroup === ag && e.gender === g).map((e) => [e.athleteId, e])
      );

      const withResult = eligibleAthletes.filter((a) => {
        const e = entryByAthlete.get(a.id);
        return e && !e.status && e.resultSeconds !== null;
      });
      const withStatus = eligibleAthletes.filter((a) => {
        const e = entryByAthlete.get(a.id);
        return e && (e.status || e.resultSeconds === null);
      });
      const noResult = eligibleAthletes.filter((a) => !entryByAthlete.has(a.id));

      withResult.sort((a, b) => {
        const av = entryByAthlete.get(a.id)!.resultSeconds as number;
        const bv = entryByAthlete.get(b.id)!.resultSeconds as number;
        return eventConfig.cat === "track" ? av - bv : bv - av;
      });
      withStatus.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
      noResult.sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

      const rows = [
        ...withResult.map((a, idx) => ({ athlete: a, entry: entryByAthlete.get(a.id)!, place: idx + 1 })),
        ...withStatus.map((a) => ({ athlete: a, entry: entryByAthlete.get(a.id)!, place: null as number | null })),
        ...noResult.map((a) => ({ athlete: a, entry: null as Entry | null, place: null as number | null })),
      ];

           return { ag, g, rows };
    });

  const hasAnyAthletes = categoryTables.some((c) => c.rows.length > 0);

  const distanceParams = eventConfig.customDistance ? meet.eventParams?.[eventKey] : undefined;

  return (
    <div className="space-y-4 card-flat p-5 rounded-xl print:border-none print:p-0 print:bg-white print:text-black">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 print:border-b-2 print:border-black">
        <div>
          <div className="hidden print:block text-xs uppercase font-bold text-gray-600">
            {meet.name} • {meet.date} ({meet.place})
          </div>
          <div className="eyebrow print:hidden mb-1">Протокол дисциплины</div>
          <h3 className="text-2xl font-display tracking-wide print:text-2xl print:font-sans">
            {eventConfig.name}
            {distanceParams?.distanceMeters && (
              <span className="text-sm text-muted num ml-2">
                ({distanceParams.distanceMeters} м{eventKey === "relay" && distanceParams.legs ? `, ${distanceParams.legs} этапа` : ""})
              </span>
            )}
          </h3>
          <p className="text-[11px] text-muted print:hidden mt-1">
            Нажмите на результат в таблице, чтобы ввести или изменить его.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="secondary" onClick={handlePrint}>
            🖨 Печать / PDF
          </Button>
        </div>
      </div>

      {!hasAnyAthletes ? (
        <EmptyState
          title="Нет допущенных спортсменов"
          description="Зарегистрируйте участников нужного возраста и пола, допущенных к этой дисциплине."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-1 gap-6">
          {categoryTables.map(({ ag, g, rows }) => {
            if (rows.length === 0) return null;
            const genderLabel = g === "м" ? "Юноши" : "Девушки";
            return (
              <div
                key={`${ag}_${g}`}
                className="border border-white/10 print:border-black rounded-lg p-3 surface-inset print:bg-transparent space-y-2"
              >
                <div className="eyebrow text-blue print:text-black print:normal-case border-b border-white/10 print:border-black pb-1 mb-2">
                  Категория: {ag} • {genderLabel}
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-muted print:text-black font-bold border-b border-white/10 print:border-black text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="py-1 w-8">Место</th>
                      <th className="py-1 w-12">№</th>
                      <th className="py-1">Спортсмен</th>
                      <th className="py-1">Рез-т</th>
                      <th className="py-1 text-right">Очки</th>
                      <th className="py-1 w-10 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map(({ athlete, entry, place }) => (
                      <ResultRow key={athlete.id} meetId={meetId} eventKey={eventKey} athlete={athlete} entry={entry} place={place} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <div className="hidden print:flex justify-between items-end pt-12 text-xs font-bold">
        <div>
          <div className="border-b border-black w-48 mb-1"></div>
          <div>Главный судья</div>
        </div>
        <div>
          <div className="border-b border-black w-48 mb-1"></div>
          <div>Главный секретарь</div>
        </div>
      </div>
    </div>
  );
}