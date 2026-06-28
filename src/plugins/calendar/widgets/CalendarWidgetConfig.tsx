import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Select } from "@anori/design-system/components/Select/Select";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { DEFAULT_CALENDAR, getCalendarLabel, SUPPORTED_CALENDARS } from "../calendar-adapter";
import type { CalendarWidgetConfigType } from "../types";
import { getWeekdays } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const saveConfig = css({ alignSelf: "center", marginTop: "4" });

export const ConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<CalendarWidgetConfigType>) => {
  const { t, i18n } = useTranslation();
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const weekdays = useMemo(getWeekdays, [i18n.language]);

  const [firstDay, setFirstDay] = useState<number>(currentConfig?.firstDay ?? 0);
  const [calendar, setCalendar] = useState<string>(currentConfig?.calendar ?? DEFAULT_CALENDAR);

  return (
    <div className={config}>
      <Field label={`${t("calendar-plugin.firstDayOfWeek")}:`}>
        <Select<number>
          options={[0, 1, 2, 3, 4, 5, 6]}
          value={firstDay}
          onChange={setFirstDay}
          getOptionKey={(o) => o.toString()}
          getOptionLabel={(o) => weekdays[o]}
        />
      </Field>

      <Field label={`${t("calendar-plugin.calendarType")}:`}>
        <Select<string>
          options={[...SUPPORTED_CALENDARS]}
          value={calendar}
          onChange={setCalendar}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => getCalendarLabel(o, i18n.language)}
        />
      </Field>

      <Button className={saveConfig} onClick={() => saveConfiguration({ firstDay, calendar })}>
        {t("save")}
      </Button>
    </div>
  );
};
