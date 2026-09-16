
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { addRelayTeam, setRelayTeamLegs } from "@/lib/actions";
import { Gender, RelayTeam, Team } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Props {
  meetId: string;
  teams: Team[];
  ageGroup: string;
  gender: Gender;
  legsCount: number;
  isOpen: boolean;
  onClose: () => void;
  initialTeamId?: string;
  /** если задано — редактируем состав уже созданной эстафетной команды;
   *  сама команда (клуб) в этом режиме не меняется. */
  editingRelayTeam?: RelayTeam | null;
}

/** Состав эстафетной команды: ровно один спортсмен КЛУБА на каждый этап,
 *  только из подходящих по возрасту/полу, без повторов между этапами.
 *  Результат (общее время) здесь не вводится — он один на всю команду и
 *  редактируется отдельно, в строке протокола. */
export default function RelayTeamModal({
  meetId,
  teams,
  ageGroup,
  gender,
  legsCount,
  isOpen,
  onClose,
  initialTeamId,
  editingRelayTeam,
}: Props) {
  const [teamId, setTeamId] = useState(editingRelayTeam?.teamId ?? initialTeamId ?? teams[0]?.id ?? "");
  const [legs, setLegs] = useState<string[]>(
    editingRelayTeam?.legAthleteIds ?? Array.from({ length: legsCount }, () => "")
  );

  useEffect(() => {
    if (!isOpen) return;
    setTeamId(editingRelayTeam?.teamId ?? initialTeamId ?? teams[0]?.id ?? "");
    setLegs(editingRelayTeam?.legAthleteIds ?? Array.from({ length: legsCount }, () => ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingRelayTeam?.id]);

  const athletes = useLiveQuery(
    () =>
      db.athletes
        .where({ meetId, teamId, ageGroup, gender })
        .filter((a) => !a.deleted)
        .toArray(),
    [meetId, teamId, ageGroup, gender]
  );

  if (!isOpen) return null;

  function setLeg(idx: number, athleteId: string) {
    setLegs((prev) => {
      const next = [...prev];
      next[idx] = athleteId;
      return next;
    });
  }

  async function handleSave() {
    if (!teamId) return;
    if (editingRelayTeam) {
      await setRelayTeamLegs(editingRelayTeam.id, meetId, legs);
    } else {
      const rt = await addRelayTeam(meetId, teamId, ageGroup, gender, legsCount);
      await setRelayTeamLegs(rt.id, meetId, legs);
    }
    onClose();
  }

  const filledCount = legs.filter(Boolean).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="font-display text-xl tracking-wide">Состав эстафетной команды</h2>
      <p className="text-xs text-muted -mt-2">
        {ageGroup} • {gender === "м" ? "Юноши" : "Девушки"}
      </p>

      <div>
        <label className="field-label">Команда</label>
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            setLegs(Array.from({ length: legsCount }, () => ""));
          }}
          disabled={!!editingRelayTeam}
          className="field"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!athletes ? (
        <div className="skeleton h-24 rounded-xl2" />
      ) : athletes.length === 0 ? (
        <p className="text-sm text-gold">
          В этой команде нет зарегистрированных спортсменов нужного возраста и пола.
        </p>
      ) : (
        <div className="space-y-2.5">
          {Array.from({ length: legsCount }, (_, idx) => {
            const takenElsewhere = new Set(legs.filter((_, i) => i !== idx).filter(Boolean));
            return (
              <div key={idx}>
                <label className="field-label">Этап {idx + 1}</label>
                <select value={legs[idx] ?? ""} onChange={(e) => setLeg(idx, e.target.value)} className="field">
                  <option value="">— не выбран —</option>
                  {athletes
                    .filter((a) => !takenElsewhere.has(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.bib ? `№${a.bib} ` : ""}
                        {a.fullName}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
          <p className="text-[11px] text-muted num">
            Укомплектовано этапов: {filledCount} из {legsCount}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
        <Button variant="secondary" type="button" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" type="button" onClick={handleSave} disabled={!teamId}>
          Сохранить состав
        </Button>
      </div>
    </Modal>
  );
}
