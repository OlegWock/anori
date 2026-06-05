import { Button } from "@anori/components/Button";
import { Select } from "@anori/components/lazy-components";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_CALENDAR, getCalendarLabel, SUPPORTED_CALENDARS } from "../calendar-adapter";
import type { CalendarWidgetConfigType } from "../types";
import { getWeekdays } from "../types";
import "./CalendarWidgetConfig.scss";

export const ConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigurationScreenProps<CalendarWidgetConfigType>) => {
  const { t, i18n } = useTranslation();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const weekdays = useMemo(getWeekdays, [i18n.language]);

  const [firstDay, setFirstDay] = useState<number>(currentConfig?.firstDay ?? 0);
  const [calendar, setCalendar] = useState<string>(currentConfig?.calendar ?? DEFAULT_CALENDAR);

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

      <div>
        <label>{t("calendar-plugin.calendarType")}:</label>
        <Select<string>
          options={[...SUPPORTED_CALENDARS]}
          value={calendar}
          onChange={setCalendar}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => getCalendarLabel(o, i18n.language)}
        />
      </div>

      <Button className="save-config" onClick={() => saveConfiguration({ firstDay, calendar })}>
        {t("save")}
      </Button>
    </div>
  );
};
