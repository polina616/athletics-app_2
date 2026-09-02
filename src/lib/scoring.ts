import { EventConfig, Gender } from "./types";

/**
 * ОЦЕНОЧНАЯ (неофициальная) модель очков.
 *
 * Как и раньше — это не официальная таблица очков, а приближённая формула
 * той же формы, что используется в официальных таблицах: чем ближе
 * результат к «элитному» уровню (anchors.elite), тем ближе очки к 1000;
 * результат на уровне «базового» уровня (anchors.base) — около нуля.
 *
 * ВАЖНОЕ ИЗМЕНЕНИЕ ПО ПРОСЬБЕ: минимальный порог очков понижен. Результат
 * хуже «базового» уровня раньше давал 0 очков — теперь он даёт минимальный
 * символический балл (MIN_POINTS), чтобы слабые/младшие участники тоже
 * получали хоть какие-то очки, а не 0. Судья в любой момент может вписать
 * официальные очки вручную — они полностью заменяют оценку.
 *
 * Место в протоколе при этом ВСЕГДА определяется по фактическому
 * результату (времени/расстоянию/очкам стрельбы/разам), а не по этой
 * оценке — см. protocolRows() в derive.ts. Так места корректно
 * расставляются даже если у слабых участников очки минимальны или равны.
 *
 * Анкорные значения (elite/base) ниже — расчётные ориентиры для школьного/
 * юношеского многоборья, не официальные нормативы. Отредактируйте их под
 * свою возрастную специфику при необходимости — они все в одном месте.
 *
 * ДИСЦИПЛИНЫ С ПРОИЗВОЛЬНОЙ ДИСТАНЦИЕЙ (лыжи, эстафета): фиксированных
 * anchors у них нет, вместо этого задан paceAnchors — темп (сек на 1 км).
 * Реальная дистанция вводится судьёй при создании соревнования
 * (Meet.eventParams[eventKey].distanceMeters), а anchors на неё считаются
 * динамически в distanceAnchor() ниже.
 */
export const MIN_POINTS = 1;

