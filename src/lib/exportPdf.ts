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

// Компактные размеры шрифта/отступов — раньше таблицы принудительно
// растягивались на всю ширину страницы, из-за чего казались огромными.
// Теперь ширина картинки в PDF считается от реального размера контента
// (см. renderToCanvas/exportPdf), поэтому крупный шрифт больше не нужен.
const TABLE_CSS = `
  <style>
    * { box-sizing: border-box; }
    .pp-block { font-family: Arial, 'Helvetica Neue', sans-serif; color: #000; }
    .pp-title { text-align:center; font-size:15px; font-weight:700; margin:0 0 2px; text-transform:uppercase; white-space:nowrap; }
    .pp-subtitle { text-align:center; font-size:9.5px; margin:0 0 10px; color:#333; white-space:nowrap; }
    .pp-h { font-size:11px; font-weight:700; margin:0 0 5px; text-transform:uppercase; white-space:nowrap; }
    table.pp-table { border-collapse:collapse; margin-bottom:10px; font-size:8.5px; }
    table.pp-table th, table.pp-table td { border:1px solid #000; padding:2px 4px; white-space:nowrap; }
    table.pp-table th { background:#e5e5e5; font-weight:700; text-align:center; }
    td.pp-left { text-align:left; }
    td.pp-center { text-align:center; }
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

/** Командные места ОТДЕЛЬНО для одного пола — по каждой дисциплине свой
 *  столбец очков, плюс итог и место. Раньше в приложении разбивка по
 *  дисциплинам считалась только "по обеим командам сразу" (см.
 *  teamStandingsByEvent в derive.ts); здесь — специально для PDF-выгрузки,
 *  строго в рамках одного пола. */
function buildGenderStandingsHtml(
  entries: Entry[],
  relayTeams: RelayTeam[],
  teams: Team[],
  gender: Gender
): string {
  const genderEntries = entries.filter((e) => !e.deleted && e.gender === gender);
  const genderRelay = relayTeams.filter((r) => !r.deleted && r.gender === gender);

  const eventKeys = Array.from(new Set(genderEntries.map((e) => e.eventKey)));
  const orderedKeys = EVENTS.filter((e) => eventKeys.includes(e.key)).map((e) => e.key);
  const hasRelay = genderRelay.length > 0;

  if (orderedKeys.length === 0 && !hasRelay) return "";

  const sumForTeamEvent = (teamId: string, eventKey: string) =>
    genderEntries
      .filter((e) => e.teamId === teamId && e.eventKey === eventKey)
      .reduce((s, e) => s + pointsForEntry(e).pts, 0);
  const sumRelayForTeam = (teamId: string) =>
    genderRelay.filter((r) => r.teamId === teamId).reduce((s, r) => s + pointsForRelayTeam(r).pts, 0);

  const rows = teams.map((t) => {
    const cells = orderedKeys.map((k) => sumForTeamEvent(t.id, k));
    const relayPts = hasRelay ? sumRelayForTeam(t.id) : 0;
    const total = cells.reduce((s, v) => s + v, 0) + relayPts;
    return { team: t, cells, relayPts, total };
  });
  rows.sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name, "ru"));

  const headCells =
    orderedKeys.map((k) => `<th>${esc(getEvent(k).name)}</th>`).join("") +
    (hasRelay ? `<th>${esc(getEvent("relay").name)}</th>` : "");

  const bodyRows = rows
    .map((r, idx) => {
      const cellsHtml =
        r.cells.map((v) => `<td class="pp-center">${v}</td>`).join("") +
        (hasRelay ? `<td class="pp-center">${r.relayPts}</td>` : "");
      return `<tr><td class="pp-center">${idx + 1}</td><td class="pp-left">${esc(
        r.team.name
      )}</td>${cellsHtml}<td class="pp-center"><b>${r.total}</b></td></tr>`;
    })
    .join("");

  return `
    <div class="pp-h">Командные места по дисциплинам — ${gender === "м" ? "Юноши" : "Девушки"}</div>
    <table class="pp-table">
      <thead><tr><th>Место</th><th>Команда</th>${headCells}<th>Итого</th></tr></thead>
      <tbody>${bodyRows}</tbody>
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

