"use client";

import { useState, useEffect } from "react";
import { updateEntry, deleteEntry } from "@/lib/actions";
import { getEvent } from "@/lib/scoring";
import { Entry, ResultStatus, STATUS_LABELS } from "@/lib/types";

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12151C] rounded-xl max-w-md w-full p-6 space-y-4 border border-white/10 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-xl tracking-wide">Корректировка результата</h2>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs bg-status-fail/10 hover:bg-status-fail/20 text-status-fail font-bold px-2.5 py-1 rounded transition"
          >
            Удалить
          </button>
        </div>

        <p className="text-xs text-muted -mt-2">
          {entry.athleteName} • {eventConfig.name} • {entry.ageGroup} ({entry.gender === "м" ? "Ю" : "Д"})
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Статус</label>
            <select
              value={status ?? "OK"}
              onChange={(e) => setStatus(e.target.value === "OK" ? null : (e.target.value as ResultStatus))}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm font-bold text-[#F2F4F8] outline-none focus:border-track transition"
            >
              <option value="OK">ОК (Засчитано)</option>
              <option value="DNS">{STATUS_LABELS.DNS} (Не явился)</option>
              <option value="DNF">{STATUS_LABELS.DNF} (Сошёл)</option>
              <option value="DQ">{STATUS_LABELS.DQ} (Дисквалифицирован)</option>
              <option value="NM">{STATUS_LABELS.NM} (Без результата)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">
              Результат {status && "(не требуется)"}
            </label>
            <input
              type="text"
              required={!status}
              disabled={!!status}
              placeholder={!status ? eventConfig.unitHint : STATUS_LABELS[status]}
              value={!status ? resultRaw : ""}
              onChange={(e) => setResultRaw(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm num text-[#F2F4F8] outline-none focus:border-track transition disabled:opacity-40"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-1">Официальные очки (необязательно)</label>
            <input
              type="number"
              placeholder="если известны — полностью заменят автоматическую оценку"
              value={manualPoints}
              onChange={(e) => setManualPoints(e.target.value)}
              className="w-full bg-[#171B24] border border-white/10 rounded-lg p-2.5 text-sm num text-[#F2F4F8] outline-none focus:border-track transition"
              disabled={!!status}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/10 text-[#F2F4F8] hover:bg-white/5 transition"
            >
              Отмена
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-track hover:bg-track-dark text-white font-bold transition">
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}