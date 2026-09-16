"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent, formatSeconds } from "@/lib/scoring";
import { relayProtocolRows, pointsForRelayTeam } from "@/lib/derive";
import { deleteRelayTeam, saveRelayResult } from "@/lib/actions";
import { Gender, RelayTeam, ResultStatus, STATUS_LABELS } from "@/lib/types";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";
import TimeMaskInput from "./ui/TimeMaskInput";
import RelayTeamModal from "./RelayTeamModal";

const eventConfig = getEvent("relay");

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
  relayTeam: RelayTeam;
  teamName: string;
  legNames: string[];
  place: number | null;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onEditComposition: () => void;
}

function RelayResultRow({
  meetId,
  relayTeam,
  teamName,
  legNames,
  place,
  editing,
  onStartEdit,
  onStopEdit,
  onEditComposition,
}: RowProps) {
  const [resultRaw, setResultRaw] = useState(relayTeam.status ? "" : relayTeam.resultRaw);
  const [status, setStatus] = useState<ResultStatus | null>(relayTeam.status);
  const [saving, setSaving] = useState(false);

  const isOK = !relayTeam.status && relayTeam.resultSeconds !== null;
  const resText = relayTeam.status
    ? STATUS_LABELS[relayTeam.status]
    : relayTeam.resultSeconds !== null
    ? formatSeconds(relayTeam.resultSeconds)
    : "—";
  const pts = pointsForRelayTeam(relayTeam).pts;

  async function handleSave() {
    if (!status && !resultRaw.trim()) return;
    setSaving(true);
    try {
      await saveRelayResult(relayTeam.id, meetId, { status, resultRaw, manualPoints: relayTeam.manualPoints });
      onStopEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirm(`Удалить эстафетную команду «${teamName}»?`)) {
      await deleteRelayTeam(relayTeam.id, meetId);
    }
  }

  if (editing) {
    return (
      <tr className="bg-track/5">
        <td className="py-1.5 font-bold num text-muted">{place ?? "—"}</td>
        <td className="py-1.5 font-medium" colSpan={2}>
          <div className="font-bold">{teamName}</div>
          <div className="text-[10px] text-muted">{legNames.join(" → ")}</div>
        </td>
        <td className="py-1.5">
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
            </select>
            {!status && (
              <TimeMaskInput
                value={resultRaw}
                onChange={setResultRaw}
                autoFocus
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
      <td className="py-1.5 font-medium" colSpan={2}>
        <div className="font-bold">{teamName}</div>
        <div className="text-[10px] text-muted">{legNames.join(" → ")}</div>
      </td>
      <td
        onClick={onStartEdit}
        className={`py-1.5 num font-bold cursor-pointer ${
          relayTeam.status ? "text-status-fail" : isOK ? "text-status-ok" : "text-muted italic"
        }`}
        title="Нажмите, чтобы ввести/изменить результат"
      >
        {resText}
      </td>
      <td className="py-1.5 text-right whitespace-nowrap">
        <span className="num font-bold text-track mr-2">{pts || "—"}</span>
        <button
          onClick={onEditComposition}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-blue transition px-1"
          title="Изменить состав по этапам"
        >
          👥
        </button>
        <button
          onClick={onStartEdit}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-blue transition px-1"
          title="Ввести результат"
        >
          ✎
        </button>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-status-fail transition px-1"
          title="Удалить команду"
        >
          ✕
        </button>
      </td>
    </motion.tr>
  );
}

export default function RelayProtocolTable({ meetId }: { meetId: string }) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const relayTeamsRaw = useLiveQuery(
    () => db.relayTeams.where({ meetId }).filter((r) => !r.deleted).toArray(),
    [meetId]
  );
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );
  const teams = useLiveQuery(
    () => db.teams.where({ meetId }).filter((t) => !t.deleted).toArray(),
    [meetId]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [composingFor, setComposingFor] = useState<{
    teamId: string;
    ageGroup: string;
    gender: Gender;
    relayTeam: RelayTeam | null;
  } | null>(null);

  if (!meet || !relayTeamsRaw || !athletes || !teams) return <div className="skeleton h-48 rounded-xl2" />;

  const legsCount = meet.eventParams?.relay?.legs || meet.eventParams?.relay?.legDistances?.length || 4;
  const distanceParams = meet.eventParams?.relay;

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const athleteLabel = (id: string) => {
    const a = athletes.find((x) => x.id === id);
    if (!a) return "—";
    return `${a.bib ? `№${a.bib} ` : ""}${a.fullName}`;
  };

  const eligibilityRows = meet.eventEligibility.filter((el) => el.eventKey === "relay");
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

  return (
    <div className="card-flat p-5 rounded-xl space-y-4">
      <div className="border-b border-white/10 pb-3">
        <div className="eyebrow mb-1">Протокол дисциплины</div>
        <h3 className="text-2xl font-display tracking-wide">
          {eventConfig.name}
          {distanceParams?.distanceMeters && (
            <span className="text-sm text-muted num ml-2">
              ({distanceParams.distanceMeters} м{distanceParams.legs ? `, ${distanceParams.legs} этапа` : ""})
            </span>
          )}
        </h3>
        <p className="text-[11px] text-muted mt-1">
          Для каждой команды сначала укажите состав по этапам, затем внесите один общий результат на всю
          команду. В протоколе отображаются только заявленные эстафетные команды.
        </p>
      </div>

      {teams.length === 0 ? (
        <EmptyState title="Команды ещё не добавлены" />
      ) : (
        pairs.map(({ ag, g }) => {
          const rows = relayProtocolRows(relayTeamsRaw, ag, g);
          const genderLabel = g === "м" ? "Юноши" : "Девушки";

          return (
            <div key={`${ag}_${g}`} className="border border-white/10 rounded-lg p-3 surface-inset space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
                <div className="eyebrow text-blue">
                  Категория: {ag} • {genderLabel}
                </div>
                <Button
                  variant="secondary"
                  className="!py-1 !px-2 !text-[11px]"
                  onClick={() => setComposingFor({ teamId: teams[0]?.id ?? "", ageGroup: ag, gender: g, relayTeam: null })}
                >
                  + Команда на эстафету
                </Button>
              </div>

              {rows.length === 0 ? (
                <EmptyState title="Эстафетные команды ещё не заявлены" />
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-muted font-bold border-b border-white/10 text-[10px] uppercase tracking-wide">
                    <tr>
                      <th className="py-1 w-8">Место</th>
                      <th className="py-1" colSpan={2}>
                        Команда / состав по этапам
                      </th>
                      <th className="py-1">Рез-т</th>
                      <th className="py-1 text-right">Очки</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map(({ relayTeam, place }) => (
                      <RelayResultRow
                        key={relayTeam.id}
                        meetId={meetId}
                        relayTeam={relayTeam}
                        teamName={teamName(relayTeam.teamId)}
                        legNames={relayTeam.legAthleteIds.map((id) => (id ? athleteLabel(id) : "—"))}
                        place={place}
                        editing={editingId === relayTeam.id}
                        onStartEdit={() => setEditingId(relayTeam.id)}
                        onStopEdit={() => setEditingId(null)}
                        onEditComposition={() => setComposingFor({ teamId: relayTeam.teamId, ageGroup: ag, gender: g, relayTeam })}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })
      )}

      {composingFor && (
        <RelayTeamModal
          meetId={meetId}
          teams={teams}
          ageGroup={composingFor.ageGroup}
          gender={composingFor.gender}
          legsCount={legsCount}
          isOpen={!!composingFor}
          onClose={() => setComposingFor(null)}
          initialTeamId={composingFor.teamId}
          editingRelayTeam={composingFor.relayTeam}
        />
      )}
    </div>
  );
}
