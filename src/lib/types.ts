export type EventCategory = "track" | "jump" | "throw" | "shooting";
export type Gender = "м" | "ж";
/** Возрастная группа — произвольная метка, вводится судьёй вручную при
 *  создании соревнования (например "2012-2013" или "до 10 лет"). */
export type AgeGroup = string;

export type ResultStatus = "DNS" | "DNF" | "DQ" | "NM";

export const STATUS_LABELS: Record<ResultStatus, string> = {
  DNS: "ДНС", // не явился к старту
  DNF: "ДФ", // сошёл с дистанции
  DQ: "ДСК", // дисквалифицирован
  NM: "Х", // все попытки не засчитаны (прыжки/метания)
};

export const STATUS_DESCRIPTIONS: Record<ResultStatus, string> = {
  DNS: "Did Not Start — не явился к старту",
  DNF: "Did Not Finish — сошёл с дистанции",
  DQ: "Disqualified — дисквалифицирован (фальстарт, заступ и т.п.)",
  NM: "No Mark — все 3 попытки не засчитаны",
};

export interface EventAnchor {
  elite: number; // значение результата, которое даёт ~1000 очков
  base: number; // значение результата, которое даёт минимум очков
}

export interface EventConfig {
  key: string;
  name: string;
  cat: EventCategory;
  unitHint: string;
  timeFmt?: "sec" | "mmss";
  anchors?: Partial<Record<Gender, EventAnchor>>;
  exponent?: number;
}

/** Для какой возрастной группы и пола проводится конкретная дисциплина —
 *  задаётся один раз при создании соревнования. */
export interface EventEligibility {
  eventKey: string;
  ageGroups: string[];
  genders: Gender[];
}

/** Спортсмен сохраняется один раз и переиспользуется во всех видах —
 *  не нужно вводить ФИО заново при каждом результате. */
export interface Athlete {
  id: string;
  meetId: string;
  fullName: string;
  teamId: string;
  ageGroup: AgeGroup;
  gender: Gender;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  dirty?: boolean;
}

export interface Entry {
  id: string;
  meetId: string;
  teamId: string;
  eventKey: string;
  ageGroup: AgeGroup;
  gender: Gender;
  athleteId: string;
  /** имя кэшируется на момент внесения результата — протокол и экспорт CSV
   *  не требуют join'а со справочником и работают полностью офлайн */
  athleteName: string;
  bib: string | null;
  /** DNS/DNF/DQ/NM — если задано, resultRaw/resultSeconds пустые, очки = 0 */
  status: ResultStatus | null;
  resultRaw: string;
  resultSeconds: number | null;
  manualPoints: number | null;
  autoPoints: number;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  dirty?: boolean;
}

export interface Team {
  id: string;
  meetId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  dirty?: boolean;
}

export interface Meet {
  id: string;
  ownerId: string;
  name: string;
  date: string | null;
  place: string | null;
  /** возрастные группы, введённые вручную при создании соревнования */
  ageGroups: string[];
  /** для каждой выбранной дисциплины — допустимые возрастные группы и пол */
  eventEligibility: EventEligibility[];
  createdAt: string;
  updatedAt: string;
  dirty?: boolean;
}