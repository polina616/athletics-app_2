"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent, formatSeconds } from "@/lib/scoring";
import { pointsForEntry } from "@/lib/derive";
import { saveResultInline, deleteEntry } from "@/lib/actions";
import { Athlete, Entry, Gender, ResultStatus, STATUS_LABELS } from "@/lib/types";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import TimeMaskInput from "./ui/TimeMaskInput";

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
  teamName: string;
  entry: Entry | null;
  place: number | null;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  /** Вызывается после успешного сохранения — переводит фокус на
   *  следующую строку категории (или закрывает редактор, если строк
   *  больше нет). Так Enter при вводе результата сразу двигает судью
   *  дальше по списку, без ручного клика на следующего участника. */
  onSavedAdvance: () => void;
}

function ResultRow({
  meetId,
  eventKey,
  athlete,
  teamName,
  entry,
  place,
  editing,
  onStartEdit,
  onStopEdit,
  onSavedAdvance,
}: RowProps) {
  const eventConfig = getEvent(eventKey);
  // Значения полей больше НЕ читаются из entry при монтировании — строка
  // переиспользуется между вкладками дисциплин (см. ProtocolTable), и
  // одноразовая инициализация показывала результат с другой дисциплины.
  // Вместо этого — пустые дефолты, актуальное значение подставляется
  // эффектом ниже ровно в момент входа в режим редактирования.
  const [resultRaw, setResultRaw] = useState("");
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setStatus(entry?.status ?? null);
      setResultRaw(entry?.status ? "" : entry?.resultRaw ?? "");
    }
    // Намеренно зависим только от editing (не от entry) — иначе фоновая
    // синхронизация могла бы затирать то, что судья ещё печатает.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

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
      onSavedAdvance();
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
        <td className="py-1.5 text-[var(--ink)]/70">{teamName}</td>
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
              eventConfig.timeFmt === "mmss" ? (
                <TimeMaskInput
                  value={resultRaw}
                  onChange={setResultRaw}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={eventConfig.unitHint}
                  className="field !py-1 !px-1.5 !text-[11px] num w-28"
                />
              ) : (
                <input
                  autoFocus
                  type="text"
                  value={resultRaw}
                  onChange={(e) => setResultRaw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  placeholder={eventConfig.unitHint}
                  className="field !py-1 !px-1.5 !text-[11px] num w-28"
                />
              )
            )}
          </div>
        </td>
        <td className="py-1.5 text-right whitespace-nowrap">
          <button onClick={handleSave} disabled={saving} className="text-status-ok font-bold text-xs px-1.5">
            {saving ? "…" : "✓"}
          </button>
          <button onClick={onStopEdit} className="text-muted font-bold text-xs px-1.5">
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
      <td className="py-1.5 text-[var(--ink)]/70">{teamName}</td>
      <td
        onClick={onStartEdit}
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
          onClick={onStartEdit}
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
/** Расставляет места по уже отсортированному списку спортсменов с учётом
 *  равенства результата: одинаковый результат — одно и то же место, БЕЗ
 *  пропусков после связки (1,2,3,3,4,4,5...). */