export const EVENTS: EventConfig[] = [
  // ---------------- бег ----------------
  {
    key: "60m", name: "Бег 60 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 9.20", exponent: 1.85,
    anchors: { м: { elite: 7.0, base: 11.5 }, ж: { elite: 7.6, base: 12.5 } },
  },
  {
    key: "100m", name: "Бег 100 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 13.63", exponent: 1.85,
    anchors: { м: { elite: 10.8, base: 15.5 }, ж: { elite: 11.8, base: 17.0 } },
  },
  {
    key: "200m", name: "Бег 200 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 27.85", exponent: 1.85,
    anchors: { м: { elite: 21.8, base: 32.0 }, ж: { elite: 24.0, base: 36.0 } },
  },
  {
    key: "400m", name: "Бег 400 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 58.40", exponent: 1.85,
    anchors: { м: { elite: 48.5, base: 75.0 }, ж: { elite: 54.0, base: 85.0 } },
  },
    {
    key: "500m", name: "Бег 500 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 78.40", exponent: 1.87,
    anchors: { м: { elite: 62.0, base: 95.0 }, ж: { elite: 70.0, base: 105.0 } },
  },
  {
    key: "800m", name: "Бег 800 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 2:35.80", exponent: 1.9,
    anchors: { м: { elite: 112, base: 190 }, ж: { elite: 130, base: 220 } },
  },
  {
    key: "1000m", name: "Бег 1000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 3:10.00", exponent: 1.9,
    anchors: { м: { elite: 150, base: 260 }, ж: { elite: 175, base: 300 } },
  },
  {
    key: "1500m", name: "Бег 1500 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 4:30.50", exponent: 1.9,
    anchors: { м: { elite: 235, base: 390 }, ж: { elite: 265, base: 450 } },
  },
  {
    key: "2000m", name: "Бег 2000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 6:20.00", exponent: 1.9,
    anchors: { м: { elite: 340, base: 560 }, ж: { elite: 390, base: 620 } },
  },
  {
    key: "3000m", name: "Бег 3000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 9:40.00", exponent: 1.9,
    anchors: { м: { elite: 510, base: 840 }, ж: { elite: 580, base: 960 } },
  },
  {
    key: "ski", name: "Бег на лыжах", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 8:45.00",
    customDistance: true,
    exponent: 1.9,
    // paceAnchors — темп в сек/км, масштабируется на дистанцию из настроек
    paceAnchors: { м: { elite: 170, base: 300 }, ж: { elite: 195, base: 340 } },
  },
  {
    key: "relay", name: "Эстафета", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 1:02.30",
    customDistance: true,
    exponent: 1.85,
    paceAnchors: { м: { elite: 108, base: 155 }, ж: { elite: 118, base: 170 } },
  },

  // ---------------- прыжки ----------------
  {
    key: "ljStanding", name: "Прыжок в длину с места", cat: "jump",
    unitHint: "метры, напр. 1.95", exponent: 1.4,
    anchors: { м: { elite: 2.6, base: 1.2 }, ж: { elite: 2.2, base: 1.0 } },
  },
  {
    key: "ljRun", name: "Прыжок в длину с разбега", cat: "jump",
    unitHint: "метры, напр. 4.35", exponent: 1.4,
    anchors: { м: { elite: 6.5, base: 2.8 }, ж: { elite: 5.5, base: 2.3 } },
  },

  // ---------------- метания ----------------
  {
    key: "grenade300", name: "Метание гранаты 300 г", cat: "throw",
    unitHint: "метры, напр. 28.40", exponent: 1.05,
    anchors: { м: { elite: 55, base: 20 }, ж: { elite: 40, base: 12 } },
  },
  {
    key: "grenade500", name: "Метание гранаты 500 г", cat: "throw",
    unitHint: "метры, напр. 22.10", exponent: 1.05,
    anchors: { м: { elite: 45, base: 15 }, ж: { elite: 32, base: 10 } },
  },
  {
    key: "grenade700", name: "Метание гранаты 700 г", cat: "throw",
    unitHint: "метры, напр. 18.00", exponent: 1.05,
    anchors: { м: { elite: 38, base: 12 }, ж: { elite: 26, base: 8 } },
  },
  {
    key: "sword150", name: "Метание меча 150 г", cat: "throw",
    unitHint: "метры, напр. 24.00", exponent: 1.05,
    anchors: { м: { elite: 50, base: 18 }, ж: { elite: 38, base: 12 } },
  },

  // ---------------- сила ----------------
  {
    key: "pullups", name: "Подтягивания на перекладине", cat: "strength",
    unitHint: "раз, напр. 12", exponent: 1.15,
    anchors: { м: { elite: 20, base: 1 }, ж: { elite: 12, base: 1 } },
  },
  {
    key: "pushups", name: "Отжимания от пола", cat: "strength",
    unitHint: "раз, напр. 25", exponent: 1.1,
    anchors: { м: { elite: 55, base: 3 }, ж: { elite: 35, base: 2 } },
  },

  // ---------------- стрельба ----------------
  // Разделена на два отдельных протокола по числу зачётных выстрелов —
  // раньше была одна дисциплина "airrifle" с произвольной длиной серии.
  {
    key: "airrifle5", name: "Пневматическая винтовка (5 выстрелов)", cat: "shooting",
    unitHint: "очки, напр. 42 (сумма за серию из 5 выстрелов)",
    // очки = введённый результат напрямую, формула элита/база не применяется
  },
  {
    key: "airrifle10", name: "Пневматическая винтовка (10 выстрелов)", cat: "shooting",
    unitHint: "очки, напр. 84 (сумма за серию из 10 выстрелов)",
    // очки = введённый результат напрямую, формула элита/база не применяется
  },
];

/** Дисциплины, сгруппированные по типу — используется в форме создания
 *  соревнования для наглядного отображения. */
export const EVENT_GROUPS: { label: string; events: EventConfig[] }[] = [
  { label: "Бег", events: EVENTS.filter((e) => e.cat === "track") },
  { label: "Прыжки", events: EVENTS.filter((e) => e.cat === "jump") },
  { label: "Метания", events: EVENTS.filter((e) => e.cat === "throw") },
  { label: "Сила", events: EVENTS.filter((e) => e.cat === "strength") },
  { label: "Стрельба", events: EVENTS.filter((e) => e.cat === "shooting") },
];

export function getEvent(key: string): EventConfig {
  const ev = EVENTS.find((e) => e.key === key);
  if (!ev) throw new Error(`Unknown event key: ${key}`);
  return ev;
}

/** Парсит то, что судья ввёл вручную, в нормализованное число (секунды,
 *  метры, разы или очки стрельбы). */
