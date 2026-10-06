import {
  type CalendarAdapter,
  makeCalendarAdapter,
  type SupportedCalendar,
} from "@anori/plugins/calendar/calendar-adapter";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const useCalendarAdapter = (calendar: SupportedCalendar): CalendarAdapter => {
  const { i18n } = useTranslation();
  return useMemo(() => makeCalendarAdapter(calendar, i18n.language), [calendar, i18n.language]);
};
