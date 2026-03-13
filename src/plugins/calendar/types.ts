import { capitalize } from "@anori/utils/strings";
import moment from "moment-timezone";

export type CalendarWidgetConfigType = {
  // 0 is monday, 6 is sunday
  // This is marked as optional because first version of widget didn't had this
  // settings, thus it's not guaranteed to have this set
  firstDay?: number;
};

export const getWeekdays = (short = false) => {
  const days = short ? moment.weekdaysMin() : moment.weekdays();
  return [...days.slice(1), ...days.slice(0, 1)].map((s) => capitalize(s).replace(".", ""));
};