export function parseResult(ev: EventConfig, raw: string): number {
  const cleaned = raw.trim().replace(",", ".");
  if (ev.cat === "jump" || ev.cat === "throw" || ev.cat === "shooting" || ev.cat === "strength") {
    return parseFloat(cleaned);
  }
  if (ev.timeFmt === "mmss" && cleaned.includes(":")) {
    const [m, s] = cleaned.split(":");
    return parseInt(m, 10) * 60 + parseFloat(s);
  }
  return parseFloat(cleaned);
}

export function formatSeconds(sec: number): string {
  if (Number.isNaN(sec)) return "—";
  if (sec >= 60) {
    const m = Math.floor(sec / 60);
    const s = (sec - m * 60).toFixed(2).padStart(5, "0");
    return `${m}:${s}`;
  }
  return sec.toFixed(2);
}

/** Резервная дистанция (м) для лыж/эстафеты, если по какой-то причине она
 *  не задана в настройках соревнования — чтобы оценка очков не
 *  превращалась в минимум у всех подряд. */
const FALLBACK_DISTANCE: Record<string, number> = {
  ski: 1000,
  relay: 400,
};

/** Anchors для дисциплины с произвольной дистанцией: темп (сек/км) из
 *  paceAnchors умножается на реальную дистанцию соревнования. */
function distanceAnchor(
  ev: EventConfig,
  gender: Gender,
  distanceMeters?: number
): { elite: number; base: number } | undefined {
  const pace = ev.paceAnchors?.[gender];
  if (!pace) return undefined;
  const meters = distanceMeters ?? FALLBACK_DISTANCE[ev.key] ?? 1000;
  const km = meters / 1000;
  return { elite: pace.elite * km, base: pace.base * km };
}

/** Очки для одного результата.
 *  - Стрельба: очки = сам введённый результат (это уже счёт), без формулы.
 *  - Остальное: формула по опорным точкам (фиксированным или посчитанным
 *    от дистанции), но с пониженным минимальным порогом — вместо 0
 *    возвращается MIN_POINTS. */
export function computeAutoPoints(
  ev: EventConfig,
  gender: Gender,
  value: number,
  distanceMeters?: number
): number {
  if (Number.isNaN(value)) return 0;

  if (ev.cat === "shooting") {
    return Math.max(0, Math.round(value));
  }

  const anchor = ev.customDistance ? distanceAnchor(ev, gender, distanceMeters) : ev.anchors?.[gender];
  if (!anchor) return 0;

  const C = ev.exponent ?? 1.5;
  let diff: number;
  let spread: number;
  if (ev.cat === "track") {
    diff = anchor.base - value; // бег: меньше время — лучше
    spread = anchor.base - anchor.elite;
  } else {
    diff = value - anchor.base; // прыжки/метания/сила: больше — лучше
    spread = anchor.elite - anchor.base;
  }

  if (diff <= 0) {
    // результат хуже базового уровня — не 0, а минимальный балл
    return MIN_POINTS;
  }
  const A = 1000 / Math.pow(spread, C);
  return Math.max(MIN_POINTS, Math.round(A * Math.pow(diff, C)));
}

export function formulaNote(
  ev: EventConfig,
  gender: Gender,
  value: number,
  pts: number,
  distanceMeters?: number
): string {
  if (ev.cat === "shooting") {
    return `Очки = введённый результат стрельбы: ${pts}.`;
  }
  const anchor = ev.customDistance ? distanceAnchor(ev, gender, distanceMeters) : ev.anchors?.[gender];
  if (!anchor) return "";
  const dir = ev.cat === "track" ? `${anchor.base.toFixed(1)} − результат` : `результат − ${anchor.base.toFixed(1)}`;
  const unit = ev.cat === "track" ? "с" : ev.cat === "strength" ? "раз" : "м";
  const distNote = ev.customDistance
    ? ` Дистанция соревнования: ${distanceMeters ?? FALLBACK_DISTANCE[ev.key] ?? "?"} м.`
    : "";
  return `Оценка: P ≈ (1000 / размах^${ev.exponent}) × (${dir})^${ev.exponent} ≈ ${pts} (минимум ${MIN_POINTS} балл, даже если результат хуже базового). Опора: элитный ${anchor.elite.toFixed(1)}${unit} → 1000, базовый ${anchor.base.toFixed(1)}${unit} → ${MIN_POINTS}.${distNote}`;
}