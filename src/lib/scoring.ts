import { EventConfig, Gender } from "./types";

/**
 * ОЦЕНОЧНАЯ (неофициальная) модель очков.
 *
 * Линейная шкала: результат на уровне anchors.base даёт BASE_POINTS,
 * результат на уровне anchors.elite даёт 1000 очков, всё что между —
 * прямая линия (без экспоненты, как было раньше). Результат хуже базового
 * тоже снижается линейно — от BASE_POINTS до MIN_POINTS на границе ещё
 * одного такого же "размаха" хуже базового.
 *
 * ВАЖНО: все дисциплины, включая стрельбу, теперь считаются по ОДНОЙ и
 * той же формуле с anchors (elite/base). Раньше стрельба была
 * исключением — очки = сырой результат серии (макс. 50/100), из-за чего
 * она давала в разы меньше очков, чем остальные дисциплины, отмасштабированные
 * к 1000 за элитный результат. Теперь и она приведена к общей шкале, так
 * что вклад любой дисциплины в сумму/зачёт сопоставим по порядку величины.
 *
 * Место в протоколе по-прежнему определяется по фактическому результату, а
 * не по этой оценке — см. protocolRows() в derive.ts.
 *
 * Анкорные значения (elite/base) — расчётные ориентиры для школьного/
 * юношеского многоборья, не официальные нормативы. Отредактируйте их под
 * свою специфику при необходимости — они все в одном месте.
 *
 * ДИСЦИПЛИНЫ С ПРОИЗВОЛЬНОЙ ДИСТАНЦИЕЙ (лыжи, эстафета): фиксированных
 * anchors у них нет, вместо этого задан paceAnchors — темп (сек на 1 км).
 * Реальная дистанция вводится судьёй при создании соревнования
 * (Meet.eventParams[eventKey].distanceMeters), а anchors на неё считаются
 * динамически в distanceAnchor() ниже.
 */
export const MIN_POINTS = 1;
const BASE_POINTS = 15;
/** Очки за элитный результат (anchors.elite) — единая точка отсчёта для
 *  ВСЕХ дисциплин, это и есть то, что делает шкалу сопоставимой. */
const ELITE_POINTS = 1000;