/** Рендерит HTML-фрагмент в canvas, ЖЁСТКО отслеживая реальный размер
 *  контента: контейнер не получает фиксированную ширину, а сам "садится"
 *  по контенту (shrink-to-fit у position:fixed), после чего мы передаём
 *  html2canvas точный scrollWidth/scrollHeight — иначе таблица шире
 *  контейнера просто обрезается по правому краю (это и была причина
 *  обрезанной первой таблицы и подписей). */
async function renderToCanvas(html: string): Promise<{ canvas: HTMLCanvasElement; widthPx: number }> {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.background = "#ffffff";
  el.style.display = "inline-block";
  el.innerHTML = TABLE_CSS + `<div class="pp-block">${html}</div>`;
  document.body.appendChild(el);
  try {
    // Даём браузеру посчитать layout перед измерением.
    const widthPx = Math.ceil(el.scrollWidth);
    const heightPx = Math.ceil(el.scrollHeight);
    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: widthPx,
      height: heightPx,
      windowWidth: widthPx,
      windowHeight: heightPx,
    });
    return { canvas, widthPx };
  } finally {
    document.body.removeChild(el);
  }
}

// 1 CSS-пиксель (96dpi) = 0.75pt (72dpi) — используем эту величину, чтобы
// таблицы в PDF имели естественный, а не растянутый на всю ширину листа
// размер. Слишком широкие таблицы (например общая сводная) всё равно
// вписываются по ширине страницы за счёт cap'а на usableWidth ниже.
const PX_TO_PT = 0.75;

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
    const boysStandingsHtml = buildGenderStandingsHtml(entries, relayTeams, teams, "м");
  const girlsStandingsHtml = buildGenderStandingsHtml(entries, relayTeams, teams, "ж");
  const disciplineBlocks = buildDisciplineBlocks(meet, entries, teams);

  // Подписи — тем же способом рендера, что и таблицы (HTML → canvas →
  // картинка): встроенные шрифты jsPDF (helvetica и т.п.) не умеют в
  // кириллицу и превращают текст в набор символов, поэтому pdf.text()
  // здесь не годится — используем тот же браузерный рендер, что и для
  // остального контента.
  const signHtml = `
    <div style="display:flex; justify-content:space-between; gap:40px; margin-top:6px; font-size:10px; font-weight:700; white-space:nowrap;">
      <div>Главный судья соревнований _____________________</div>
      <div>Главный секретарь соревнований _____________________</div>
    </div>
  `;

  const blocksHtml = [
    titleHtml + overviewHtml,
    relayHtml,
    boysStandingsHtml,
    girlsStandingsHtml,
    ...disciplineBlocks,
    signHtml,
  ].filter(Boolean);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 30;
  const usableWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  let cursorY = margin;
  let pageHasContent = false;

  for (const html of blocksHtml) {
    const { canvas, widthPx } = await renderToCanvas(html);

    const naturalWidthPt = widthPx * PX_TO_PT;
    const imgWidthPt = Math.min(naturalWidthPt, usableWidth);
    const imgHeightPt = imgWidthPt * (canvas.height / canvas.width);
    const x = margin + (usableWidth - imgWidthPt) / 2;

    if (imgHeightPt <= maxHeight) {
      if (pageHasContent && cursorY + imgHeightPt > pageHeight - margin) {
        pdf.addPage();
        cursorY = margin;
      }
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, cursorY, imgWidthPt, imgHeightPt);
      cursorY += imgHeightPt + 12;
      pageHasContent = true;
    } else {
      const pxPerPageHeight = (maxHeight * canvas.width) / imgWidthPt;
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
        const sliceImgHeightPt = (sliceHeightPx * imgWidthPt) / canvas.width;
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", x, margin, imgWidthPt, sliceImgHeightPt);
        sy += sliceHeightPx;
        pageHasContent = true;
      }
      cursorY = margin;
    }
  }

  pdf.save(`${meet.name ?? "meet"}.pdf`);
}
