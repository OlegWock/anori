import { Button } from "@anori/components/Button";
import type {
  AnoriPlugin,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetRenderProps,
} from "@anori/utils/user-data/types";
import { useState } from "react";
import "./styles.scss";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { Select } from "@anori/components/lazy-components";
import { translate } from "@anori/translations/index";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { dayjs } from "@anori/utils/dayjs";
import { usePrevious } from "@anori/utils/hooks";
import { capitalize } from "@anori/utils/strings";
import { useDirection } from "@radix-ui/react-direction";
import clsx from "clsx";
import { AnimatePresence, m } from "framer-motion";
import { useMemo } from "react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type CalendarWidgetConfigType = {
  // 0 is monday, 6 is sunday
  // This is marked as optional because first version of widget didn't had this
  // settings, thus it's not guaranteed to have this set
  firstDay?: number;
};

const getWeekdays = (short = false) => {
  const days = short ? dayjs.weekdaysMin() : dayjs.weekdays();
  return [...days.slice(1), ...days.slice(0, 1)].map((s) => capitalize(s).replace(".", ""));
};

const ConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigurationScreenProps<CalendarWidgetConfigType>) => {
  const { t, i18n } = useTranslation();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const weekdays = useMemo(getWeekdays, [i18n.language]);

  const [firstDay, setFirstDay] = useState<number>(currentConfig?.firstDay ?? 0);

  return (
    <div className="CalendarWidget-config">
      <div>
        <label>{t("calendar-plugin.firstDayOfWeek")}:</label>
        <Select<number>
          options={[0, 1, 2, 3, 4, 5, 6]}
          value={firstDay}
          onChange={setFirstDay}
          getOptionKey={(o) => o.toString()}
          getOptionLabel={(o) => weekdays[o]}
        />
      </div>

      <Button className="save-config" onClick={() => saveConfiguration({ firstDay })}>
        {t("save")}
      </Button>
    </div>
  );
};

const MainScreen = ({ config }: WidgetRenderProps<CalendarWidgetConfigType>) => {
  const { i18n } = useTranslation();
  const dir = useDirection();
  const trackInteraction = useWidgetInteractionTracker();
  const [today, setToday] = useState(() => dayjs());
  const [offsetMonths, setOffsetMonths] = useState(0);
  const prevOffset = usePrevious(offsetMonths, offsetMonths);
  let direction = prevOffset > offsetMonths ? "right" : "left";
  if (dir === "rtl") {
    direction = direction === "right" ? "left" : "right";
  }
  const currentMonth = useMemo(() => today.clone().add(offsetMonths, "months"), [today, offsetMonths]);

  const firstDayShift = config.firstDay ?? 0;

  const monthName = useMemo(() => capitalize(currentMonth.format("MMMM")), [currentMonth]);

  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  useEffect(() => {
    setToday(dayjs());
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
  const rows: ReactNode[] = useMemo(() => {
    const res: ReactNode[] = [];
    const startOfMonth = today.clone().add(offsetMonths, "months").startOf("month");
    const monthNumber = startOfMonth.month();
    const startOfFirstWeek = startOfMonth.clone().day((1 + firstDayShift) % 7);
    if (startOfFirstWeek.isAfter(startOfMonth)) {
      startOfFirstWeek.subtract(1, "week");
    }

    const currentDate = startOfFirstWeek.clone();
    for (let week = 0; currentDate.isSame(currentMonth, "month") || week === 0; week++) {
      const row: ReactNode[] = [];
      for (let weekday = 0; weekday < 7; weekday++) {
        const inCurrentMonth = currentDate.isSame(currentMonth, "month");
        const isToday = currentDate.isSame(today, "day");
        row.push(
          <div
            className={clsx("calendar-cell", { "current-month": inCurrentMonth, today: isToday })}
            key={`${currentDate.month()}_${currentDate.date()}`}
          >
            {currentDate.date()}
          </div>,
        );
        currentDate.add(1, "day");
      }
      res.push(
        <m.div className="calendar-row" key={`row-${monthNumber}-${week}`}>
          {row}
        </m.div>,
      );
    }

    return res;
  }, [today, offsetMonths, i18n.language, firstDayShift, currentMonth]);
  const currentKey = useMemo(() => `${currentMonth.month()}_${currentMonth.year()}`, [currentMonth]);

  useEffect(() => {
    const tid = setInterval(() => setToday(dayjs()), 1000 * 60);
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

const widgetDescriptor = {
  id: "calendar-m",
  get name() {
    return translate("calendar-plugin.widgetName");
  },
  configurationScreen: ConfigScreen,
  mainScreen: MainScreen,
  mock: () => {
    return <MainScreen instanceId="mock" config={{}} />;
  },
  appearance: {
    resizable: false,
    size: {
      width: 2,
      height: 2,
    },
  },
} as const satisfies WidgetDescriptor;

export const calendarPlugin = {
  id: "calendar-plugin",
  get name() {
    return translate("calendar-plugin.name");
  },
  widgets: [widgetDescriptor],
  configurationScreen: null,
} satisfies AnoriPlugin;