export const EVENTS: EventConfig[] = [
  // ---------------- бег ----------------
  {
    key: "60m", name: "Бег 60 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 9.20",
    anchors: { м: { elite: 7.0, base: 11.5 }, ж: { elite: 7.6, base: 12.5 } },
  },
  {
    key: "100m", name: "Бег 100 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 13.63",
    anchors: { м: { elite: 10.8, base: 15.5 }, ж: { elite: 11.8, base: 17.0 } },
  },
  {
    key: "200m", name: "Бег 200 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 27.85",
    anchors: { м: { elite: 21.8, base: 32.0 }, ж: { elite: 24.0, base: 36.0 } },
  },
  {
    key: "400m", name: "Бег 400 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 58.40",
    anchors: { м: { elite: 48.5, base: 75.0 }, ж: { elite: 54.0, base: 85.0 } },
  },
  {
    key: "500m", name: "Бег 500 м", cat: "track", timeFmt: "sec",
    unitHint: "сек, напр. 78.40",
    anchors: { м: { elite: 62.0, base: 95.0 }, ж: { elite: 70.0, base: 105.0 } },
  },
  {
    key: "600m", name: "Бег 600 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 1:35.20",
    anchors: { м: { elite: 79, base: 127 }, ж: { elite: 90, base: 143 } },
  },
  {
    key: "800m", name: "Бег 800 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 2:35.80",
    anchors: { м: { elite: 112, base: 205 }, ж: { elite: 130, base: 235 } },
  },
  {
    key: "1000m", name: "Бег 1000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 3:10.00",
    anchors: { м: { elite: 150, base: 280 }, ж: { elite: 175, base: 320 } },
  },
  {
    key: "1500m", name: "Бег 1500 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 4:30.50",
    anchors: { м: { elite: 235, base: 415 }, ж: { elite: 265, base: 480 } },
  },
  {
    key: "2000m", name: "Бег 2000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 6:20.00",
    anchors: { м: { elite: 340, base: 560 }, ж: { elite: 390, base: 620 } },
  },
  {
    key: "3000m", name: "Бег 3000 м", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 9:40.00",
    anchors: { м: { elite: 510, base: 840 }, ж: { elite: 580, base: 960 } },
  },
  {
    key: "ski", name: "Бег на лыжах", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 8:45.00",
    customDistance: true,
    paceAnchors: { м: { elite: 170, base: 300 }, ж: { elite: 195, base: 340 } },
  },
  {
    key: "relay", name: "Эстафета", cat: "track", timeFmt: "mmss",
    unitHint: "мм:сс.д, напр. 1:02.30",
    customDistance: true,
    paceAnchors: { м: { elite: 108, base: 155 }, ж: { elite: 118, base: 170 } },
  },

  // ---------------- прыжки ----------------
  {
    key: "ljStanding", name: "Прыжок в длину с места", cat: "jump",
    unitHint: "метры, напр. 1.95",
    anchors: { м: { elite: 2.6, base: 1.2 }, ж: { elite: 2.2, base: 1.0 } },
  },
  {
    key: "ljRun", name: "Прыжок в длину с разбега", cat: "jump",
    unitHint: "метры, напр. 4.35",
    anchors: { м: { elite: 6.5, base: 2.8 }, ж: { elite: 5.5, base: 2.3 } },
  },

  // ---------------- метания ----------------
  {
    key: "grenade300", name: "Метание гранаты 300 г", cat: "throw",
    unitHint: "метры, напр. 28.40",
    anchors: { м: { elite: 55, base: 20 }, ж: { elite: 40, base: 12 } },
  },
  {
    key: "grenade500", name: "Метание гранаты 500 г", cat: "throw",
    unitHint: "метры, напр. 22.10",
    anchors: { м: { elite: 45, base: 15 }, ж: { elite: 32, base: 10 } },
  },
  {
    key: "grenade700", name: "Метание гранаты 700 г", cat: "throw",
    unitHint: "метры, напр. 18.00",
    anchors: { м: { elite: 38, base: 12 }, ж: { elite: 26, base: 8 } },
  },
  {
    key: "sword150", name: "Метание меча 150 г", cat: "throw",
    unitHint: "метры, напр. 24.00",
    anchors: { м: { elite: 50, base: 18 }, ж: { elite: 38, base: 12 } },
  },

  // ---------------- сила ----------------
  {
    key: "pullups", name: "Подтягивания на перекладине", cat: "strength",
    unitHint: "раз, напр. 12",
    anchors: { м: { elite: 20, base: 1 }, ж: { elite: 12, base: 1 } },
  },
  {
    key: "pushups", name: "Отжимания от пола", cat: "strength",
    unitHint: "раз, напр. 25",
    anchors: { м: { elite: 55, base: 3 }, ж: { elite: 35, base: 2 } },
  },

  // ---------------- стрельба ----------------
  // Раньше очки = сырой результат серии (0..50 / 0..100), из-за чего
  // стрельба давала в разы меньше очков, чем остальные дисциплины. Теперь
  // считается по той же anchor-формуле, что и всё остальное — элитная
  // серия даёт ~1000, базовая — BASE_POINTS, как и везде.
  {
    key: "airrifle5", name: "Пневматическая винтовка (5 выстрелов)", cat: "shooting",
    unitHint: "очки, напр. 42 (сумма за серию из 5 выстрелов, макс. 50)",
    anchors: { м: { elite: 45, base: 20 }, ж: { elite: 45, base: 20 } },
  },
  {
    key: "airrifle10", name: "Пневматическая винтовка (10 выстрелов)", cat: "shooting",
    unitHint: "очки, напр. 84 (сумма за серию из 10 выстрелов, макс. 100)",
    anchors: { м: { elite: 88, base: 40 }, ж: { elite: 88, base: 40 } },
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
  if (ev) return ev;
  console.warn(`[scoring] Unknown event key: "${key}" — using placeholder config.`);
  return {
    key,
    name: `Неизвестная дисциплина (${key})`,
    cat: "track",
    unitHint: "",
  };
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
 *  не задана в настройках соревнования. */
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

/** Очки для одного результата — ЛИНЕЙНАЯ шкала, одинаковая по форме для
 *  ВСЕХ дисциплин (включая стрельбу):
 *   - результат = базовый норматив  → BASE_POINTS
 *   - результат = элитный норматив  → ELITE_POINTS (1000)
 *   - между ними — прямая линия (никакой экспоненты)
 *   - лучше элитного — линейно продолжается выше 1000
 *   - хуже базового — линейно снижается до MIN_POINTS на границе ещё
 *     одного такого же "размаха" хуже базового, дальше — жёсткий пол */
export function computeAutoPoints(
  ev: EventConfig,
  gender: Gender,
  value: number,
  distanceMeters?: number
): number {
  if (Number.isNaN(value)) return 0;

  const anchor = ev.customDistance ? distanceAnchor(ev, gender, distanceMeters) : ev.anchors?.[gender];
  if (!anchor) return 0;

  let diff: number;
  let spread: number;
  if (ev.cat === "track") {
    diff = anchor.base - value; // бег: меньше время — лучше
    spread = anchor.base - anchor.elite;
  } else {
    diff = value - anchor.base; // прыжки/метания/сила/стрельба: больше — лучше
    spread = anchor.elite - anchor.base;
  }

  if (diff <= 0) {
    // Результат хуже (или равен) базового уровня — линейно от BASE_POINTS
    // (на границе норматива) до MIN_POINTS на границе ещё одного такого
    // же размаха хуже.
    const over = -diff;
    const ratio = Math.min(1, over / spread);
    return Math.max(MIN_POINTS, Math.round(BASE_POINTS - (BASE_POINTS - MIN_POINTS) * ratio));
  }

  // Результат лучше базового — прямая линия от BASE_POINTS до ELITE_POINTS.
  const pts = BASE_POINTS + ((ELITE_POINTS - BASE_POINTS) * diff) / spread;
  return Math.max(MIN_POINTS, Math.round(pts));
}

export function formulaNote(
  ev: EventConfig,
  gender: Gender,
  value: number,
  pts: number,
  distanceMeters?: number
): string {
  const anchor = ev.customDistance ? distanceAnchor(ev, gender, distanceMeters) : ev.anchors?.[gender];
  if (!anchor) return "";
  const dir = ev.cat === "track" ? `${anchor.base.toFixed(1)} − результат` : `результат − ${anchor.base.toFixed(1)}`;
  const unit =
    ev.cat === "track" ? "с" : ev.cat === "strength" ? "раз" : ev.cat === "shooting" ? "очк." : "м";
  const distNote = ev.customDistance
    ? ` Дистанция соревнования: ${distanceMeters ?? FALLBACK_DISTANCE[ev.key] ?? "?"} м.`
    : "";
  const belowBaseNote = ` Результаты хуже базового норматива не сливаются в одну оценку — очки линейно снижаются от ${BASE_POINTS} (на границе базового норматива) до ${MIN_POINTS} (на границе ещё одного такого же размаха хуже).`;
  return `Оценка (линейная шкала): P ≈ ${BASE_POINTS} + (${ELITE_POINTS} − ${BASE_POINTS}) × (${dir}) / размах ≈ ${pts} (минимум ${MIN_POINTS} балл).${belowBaseNote} Опора: элитный ${anchor.elite.toFixed(1)}${unit} → ${ELITE_POINTS}, базовый ${anchor.base.toFixed(1)}${unit} → ${BASE_POINTS}.${distNote}`;
}
