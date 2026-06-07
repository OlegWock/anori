import { Button } from "@anori/components/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { usePrevious } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useDirection } from "@radix-ui/react-direction";
import clsx from "clsx";
import { AnimatePresence, m } from "framer-motion";
import moment from "moment-timezone";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_CALENDAR, makeCalendarAdapter } from "../calendar-adapter";
import type { CalendarWidgetConfigType } from "../types";
import { getWeekdays } from "../types";
import "./CalendarWidget.scss";

export const MainScreen = ({ config }: WidgetRenderProps<CalendarWidgetConfigType>) => {
  const { i18n } = useTranslation();
  const dir = useDirection();
  const trackInteraction = useWidgetInteractionTracker();
  const [today, setToday] = useState(() => moment());
  const [offsetMonths, setOffsetMonths] = useState(0);
  const prevOffset = usePrevious(offsetMonths, offsetMonths);
  let direction = prevOffset > offsetMonths ? "right" : "left";
  if (dir === "rtl") {
    direction = direction === "right" ? "left" : "right";
  }

  const calendar = useMemo(
    () => makeCalendarAdapter(config.calendar ?? DEFAULT_CALENDAR, i18n.language),
    [config.calendar, i18n.language],
  );

  const currentMonthStart = useMemo(
    () => calendar.addMonths(today.toDate(), offsetMonths),
    [calendar, today, offsetMonths],
  );

  const firstDayShift = config.firstDay ?? 0;

  const monthName = useMemo(() => {
    const todayDate = today.toDate();
    return calendar.isSameYear(currentMonthStart, todayDate)
      ? calendar.monthName(currentMonthStart)
      : calendar.monthLabel(currentMonthStart);
  }, [calendar, currentMonthStart, today]);

  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  useEffect(() => {
    setToday(moment());
  }, [i18n.language]);

  const variants = {
    exit: (direction: "left" | "right") => {
      return {
        left: {
          translateX: "-100%",
        },
        right: {
          translateX: "100%",
        },
      }[direction];
    },
    enter: (direction: "left" | "right") => {
      return {
        left: {
          translateX: "100%",
        },
        right: {
          translateX: "-100%",
        },
      }[direction];
    },
  };

  const rows: ReactNode[] = useMemo(() => {
    const res: ReactNode[] = [];
    const startOfMonth = moment(currentMonthStart);
    const monthKey = calendar.monthKey(currentMonthStart);
    const startOfFirstWeek = startOfMonth.clone().day((1 + firstDayShift) % 7);
    if (startOfFirstWeek.isAfter(startOfMonth)) {
      startOfFirstWeek.subtract(1, "week");
    }

    const currentDate = startOfFirstWeek.clone();
    for (let week = 0; calendar.isSameMonth(currentDate.toDate(), currentMonthStart) || week === 0; week++) {
      const row: ReactNode[] = [];
      for (let weekday = 0; weekday < 7; weekday++) {
        const cellDate = currentDate.toDate();
        const inCurrentMonth = calendar.isSameMonth(cellDate, currentMonthStart);
        const isToday = currentDate.isSame(today, "day");
        row.push(
          <div
            className={clsx("calendar-cell", { "current-month": inCurrentMonth, today: isToday })}
            key={currentDate.format("YYYY-MM-DD")}
          >
            {calendar.dayLabel(cellDate)}
          </div>,
        );
        currentDate.add(1, "day");
      }
      res.push(
        <m.div className="calendar-row" key={`row-${monthKey}-${week}`}>
          {row}
        </m.div>,
      );
    }

    return res;
  }, [today, calendar, currentMonthStart, firstDayShift]);
  const currentKey = useMemo(() => calendar.monthKey(currentMonthStart), [calendar, currentMonthStart]);

  useEffect(() => {
    const tid = setInterval(() => setToday(moment()), 1000 * 60);
    return () => clearInterval(tid);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
  const headerDays = useMemo(() => {
    const weekdays = getWeekdays();
    const long = [...weekdays.slice(firstDayShift), ...weekdays.slice(0, firstDayShift)];
    const weekdaysShort = getWeekdays(true);
    const short = [...weekdaysShort.slice(firstDayShift), ...weekdaysShort.slice(0, firstDayShift)];
    return long.map((l, i) => [l, short[i]] as const);
  }, [i18n.language, firstDayShift]);

  return (
    <div className="CalendarWidget">
      <h3 className="header">
        <Button
          withoutBorder
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths((p) => p - 1);
          }}
        >
          <Icon icon={dir === "ltr" ? builtinIcons.chevronBack : builtinIcons.chevronForward} />
        </Button>
        <Button
          withoutBorder
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths(0);
          }}
          className="month-name"
        >
          {monthName}
        </Button>
        <Button
          withoutBorder
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths((p) => p + 1);
          }}
        >
          <Icon icon={dir === "ltr" ? builtinIcons.chevronForward : builtinIcons.chevronBack} />
        </Button>
      </h3>
      <m.div className="calendar-grid" dir="ltr">
        <div className="calendar-row weekdays" key="weekdays">
          {headerDays.map(([weekday, weekdayShort]) => {
            return (
              <div className="calendar-cell" key={weekday}>
                {weekdayShort}
              </div>
            );
          })}
        </div>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            className="calendar-days"
            custom={direction}
            transition={{ duration: 0.12 }}
            variants={variants}
            initial={"enter"}
            animate={{ translateX: 0 }}
            exit={"exit"}
            key={currentKey}
          >
            {rows}
          </m.div>
        </AnimatePresence>
      </m.div>
    </div>
  );
};
