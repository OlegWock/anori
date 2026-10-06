import type { CalendarAdapter } from "@anori/plugins/calendar/calendar-adapter";
import { addDays, DAY_MS, HOUR_MS, MINUTE_MS } from "@anori/utils/time";
import clamp from "lodash/clamp";

export const AVERAGE_YEAR_MS = 365.2425 * DAY_MS;

export type Progress = {
  fraction: number;
  elapsedMs: number;
  remainingMs: number;
  totalMs: number;
};

export const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const differenceInDays = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export const toLocalDateKey = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseLocalDateKey = (key: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const parseTimeOfDay = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * HOUR_MS + minutes * MINUTE_MS;
};

export const progressBetween = (start: Date, end: Date, now: Date): Progress => {
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.min(totalMs, Math.max(0, now.getTime() - start.getTime()));
  return {
    fraction: totalMs > 0 ? clamp(elapsedMs / totalMs, 0, 1) : 1,
    elapsedMs,
    remainingMs: totalMs - elapsedMs,
    totalMs,
  };
};

const atTimeOfDay = (day: Date, timeMs: number): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, timeMs);

export type DayWindow = { start: string; end: string };

export const dayProgress = (now: Date, window?: DayWindow | null): Progress => {
  const today = startOfDay(now);
  const startMs = window ? parseTimeOfDay(window.start) : null;
  const endMs = window ? parseTimeOfDay(window.end) : null;
  if (startMs === null || endMs === null || startMs === endMs) {
    return progressBetween(today, addDays(today, 1), now);
  }
  const windowStartingOn = (day: Date) => ({
    start: atTimeOfDay(day, startMs),
    end: atTimeOfDay(endMs > startMs ? day : addDays(day, 1), endMs),
  });
  const startDay = now.getTime() < atTimeOfDay(today, startMs).getTime() ? addDays(today, -1) : today;
  const previous = windowStartingOn(startDay);
  if (now.getTime() < previous.end.getTime()) {
    return progressBetween(previous.start, previous.end, now);
  }
  const length = previous.end.getTime() - previous.start.getTime();
  const nextStart = windowStartingOn(addDays(startDay, 1)).start.getTime();
  const justFinished = now.getTime() < (previous.end.getTime() + nextStart) / 2;
  return {
    fraction: justFinished ? 1 : 0,
    elapsedMs: justFinished ? length : 0,
    remainingMs: justFinished ? 0 : length,
    totalMs: length,
  };
};

export const mondayBasedWeekday = (date: Date): number => (date.getDay() + 6) % 7;

export const startOfWeek = (date: Date, firstDay: number): Date => {
  const today = startOfDay(date);
  return addDays(today, -((mondayBasedWeekday(today) - firstDay + 7) % 7));
};

export type WeekProgress = Progress & { dayIndex: number; dayCount: number };

export const fullWeekProgress = (now: Date, firstDay: number): WeekProgress => {
  const start = startOfWeek(now, firstDay);
  const progress = progressBetween(start, addDays(start, 7), now);
  return { ...progress, dayIndex: differenceInDays(start, startOfDay(now)) + 1, dayCount: 7 };
};

export const findPeriodStartDay = (days: ReadonlySet<number>): number => {
  let bestStart = 0;
  let bestGap = -1;
  for (let day = 0; day < 7; day++) {
    if (!days.has(day)) continue;
    let gap = 0;
    while (gap < 7 && !days.has((day - 1 - gap + 7) % 7)) gap++;
    if (gap > bestGap) {
      bestGap = gap;
      bestStart = day;
    }
  }
  return bestStart;
};

export const partialWeekProgress = (now: Date, selectedDays: readonly number[]): WeekProgress => {
  const validDays = selectedDays.filter((d) => d >= 0 && d < 7);
  const days = new Set(validDays);
  if (days.size === 0) return fullWeekProgress(now, 0);
  if (days.size === 7) return fullWeekProgress(now, validDays[0]);
  const periodStart = findPeriodStartDay(days);
  const weekStart = startOfWeek(now, periodStart);
  const today = startOfDay(now);
  const todayPosition = differenceInDays(weekStart, today);
  const dayMs = DAY_MS;
  let elapsedMs = 0;
  let dayIndex = 0;
  let todaySelected = false;
  for (let position = 0; position < 7; position++) {
    const weekday = (periodStart + position) % 7;
    if (!days.has(weekday)) continue;
    if (position < todayPosition) {
      elapsedMs += dayMs;
      dayIndex++;
    } else if (position === todayPosition) {
      const todayLength = addDays(today, 1).getTime() - today.getTime();
      elapsedMs += (dayMs * (now.getTime() - today.getTime())) / todayLength;
      dayIndex++;
      todaySelected = true;
    }
  }
  const totalMs = days.size * dayMs;
  const dayCount = days.size;
  return {
    fraction: clamp(elapsedMs / totalMs, 0, 1),
    elapsedMs,
    remainingMs: totalMs - elapsedMs,
    totalMs,
    dayIndex: todaySelected ? dayIndex : Math.min(dayIndex, dayCount),
    dayCount,
  };
};

export type MonthProgress = Progress & { dayOfMonth: number; daysInMonth: number };

export const monthProgress = (now: Date, calendar: CalendarAdapter): MonthProgress => {
  const today = startOfDay(now);
  const start = calendar.startOfMonth(today);
  const end = calendar.startOfNextMonth(today);
  return {
    ...progressBetween(start, end, now),
    dayOfMonth: differenceInDays(start, today) + 1,
    daysInMonth: differenceInDays(start, end),
  };
};

export type YearProgress = Progress & {
  dayOfYear: number;
  daysInYear: number;
  weekOfYear: number;
  weeksInYear: number;
};

export const yearProgress = (now: Date, calendar: CalendarAdapter): YearProgress => {
  const today = startOfDay(now);
  const start = calendar.startOfYear(today);
  const end = calendar.startOfNextYear(today);
  const dayOfYear = differenceInDays(start, today) + 1;
  const daysInYear = differenceInDays(start, end);
  return {
    ...progressBetween(start, end, now),
    dayOfYear,
    daysInYear,
    weekOfYear: Math.ceil(dayOfYear / 7),
    weeksInYear: Math.ceil(daysInYear / 7),
  };
};

export const ageInYears = (dateOfBirth: Date, now: Date): number =>
  (now.getTime() - dateOfBirth.getTime()) / AVERAGE_YEAR_MS;

export type DayCount = { days: number; hoursLeft: number | null };

export const daysUntil = (target: Date, now: Date): DayCount => {
  const days = differenceInDays(startOfDay(now), startOfDay(target));
  const msUntilTargetStart = startOfDay(target).getTime() - now.getTime();
  const hoursLeft = days === 1 && msUntilTargetStart < DAY_MS ? Math.ceil(msUntilTargetStart / HOUR_MS) : null;
  return { days, hoursLeft };
};

export const weekdayRange = (from: number, to: number): number[] => {
  const days: number[] = [];
  for (let day = from; ; day = (day + 1) % 7) {
    days.push(day);
    if (day === to) break;
  }
  return days;
};

export const weekdayRangeBounds = (days: readonly number[]): { from: number; to: number } => {
  const validDays = days.filter((d) => d >= 0 && d < 7);
  const set = new Set(validDays);
  if (set.size === 0) return { from: 0, to: 6 };
  if (set.size === 7) return { from: validDays[0], to: (validDays[0] + 6) % 7 };
  const from = findPeriodStartDay(set);
  let to = from;
  while (set.has((to + 1) % 7)) to = (to + 1) % 7;
  return { from, to };
};
