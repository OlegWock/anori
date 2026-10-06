import { SUPPORTED_CALENDARS } from "@anori/plugins/calendar/calendar-adapter";
import { z } from "zod";

export const calendarSchema = z.enum(SUPPORTED_CALENDARS);

export const dayProgressConfigSchema = z.object({
  countOnlyPart: z.boolean(),
  start: z.string(),
  end: z.string(),
});
export type DayProgressConfig = z.infer<typeof dayProgressConfigSchema>;

export const weekProgressConfigSchema = z.object({
  countOnlyPart: z.boolean(),
  days: z.array(z.number()),
  firstDay: z.number(),
});
export type WeekProgressConfig = z.infer<typeof weekProgressConfigSchema>;

export const calendarProgressConfigSchema = z.object({
  calendar: calendarSchema,
});
export type CalendarProgressConfig = z.infer<typeof calendarProgressConfigSchema>;

export const lifeProgressConfigSchema = z.object({
  dateOfBirth: z.string(),
  lifespan: z.number(),
});
export type LifeProgressConfig = z.infer<typeof lifeProgressConfigSchema>;

export const ageTickerConfigSchema = z.object({
  dateOfBirth: z.string(),
});
export type AgeTickerConfig = z.infer<typeof ageTickerConfigSchema>;

export const FOCUS_CADENCES = ["daily", "weekly", "monthly", "manual"] as const;
export type FocusCadence = (typeof FOCUS_CADENCES)[number];

export const focusConfigSchema = z.object({
  prompt: z.string(),
  cadence: z.enum(FOCUS_CADENCES),
  firstDay: z.number(),
  calendar: calendarSchema,
});
export type FocusConfig = z.infer<typeof focusConfigSchema>;

export const dayCounterConfigSchema = z.object({
  title: z.string(),
  targetDate: z.string(),
});
export type DayCounterConfig = z.infer<typeof dayCounterConfigSchema>;
