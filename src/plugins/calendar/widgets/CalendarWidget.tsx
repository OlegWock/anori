import { Button } from "@anori/design-system/components/Button/Button";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useOnChangeEffect, usePrevious } from "@anori/utils/hooks";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useDirection } from "@radix-ui/react-direction";
import moment from "moment-timezone";
import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { memo, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import { makeCalendarAdapter } from "../calendar-adapter";
import type { CalendarWidgetConfigType } from "../types";
import { getWeekdays } from "../types";

const calendarWidget = css({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  alignSelf: "stretch",
  alignItems: "stretch",
});
const header = css({
  marginBottom: "1-5",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
});
const calendarGrid = css({ display: "flex", flexDirection: "column", alignItems: "stretch", flexGrow: 1 });
const calendarDays = css({ display: "flex", flexDirection: "column", flexGrow: 1 });
const calendarRow = cva({
  base: { display: "flex", flexGrow: 1 },
  variants: { weekdays: { true: { flexGrow: 0, paddingBlock: "1" } } },
});
const calendarCell = cva({
  base: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1",
    color: "text.placeholder",
    lineHeight: "none",
    textAlign: "center",
  },
  variants: {
    weekday: { true: { color: "text.primary" } },
    currentMonth: { true: { color: "text.primary" } },
    today: { true: { background: "accent", borderRadius: "lg", color: "on-accent" } },
  },
});

export const CalendarWidget = memo(function CalendarWidget({ config }: WidgetRenderProps<CalendarWidgetConfigType>) {
  const { t, i18n } = useTranslation();
  const dir = useDirection();
  const trackInteraction = useWidgetInteractionTracker();
  const [today, setToday] = useState(() => moment());
  const [offsetMonths, setOffsetMonths] = useState(0);
  const prevOffset = usePrevious(offsetMonths, offsetMonths);
  let direction = prevOffset > offsetMonths ? "right" : "left";
  if (dir === "rtl") {
    direction = direction === "right" ? "left" : "right";
  }

  const calendar = useMemo(() => makeCalendarAdapter(config.calendar, i18n.language), [config.calendar, i18n.language]);

  const currentMonthStart = useMemo(
    () => calendar.addMonths(today.toDate(), offsetMonths),
    [calendar, today, offsetMonths],
  );

  const firstDayShift = config.firstDay;

  const monthName = useMemo(() => {
    const todayDate = today.toDate();
    return calendar.isSameYear(currentMonthStart, todayDate)
      ? calendar.monthName(currentMonthStart)
      : calendar.monthLabel(currentMonthStart);
  }, [calendar, currentMonthStart, today]);

  // TODO: probably should refactor this so dependencies are explicit?
  useOnChangeEffect(() => {
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
          <div className={calendarCell({ currentMonth: inCurrentMonth, today: isToday })} key={cellDate.getTime()}>
            {calendar.dayLabel(cellDate)}
          </div>,
        );
        currentDate.add(1, "day");
      }
      res.push(
        <m.div className={calendarRow()} key={`row-${monthKey}-${week}`}>
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
    <div className={calendarWidget}>
      <div className={header}>
        <IconButton
          variant="ghost"
          icon={dir === "ltr" ? builtinIcons.chevronBack : builtinIcons.chevronForward}
          label={t("calendar-plugin.previousMonth")}
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths((p) => p - 1);
          }}
        />
        <Button
          variant="ghost"
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths(0);
          }}
        >
          {monthName}
        </Button>
        <IconButton
          variant="ghost"
          icon={dir === "ltr" ? builtinIcons.chevronForward : builtinIcons.chevronBack}
          label={t("calendar-plugin.nextMonth")}
          onClick={() => {
            trackInteraction("Switch month");
            setOffsetMonths((p) => p + 1);
          }}
        />
      </div>
      <m.div className={calendarGrid} dir="ltr">
        <div className={calendarRow({ weekdays: true })} key="weekdays">
          {headerDays.map(([weekday, weekdayShort]) => {
            return (
              <div className={calendarCell({ weekday: true })} key={weekday}>
                {weekdayShort}
              </div>
            );
          })}
        </div>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <m.div
            className={calendarDays}
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
});
