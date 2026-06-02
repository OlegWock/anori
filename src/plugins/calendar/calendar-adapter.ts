// Generic calendar adapter built on top of `Intl.DateTimeFormat`. A single implementation
// supports every calendar system the runtime knows about — we just parameterize it with a
// BCP-47 calendar identifier (e.g. "gregory", "islamic-umalqura", "persian"). The calendar
// widget routes all month-level operations through this so the rendering code stays identical
// regardless of the calendar in use.

// Curated set of calendars exposed in the widget config. "gregory" is the default and keeps
// existing widgets unchanged.
export const SUPPORTED_CALENDARS = ["gregory", "islamic-umalqura", "persian", "hebrew", "buddhist"] as const;

export type SupportedCalendar = (typeof SUPPORTED_CALENDARS)[number];

export const DEFAULT_CALENDAR: SupportedCalendar = "gregory";

export const isSupportedCalendar = (value: string | undefined): value is SupportedCalendar => {
  return !!value && (SUPPORTED_CALENDARS as readonly string[]).includes(value);
};

/** Localized, human-readable name of a calendar (e.g. "Hijri Calendar (Umm al-Qura)"). */
export const getCalendarLabel = (calendar: string, locale: string): string => {
  try {
    const name = new Intl.DisplayNames([locale], { type: "calendar" }).of(calendar);
    if (name) return name;
  } catch {
    // Intl.DisplayNames or the locale might be unavailable — fall through to the raw id.
  }
  return calendar;
};

export type CalendarAdapter = {
  /** First day of the calendar month that `date` falls into. */
  startOfMonth: (date: Date) => Date;
  /** First day of the calendar month `amount` months away (negative goes back). */
  addMonths: (date: Date, amount: number) => Date;
  /** Whether two dates fall in the same calendar month and year. */
  isSameMonth: (a: Date, b: Date) => boolean;
  /** Whether two dates fall in the same calendar year. */
  isSameYear: (a: Date, b: Date) => boolean;
  /** Day-of-month as a localized string (e.g. "29", or "٢٩" in Arabic). */
  dayLabel: (date: Date) => string;
  /** Month name only (e.g. "Dhuʻl-Hijjah"). */
  monthName: (date: Date) => string;
  /** Month + year label (e.g. "Dhuʻl-Hijjah 1447 AH"). */
  monthLabel: (date: Date) => string;
  /** Stable, unique key for a calendar month — useful as a React key. */
  monthKey: (date: Date) => string;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const makeCalendarAdapter = (calendar: string, locale: string): CalendarAdapter => {
  const partsFormat = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const dayFormat = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, { day: "numeric" });
  const monthFormat = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, { month: "long" });
  const labelFormat = new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, { month: "long", year: "numeric" });

  const read = (date: Date) => {
    const parts = partsFormat.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    return {
      day: Number.parseInt(get("day"), 10),
      year,
      month: `${year}-${get("month").padStart(2, "0")}`,
    };
  };

  const startOfMonth = (date: Date): Date => addDays(date, -(read(date).day - 1));

  // 32 days is greater than the longest possible month (31), so stepping forward from the first
  // of a month always lands inside the next month regardless of its length; snapping back to its
  // start gives the next month. Stepping one day back from the first lands in the previous month.
  const nextMonth = (date: Date): Date => startOfMonth(addDays(startOfMonth(date), 32));
  const prevMonth = (date: Date): Date => startOfMonth(addDays(startOfMonth(date), -1));

  return {
    startOfMonth,
    addMonths: (date, amount) => {
      let result = startOfMonth(date);
      const step = amount >= 0 ? nextMonth : prevMonth;
      for (let i = 0; i < Math.abs(amount); i++) {
        result = step(result);
      }
      return result;
    },
    isSameMonth: (a, b) => read(a).month === read(b).month,
    isSameYear: (a, b) => read(a).year === read(b).year,
    dayLabel: (date) => dayFormat.format(date),
    monthName: (date) => monthFormat.format(date),
    monthLabel: (date) => labelFormat.format(date),
    monthKey: (date) => read(date).month,
  };
};
