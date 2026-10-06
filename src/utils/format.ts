import type { TFunction } from "i18next";
import { DAY_MS, HOUR_MS, MINUTE_MS } from "./time";

export const formatPercent = (fraction: number, locale: string, fractionDigits = 0): string =>
  new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);

export const formatDecimal = (value: number, locale: string, fractionDigits: number): string =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

export type DurationPrecision = "minutes" | "hours" | "days";

export const formatDuration = (t: TFunction, ms: number, precision: DurationPrecision): string => {
  if (precision === "minutes") {
    const totalMinutes = Math.round(ms / MINUTE_MS);
    return t("duration.hoursMinutes", {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
    });
  }
  if (precision === "hours") {
    const totalHours = Math.round(ms / HOUR_MS);
    return t("duration.daysHours", { days: Math.floor(totalHours / 24), hours: totalHours % 24 });
  }
  return t("duration.days", { count: Math.round(ms / DAY_MS) });
};
