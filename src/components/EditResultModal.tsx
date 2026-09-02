"use client";

import { useState, useEffect } from "react";
import { updateEntry, deleteEntry } from "@/lib/actions";
import { getEvent } from "@/lib/scoring";
import { Entry, ResultStatus, STATUS_LABELS } from "@/lib/types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

interface Props {
  entry: Entry | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditResultModal({ entry, isOpen, onClose }: Props) {
  const [resultRaw, setResultRaw] = useState("");
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [manualPoints, setManualPoints] = useState("");

  useEffect(() => {
    if (entry) {
      setStatus(entry.status);
      setResultRaw(entry.status ? "" : entry.resultRaw);
      setManualPoints(entry.manualPoints != null ? String(entry.manualPoints) : "");
    }
  }, [entry]);

  if (!isOpen || !entry) return null;

  const eventConfig = getEvent(entry.eventKey);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;

    await updateEntry(entry.id, entry.meetId, {
      status,
      resultRaw,
      manualPoints: manualPoints.trim() === "" ? null : Number(manualPoints),
    });

    onClose();
  }

  async function handleDelete() {
    if (!entry) return;
    if (confirm(`Вы уверены, что хотите удалить результат спортсмена ${entry.athleteName}?`)) {
      await deleteEntry(entry.id, entry.meetId);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="font-display text-xl tracking-wide">Корректировка результата</h2>
        <Button variant="danger" type="button" onClick={handleDelete} className="!py-1.5 !px-2.5 !text-xs">
          Удалить
        </Button>
      </div>

      <p className="text-xs text-muted -mt-2">
        {entry.bib ? `№${entry.bib} • ` : ""}
        {entry.athleteName} • {eventConfig.name} • {entry.ageGroup} ({entry.gender === "м" ? "Ю" : "Д"})
      </p>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="field-label">Статус</label>
          <select
            value={status ?? "OK"}
            onChange={(e) => setStatus(e.target.value === "OK" ? null : (e.target.value as ResultStatus))}
            className="field font-bold"
          >
            <option value="OK">ОК (Засчитано)</option>
            <option value="DNS">{STATUS_LABELS.DNS} (Не явился)</option>
            <option value="DNF">{STATUS_LABELS.DNF} (Сошёл)</option>
            <option value="DQ">{STATUS_LABELS.DQ} (Дисквалифицирован)</option>
            <option value="NM">{STATUS_LABELS.NM} (Без результата)</option>
          </select>
        </div>

        <div>
          <label className="field-label">Результат {status && "(не требуется)"}</label>
          <input
            type="text"
            required={!status}
            disabled={!!status}
            placeholder={!status ? eventConfig.unitHint : STATUS_LABELS[status]}
            value={!status ? resultRaw : ""}
            onChange={(e) => setResultRaw(e.target.value)}
            className="field num"
          />
        </div>

        <div>
          <label className="field-label">Официальные очки (необязательно)</label>
          <input
            type="number"
            placeholder="если известны — полностью заменят автоматическую оценку"
            value={manualPoints}
            onChange={(e) => setManualPoints(e.target.value)}
            className="field num"
            disabled={!!status}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
          <Button variant="secondary" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit">
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Modal>
  );
}