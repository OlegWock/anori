import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import { memo } from "react";
import { toLocalDateKey } from "../periods";
import {
  ageTickerConfigSchema,
  calendarProgressConfigSchema,
  dayCounterConfigSchema,
  dayProgressConfigSchema,
  focusConfigSchema,
  lifeProgressConfigSchema,
  weekProgressConfigSchema,
} from "../types";
import { AgeTickerWidget } from "./AgeTickerWidget";
import { AgeTickerConfigScreen } from "./AgeTickerWidgetConfig";
import { CalendarProgressConfigScreen } from "./CalendarProgressConfig";
import { DayCounterWidget } from "./DayCounterWidget";
import { DayCounterConfigScreen } from "./DayCounterWidgetConfig";
import { DayProgressWidget } from "./DayProgressWidget";
import { DayProgressConfigScreen } from "./DayProgressWidgetConfig";
import { FocusWidget } from "./FocusWidget";
import { FocusConfigScreen } from "./FocusWidgetConfig";
import { LifeProgressWidget } from "./LifeProgressWidget";
import { DEFAULT_LIFESPAN, LifeProgressConfigScreen } from "./LifeProgressWidgetConfig";
import { MonthProgressWidget } from "./MonthProgressWidget";
import { WeekProgressWidget } from "./WeekProgressWidget";
import { DEFAULT_WORK_DAYS, WeekProgressConfigScreen } from "./WeekProgressWidgetConfig";
import { YearProgressWidget } from "./YearProgressWidget";

const mockDateOfBirth = (() => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 29, date.getMonth() - 8, date.getDate() - 20);
  return toLocalDateKey(date);
})();

const mockTargetDate = (() => {
  const date = new Date();
  date.setDate(date.getDate() + 47);
  return toLocalDateKey(date);
})();

const DayProgressMock = memo(function DayProgressMock() {
  return <DayProgressWidget instanceId="mock" config={{ countOnlyPart: false, start: "07:00", end: "23:00" }} />;
});
const WeekProgressMock = memo(function WeekProgressMock() {
  return (
    <WeekProgressWidget instanceId="mock" config={{ countOnlyPart: false, days: DEFAULT_WORK_DAYS, firstDay: 0 }} />
  );
});
const MonthProgressMock = memo(function MonthProgressMock() {
  return <MonthProgressWidget instanceId="mock" config={{ calendar: "gregory" }} />;
});
const YearProgressMock = memo(function YearProgressMock() {
  return <YearProgressWidget instanceId="mock" config={{ calendar: "gregory" }} />;
});
const LifeProgressMock = memo(function LifeProgressMock() {
  return <LifeProgressWidget instanceId="mock" config={{ dateOfBirth: mockDateOfBirth, lifespan: DEFAULT_LIFESPAN }} />;
});
const AgeTickerMock = memo(function AgeTickerMock() {
  return <AgeTickerWidget instanceId="mock" config={{ dateOfBirth: mockDateOfBirth }} />;
});
const FocusMock = memo(function FocusMock() {
  return (
    <FocusWidget
      instanceId="mock"
      config={{
        prompt: translate("motivation-plugin.defaultPrompt"),
        cadence: "daily",
        firstDay: 0,
        calendar: "gregory",
      }}
      preview={{ text: translate("motivation-plugin.mockFocusText") }}
    />
  );
});
const DayCounterMock = memo(function DayCounterMock() {
  return (
    <DayCounterWidget
      instanceId="mock"
      config={{ title: translate("motivation-plugin.mockCounterTitle"), targetDate: mockTargetDate }}
    />
  );
});

export const dayProgressDescriptor = defineWidget({
  id: "day-progress",
  get name() {
    return translate("motivation-plugin.dayProgress");
  },
  schema: dayProgressConfigSchema,
  configurationScreen: DayProgressConfigScreen,
  mainScreen: DayProgressWidget,
  mock: DayProgressMock,
  appearance: {
    size: { width: 1, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 4, height: 1 } },
  },
});

export const weekProgressDescriptor = defineWidget({
  id: "week-progress",
  get name() {
    return translate("motivation-plugin.weekProgress");
  },
  schema: weekProgressConfigSchema,
  configurationScreen: WeekProgressConfigScreen,
  mainScreen: WeekProgressWidget,
  mock: WeekProgressMock,
  appearance: {
    size: { width: 1, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 4, height: 1 } },
  },
});

export const monthProgressDescriptor = defineWidget({
  id: "month-progress",
  get name() {
    return translate("motivation-plugin.monthProgress");
  },
  schema: calendarProgressConfigSchema,
  configurationScreen: CalendarProgressConfigScreen,
  mainScreen: MonthProgressWidget,
  mock: MonthProgressMock,
  appearance: {
    size: { width: 1, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 4, height: 1 } },
  },
});

export const yearProgressDescriptor = defineWidget({
  id: "year-progress",
  get name() {
    return translate("motivation-plugin.yearProgress");
  },
  schema: calendarProgressConfigSchema,
  configurationScreen: CalendarProgressConfigScreen,
  mainScreen: YearProgressWidget,
  mock: YearProgressMock,
  appearance: {
    size: { width: 1, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 4, height: 1 } },
  },
});

export const lifeProgressDescriptor = defineWidget({
  id: "life-progress",
  get name() {
    return translate("motivation-plugin.lifeProgress");
  },
  schema: lifeProgressConfigSchema,
  configurationScreen: LifeProgressConfigScreen,
  mainScreen: LifeProgressWidget,
  mock: LifeProgressMock,
  appearance: { size: { width: 1, height: 1 }, resizable: false },
});

export const ageTickerDescriptor = defineWidget({
  id: "age-ticker",
  get name() {
    return translate("motivation-plugin.ageTicker");
  },
  schema: ageTickerConfigSchema,
  configurationScreen: AgeTickerConfigScreen,
  mainScreen: AgeTickerWidget,
  mock: AgeTickerMock,
  appearance: {
    size: { width: 2, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 2, height: 1 } },
  },
});

export const focusDescriptor = defineWidget({
  id: "focus",
  get name() {
    return translate("motivation-plugin.focus");
  },
  schema: focusConfigSchema,
  configurationScreen: FocusConfigScreen,
  mainScreen: FocusWidget,
  mock: FocusMock,
  appearance: {
    size: { width: 2, height: 1 },
    resizable: { min: { width: 2, height: 1 }, max: { width: 5, height: 1 } },
  },
});

export const dayCounterDescriptor = defineWidget({
  id: "day-counter",
  get name() {
    return translate("motivation-plugin.dayCounter");
  },
  schema: dayCounterConfigSchema,
  configurationScreen: DayCounterConfigScreen,
  mainScreen: DayCounterWidget,
  mock: DayCounterMock,
  appearance: {
    size: { width: 2, height: 1 },
    resizable: { min: { width: 1, height: 1 }, max: { width: 4, height: 1 } },
  },
});
