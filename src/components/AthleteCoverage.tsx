"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getEvent } from "@/lib/scoring";
import { Gender } from "@/lib/types";

interface Props {
  meetId: string;
}

export default function AthleteCoverage({ meetId }: Props) {
  const meet = useLiveQuery(() => db.meets.get(meetId), [meetId]);
  const athletes = useLiveQuery(
    () => db.athletes.where({ meetId }).filter((a) => !a.deleted).toArray(),
    [meetId]
  );

  if (!meet || !athletes) return <div className="skeleton h-40 rounded-xl2" />;
  if (athletes.length === 0 || meet.eventEligibility.length === 0) return null;

  const genders: Gender[] = ["м", "ж"];

  // Дисциплина может быть допущена раздельно для юношей и девушек со
  // своими возрастными группами (см. MeetSetup) — тогда в eventEligibility
  // для одного eventKey будет несколько записей. Берём уникальный список
  // дисциплин и проверяем допуск по ЛЮБОЙ подходящей записи.
  const eventKeys = Array.from(new Set(meet.eventEligibility.map((el) => el.eventKey)));

  function isEligible(eventKey: string, ag: string, g: Gender) {
    return meet!.eventEligibility.some(
      (el) => el.eventKey === eventKey && el.ageGroups.includes(ag) && el.genders.includes(g)
    );
  }

  return (
    <div className="card-flat p-5 rounded-xl space-y-3">
      <h3 className="text-lg font-bold">Распределение участников по дисциплинам</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="text-muted font-bold border-b border-white/10 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="py-1.5 pr-3">Дисциплина</th>
              {meet.ageGroups.map((ag) =>
                genders.map((g) => (
                  <th key={`${ag}_${g}`} className="py-1.5 px-2 text-center whitespace-nowrap">
                    {ag} · {g === "м" ? "Ю" : "Д"}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {eventKeys.map((eventKey) => {
              const ev = getEvent(eventKey);
              return (
                <tr key={eventKey}>
                  <td className="py-1.5 pr-3 font-medium">{ev.name}</td>
                  {meet.ageGroups.map((ag) =>
                    genders.map((g) => {
                      const eligible = isEligible(eventKey, ag, g);
                      const count = eligible
                        ? athletes.filter((a) => a.ageGroup === ag && a.gender === g).length
                        : 0;
                      return (
                        <td key={`${ag}_${g}`} className="py-1.5 px-2 text-center num">
                          {eligible ? (
                            <span className={count === 0 ? "text-muted" : "text-track font-bold"}>{count}</span>
                          ) : (
                            <span className="text-muted/30">—</span>
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}