function computePlaces(
  sortedAthletes: Athlete[],
  entryByAthlete: Map<string, Entry>
): number[] {
  const places: number[] = [];
  let lastValue: number | null = null;
  let lastPlace = 0;
  sortedAthletes.forEach((a) => {
    const value = entryByAthlete.get(a.id)!.resultSeconds as number;
    const place = value === lastValue ? lastPlace : lastPlace + 1;
    lastValue = value;
    lastPlace = place;
    places.push(place);
  });
  return places;
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
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  // Какая строка (по athleteId) сейчас в режиме редактирования — вынесено
  // на уровень таблицы, чтобы после сохранения можно было открыть
  // редактирование СЛЕДУЮЩЕЙ строки (переход по Enter, см. ResultRow).
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setSearch("");
    // Смена вкладки дисциплины — закрываем любое открытое редактирование,
    // иначе строка донесла бы значения с другой дисциплины в свою локальную
    // память (тот самый баг с "чужим" результатом в поле).
    setEditingId(null);
  }, [eventKey]);

  const handlePrint = () => window.print();

  if (!meet || !entries || !athletes || !teams) return <div className="skeleton h-48 rounded-xl2" />;
  const currentMeet = meet;

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";

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

      const withResultPlaces = computePlaces(withResult, entryByAthlete);

      const rows = [
        ...withResult.map((a, idx) => ({
          athlete: a,
          entry: entryByAthlete.get(a.id)!,
          place: withResultPlaces[idx],
        })),
        ...withStatus.map((a) => ({ athlete: a, entry: entryByAthlete.get(a.id)!, place: null as number | null })),
        ...noResult.map((a) => ({ athlete: a, entry: null as Entry | null, place: null as number | null })),
      ];

           return { ag, g, rows };
    });

  const hasAnyAthletes = categoryTables.some((c) => c.rows.length > 0);

  const distanceParams = eventConfig.customDistance ? meet.eventParams?.[eventKey] : undefined;

  const q = search.trim().toLowerCase();
  const matchesQuery = (a: Athlete) =>
    !q || a.fullName.toLowerCase().includes(q) || (a.bib ?? "").toLowerCase().includes(q);

  const filteredCategoryTables = categoryTables
    .map((cat) => ({ ...cat, rows: cat.rows.filter(({ athlete }) => matchesQuery(athlete)) }))
    .filter((cat) => !q || cat.rows.length > 0);

  const totalMatches = q ? filteredCategoryTables.reduce((s, c) => s + c.rows.length, 0) : null;

  function renderProtocol(isModal: boolean) {
    return (
      <div
        className={`space-y-4 ${isModal ? "" : "card-flat p-5 rounded-xl"} print:border-none print:p-0 print:bg-white print:text-black`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3 print:border-b-2 print:border-black">
          <div>
            <div className="hidden print:block text-xs uppercase font-bold text-gray-600">
                            {currentMeet.name} • {currentMeet.date} ({currentMeet.place})
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
              Нажмите на результат в таблице, чтобы ввести или изменить его. Enter — сохранить и перейти к следующему.
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {!isModal && (
              <Button variant="secondary" onClick={() => setExpanded(true)}>
                ⛶ Развернуть
              </Button>
            )}
            <Button variant="secondary" onClick={handlePrint}>
              🖨 Печать / PDF
            </Button>
            {isModal && (
              <Button variant="secondary" onClick={() => setExpanded(false)}>
                ✕ Свернуть
              </Button>
            )}
          </div>
        </div>

        {hasAnyAthletes && (
          <div className="print:hidden space-y-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск спортсмена по фамилии, имени или номеру..."
              className="field !text-xs"
            />
            {q && (
              <p className="text-[11px] text-muted num">
                {totalMatches ? `Найдено: ${totalMatches}` : "Ничего не найдено по этому запросу."}
              </p>
            )}
          </div>
        )}

        {!hasAnyAthletes ? (
          <EmptyState
            title="Нет допущенных спортсменов"
            description="Зарегистрируйте участников нужного возраста и пола, допущенных к этой дисциплине."
          />
        ) : (
          <div
            className={`grid grid-cols-1 ${isModal ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"} print:grid-cols-1 gap-6`}
          >
            {filteredCategoryTables.map(({ ag, g, rows }) => {
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
                        <th className="py-1">Команда</th>
                        <th className="py-1">Рез-т</th>
                        <th className="py-1 text-right">Очки</th>
                        <th className="py-1 w-10 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map(({ athlete, entry, place }, idx) => (
                        <ResultRow
                          key={athlete.id}
                          meetId={meetId}
                          eventKey={eventKey}
                          athlete={athlete}
                          teamName={teamName(athlete.teamId)}
                          entry={entry}
                          place={place}
                          editing={editingId === athlete.id}
                          onStartEdit={() => setEditingId(athlete.id)}
                          onStopEdit={() => setEditingId(null)}
                          onSavedAdvance={() => {
                            const next = rows[idx + 1];
                            setEditingId(next ? next.athlete.id : null);
                          }}
                        />
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

  return (
    <>
      {expanded ? (
        <div className="card-flat p-5 rounded-xl flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Протокол открыт в развёрнутом окне</div>
            <h3 className="text-lg font-display tracking-wide">{eventConfig.name}</h3>
          </div>
          <Button variant="secondary" onClick={() => setExpanded(false)}>
            Свернуть
          </Button>
        </div>
      ) : (
        renderProtocol(false)
      )}

      <Modal isOpen={expanded} onClose={() => setExpanded(false)} maxWidthClass="max-w-[96vw]">
        {expanded && <div className="max-h-[88vh] overflow-y-auto pr-1">{renderProtocol(true)}</div>}
      </Modal>
    </>
  );
}
