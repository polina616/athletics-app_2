"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent, formatSeconds } from "@/lib/scoring";
import { protocolRows } from "@/lib/derive";
import { useAppStore } from "@/store/useAppStore";
import { Entry, Gender, STATUS_LABELS } from "@/lib/types";
import EditResultModal from "./EditResultModal";
import EmptyState from "./ui/EmptyState";
import Button from "./ui/Button";
import { IconPlus } from "./ui/icons";

const medalClass = (place: number) =>
  place === 1
    ? "bg-gold text-black"
    : place === 2
    ? "bg-white/25 text-black"
    : place === 3
    ? "bg-track-dark text-white"
    : "bg-white/10 text-[var(--ink)]";

export default function ProtocolTable({ meetId, eventKey }: { meetId: string; eventKey: string }) {
  const openResultModal = useAppStore((s) => s.openResultModal);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const eventConfig = getEvent(eventKey);
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const entries = useLiveQuery(
    () => db.entries.where({ meetId, eventKey }).filter((e) => !e.deleted).toArray(),
    [meetId, eventKey]
  );

  const handlePrint = () => window.print();

  if (!meet || !entries) return <div className="skeleton h-48 rounded-xl2" />;

  const eligibility = meet.eventEligibility.find((el) => el.eventKey === eventKey);
  const ageGroups = eligibility?.ageGroups.length ? eligibility.ageGroups : meet.ageGroups;
  const genders: Gender[] = eligibility?.genders.length ? eligibility.genders : ["м", "ж"];

  const categoryTables = ageGroups.flatMap((ag) =>
    genders.map((g) => ({ ag, g, rows: protocolRows(entries, eventKey, ag, g) }))
  );
  const hasAnyResults = categoryTables.some((c) => c.rows.length > 0);

  return (
    <div className="space-y-4 card-flat p-5 rounded-xl print:border-none print:p-0 print:bg-white print:text-black">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 print:border-b-2 print:border-black">
        <div>
          <div className="hidden print:block text-xs uppercase font-bold text-gray-600">
            {meet.name} • {meet.date} ({meet.place})
          </div>
          <div className="eyebrow print:hidden mb-1">Протокол дисциплины</div>
          <h3 className="text-2xl font-display tracking-wide print:text-2xl print:font-sans">{eventConfig.name}</h3>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button variant="secondary" onClick={handlePrint}>
            🖨 Печать / PDF
          </Button>
          <Button variant="primary" onClick={() => openResultModal(eventKey)}>
            <IconPlus className="w-4 h-4" /> Ввести результат
          </Button>
        </div>
      </div>

      {!hasAnyResults ? (
        <EmptyState title="Результатов пока нет" description="Внесите первый результат по этой дисциплине." />
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
                      <th className="py-1 w-8">№</th>
                      <th className="py-1">Спортсмен</th>
                      <th className="py-1">Рез-т</th>
                      <th className="py-1 text-right">Очки</th>
                      <th className="py-1 w-6 print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map(({ entry, pts, place }, idx) => {
                      const isOK = !entry.status;
                      const resText = isOK
                        ? eventConfig.cat === "track"
                          ? formatSeconds(entry.resultSeconds ?? NaN)
                          : `${entry.resultSeconds} м`
                        : STATUS_LABELS[entry.status!];

                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                          className="group hover:bg-white/[0.04] print:hover:bg-transparent transition-colors"
                        >
                          <td className="py-1.5 font-bold num text-muted print:text-black">
                            {place ? (
                              <span
                                className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold print:bg-transparent ${medalClass(
                                  place
                                )}`}
                              >
                                {place}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-1.5 font-medium">{entry.athleteName}</td>
                          <td
                            className={`py-1.5 num font-bold ${
                              !isOK ? "text-status-fail print:text-black" : "text-status-ok print:text-black"
                            }`}
                          >
                            {resText}
                          </td>
                          <td className="py-1.5 text-right num font-bold text-track print:text-black">{pts}</td>
                          <td className="py-1.5 text-right print:hidden">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-blue transition px-1"
                              title="Редактировать результат"
                            >
                              ✎
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
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

      <EditResultModal entry={editingEntry} isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} />
    </div>
  );
}
