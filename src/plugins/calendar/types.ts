import { capitalize } from "@anori/utils/strings";
import moment from "moment-timezone";
import { z } from "zod";
import { DEFAULT_CALENDAR, SUPPORTED_CALENDARS } from "./calendar-adapter";

export const calendarWidgetConfigSchema = z.object({
  // 0 is monday, 6 is sunday. Defaulted (rather than optional) because the first version of the widget
  // didn't have this setting — decoding an old config fills it in, so widgets never see `undefined`.
  firstDay: z.number().default(0),
  // BCP-47 calendar identifier (e.g. "gregory", "islamic-umalqura"). Defaults to Gregorian for configs that
  // predate this field.
  calendar: z.enum(SUPPORTED_CALENDARS).default(DEFAULT_CALENDAR),
});
export type CalendarWidgetConfigType = z.infer<typeof calendarWidgetConfigSchema>;

export const getWeekdays = (short = false) => {
  const days = short ? moment.weekdaysMin() : moment.weekdays();
  return [...days.slice(1), ...days.slice(0, 1)].map((s) => capitalize(s).replace(".", ""));
};
