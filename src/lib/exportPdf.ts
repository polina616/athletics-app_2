import { db } from "./db";
import { pointsForEntry, pointsForRelayTeam, protocolRows, relayProtocolRows } from "./derive";
import { EVENTS, formatSeconds, getEvent } from "./scoring";
import { Athlete, Entry, Gender, Meet, RelayTeam, STATUS_LABELS, Team } from "./types";

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function eventPairs(meet: Meet, eventKey: string): { ag: string; g: Gender }[] {
  const eligibilityRows = meet.eventEligibility.filter((el) => el.eventKey === eventKey);
  const pairs: { ag: string; g: Gender }[] = [];
  const seen = new Set<string>();
  const addPair = (ag: string, g: Gender) => {
    const key = `${ag}__${g}`;
    if (!seen.has(key)) {
      seen.add(key);
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
  return pairs;
}

function isEligible(meet: Meet, eventKey: string, ag: string, g: Gender): boolean {
  return meet.eventEligibility.some(
    (el) => el.eventKey === eventKey && el.ageGroups.includes(ag) && el.genders.includes(g)
  );
}

function resultText(eventKey: string, entry: Entry): string {
  if (entry.status) return STATUS_LABELS[entry.status];
  const ev = getEvent(eventKey);
  if (ev.cat === "track") return formatSeconds(entry.resultSeconds ?? NaN);
  if (ev.cat === "strength") return `${entry.resultSeconds ?? "—"} раз`;
  return `${entry.resultSeconds ?? "—"} м`;
}

const TABLE_CSS = `
  <style>
    * { box-sizing: border-box; }
    .pp-block { font-family: Arial, 'Helvetica Neue', sans-serif; color: #000; }
    .pp-title { text-align:center; font-size:16px; font-weight:700; margin:0 0 2px; text-transform:uppercase; }
    .pp-subtitle { text-align:center; font-size:11px; margin:0 0 14px; color:#333; }
    .pp-h { font-size:13px; font-weight:700; margin:0 0 6px; text-transform:uppercase; }
    table.pp-table { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:10px; }
    table.pp-table th, table.pp-table td { border:1px solid #000; padding:3px 5px; }
    table.pp-table th { background:#e5e5e5; font-weight:700; text-align:center; }
    td.pp-left { text-align:left; }
    td.pp-center { text-align:center; }
    .pp-sign { display:flex; justify-content:space-between; margin-top:24px; font-size:11px; font-weight:700; }
  </style>
`;

function buildOverviewHtml(meet: Meet, teams: Team[], entries: Entry[]): string {
  const ageGroups = meet.ageGroups;
  const eventsByAgeGroup = ageGroups.map((ag) => {
    const keys = new Set(
      meet.eventEligibility.filter((el) => el.eventKey !== "relay" && el.ageGroups.includes(ag)).map((el) => el.eventKey)
    );
    return { ag, events: EVENTS.filter((e) => keys.has(e.key)) };
  });

  const sumPoints = (teamId: string, ag: string, eventKey: string, g: Gender) =>
    entries
      .filter((e) => !e.deleted && e.teamId === teamId && e.ageGroup === ag && e.eventKey === eventKey && e.gender === g)
      .reduce((s, e) => s + pointsForEntry(e).pts, 0);

  const teamRows = teams.map((t) => {
    const cells: (string | number)[] = [];
    let total = 0;
    for (const { ag, events } of eventsByAgeGroup) {
      for (const ev of events) {
        (["м", "ж"] as Gender[]).forEach((g) => {
          if (!isEligible(meet, ev.key, ag, g)) {
            cells.push("—");
            return;
          }
          const pts = sumPoints(t.id, ag, ev.key, g);
          total += pts;
          cells.push(pts);
        });
      }
    }
    return { team: t, cells, total };
  });
  teamRows.sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name, "ru"));

  if (teamRows.length === 0 || eventsByAgeGroup.every((x) => x.events.length === 0)) return "";

  let head1 = `<th rowspan="3">Место</th><th rowspan="3">Команда</th>`;
  let head2 = "";
  let head3 = "";
  for (const { ag, events } of eventsByAgeGroup) {
    for (const ev of events) {
      head1 += `<th colspan="2">${esc(ag)}</th>`;
      head2 += `<th colspan="2">${esc(ev.name)}</th>`;
      head3 += `<th>Ю</th><th>Д</th>`;
    }
  }
  head1 += `<th rowspan="3">Итого</th>`;

  const bodyRows = teamRows
    .map(
      (r, idx) =>
        `<tr><td class="pp-center">${idx + 1}</td><td class="pp-left">${esc(r.team.name)}</td>${r.cells
          .map((c) => `<td class="pp-center">${esc(c)}</td>`)
          .join("")}<td class="pp-center"><b>${r.total}</b></td></tr>`
    )
    .join("");

  return `
    <div class="pp-h">Общая таблица команд</div>
    <table class="pp-table">
      <thead><tr>${head1}</tr><tr>${head2}</tr><tr>${head3}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function buildRelayHtml(meet: Meet, relayTeams: RelayTeam[], teams: Team[], athletes: Athlete[]): string {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const athleteLabel = (id: string) => {
    const a = athletes.find((x) => x.id === id);
    return a ? `${a.bib ? `№${esc(a.bib)} ` : ""}${esc(a.fullName)}` : "—";
  };

  const pairs = eventPairs(meet, "relay");
  const rows: string[] = [];
  for (const { ag, g } of pairs) {
    const catRows = relayProtocolRows(relayTeams, ag, g);
    for (const { relayTeam, place } of catRows) {
      const composition = relayTeam.legAthleteIds.map((id) => (id ? athleteLabel(id) : "—")).join(" → ");
      const timeText = relayTeam.status
        ? STATUS_LABELS[relayTeam.status]
        : relayTeam.resultSeconds !== null
        ? formatSeconds(relayTeam.resultSeconds)
        : "—";
      const { pts } = pointsForRelayTeam(relayTeam);
      rows.push(
        `<tr><td class="pp-center">${place ?? "—"}</td><td class="pp-left">${esc(
          teamName(relayTeam.teamId)
        )}</td><td class="pp-left">${composition}</td><td class="pp-center">${esc(ag)} (${
          g === "м" ? "Ю" : "Д"
        })</td><td class="pp-center">${esc(timeText)}</td><td class="pp-center">${pts}</td></tr>`
      );
    }
  }
  if (rows.length === 0) return "";

  return `
    <div class="pp-h">${esc(getEvent("relay").name)}</div>
    <table class="pp-table">
      <thead><tr><th>Место</th><th>Команда</th><th>Состав по этапам</th><th>Категория</th><th>Результат</th><th>Очки</th></tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function buildDisciplineBlocks(meet: Meet, entries: Entry[], teams: Team[]): string[] {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? "—";
  const eventKeys = Array.from(new Set(meet.eventEligibility.map((el) => el.eventKey))).filter(
    (key) => key !== "relay" && EVENTS.some((e) => e.key === key)
  );
  const orderedKeys = EVENTS.filter((e) => eventKeys.includes(e.key)).map((e) => e.key);

  const blocks: string[] = [];
  for (const eventKey of orderedKeys) {
    const ev = getEvent(eventKey);
    for (const { ag, g } of eventPairs(meet, eventKey)) {
      const catRows = protocolRows(entries, eventKey, ag, g);
      if (catRows.length === 0) continue;

      const rowsHtml = catRows
        .map(
          (r) => `<tr>
            <td class="pp-center">${r.place ?? "—"}</td>
            <td class="pp-center">${esc(r.entry.bib ?? "")}</td>
            <td class="pp-left">${esc(r.entry.athleteName)}</td>
            <td class="pp-left">${esc(teamName(r.entry.teamId))}</td>
            <td class="pp-center">${esc(resultText(eventKey, r.entry))}</td>
            <td class="pp-center"><b>${r.pts}</b></td>
          </tr>`
        )
        .join("");

      blocks.push(`
        <div class="pp-h">${esc(ev.name)} — ${esc(ag)} (${g === "м" ? "юноши" : "девушки"})</div>
        <table class="pp-table">
          <thead><tr><th>Место</th><th>№</th><th>Фамилия, имя</th><th>Команда</th><th>Результат</th><th>Очки</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `);
    }
  }
  return blocks;
}

async function renderToCanvas(html: string, width = 760) {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.width = `${width}px`;
  el.style.background = "#ffffff";
  el.innerHTML = TABLE_CSS + `<div class="pp-block">${html}</div>`;
  document.body.appendChild(el);
  try {
    return await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
  } finally {
    document.body.removeChild(el);
  }
}

export async function exportPdf(meetId: string): Promise<void> {
  const meet = await db.meets.get(meetId);
  if (!meet) return;
  const teams = (await db.teams.where({ meetId }).toArray()).filter((t) => !t.deleted);
  const entries = (await db.entries.where({ meetId }).toArray()).filter((e) => !e.deleted);
  const relayTeams = (await db.relayTeams.where({ meetId }).toArray()).filter((r) => !r.deleted);
  const athletes = (await db.athletes.where({ meetId }).toArray()).filter((a) => !a.deleted);

  const { jsPDF } = await import("jspdf");

  const titleHtml = `
    <div class="pp-title">${esc(meet.name)}</div>
    <div class="pp-subtitle">${esc(meet.date ?? "")}${meet.place ? " • " + esc(meet.place) : ""}</div>
  `;
  const overviewHtml = buildOverviewHtml(meet, teams, entries);
  const relayHtml = relayTeams.length ? buildRelayHtml(meet, relayTeams, teams, athletes) : "";
  const disciplineBlocks = buildDisciplineBlocks(meet, entries, teams);
  const signHtml = `
    <div class="pp-sign">
      <div>Главный судья соревнований _____________________</div>
      <div>Главный секретарь соревнований _____________________</div>
    </div>
  `;

  const blocksHtml = [titleHtml + overviewHtml, relayHtml, ...disciplineBlocks, signHtml].filter(Boolean);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const usableWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  let cursorY = margin;
  let pageHasContent = false;

  for (const html of blocksHtml) {
    const canvas = await renderToCanvas(html);
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    if (imgHeight <= maxHeight) {
      if (pageHasContent && cursorY + imgHeight > pageHeight - margin) {
        pdf.addPage();
        cursorY = margin;
      }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, cursorY, usableWidth, imgHeight);
      cursorY += imgHeight + 10;
      pageHasContent = true;
    } else {
      // Блок выше страницы — режем на части.
      const pxPerPageHeight = (maxHeight * canvas.width) / usableWidth;
      let sy = 0;
      while (sy < canvas.height) {
        if (pageHasContent) {
          pdf.addPage();
          cursorY = margin;
        }
        const sliceHeightPx = Math.min(pxPerPageHeight, canvas.height - sy);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, sy, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceImgHeight = (sliceHeightPx * usableWidth) / canvas.width;
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, usableWidth, sliceImgHeight);
        sy += sliceHeightPx;
        pageHasContent = true;
      }
    }
  }

  pdf.save(`${meet.name ?? "meet"}.pdf`);
}
