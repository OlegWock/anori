import { Button } from "@anori/design-system/components/Button/Button";
import { DEFAULT_CALENDAR, type SupportedCalendar } from "@anori/plugins/calendar/calendar-adapter";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarProgressConfig } from "../types";
import { CalendarField, configForm, saveButton } from "./config-fields";

export const CalendarProgressConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<CalendarProgressConfig>) => {
  const { t } = useTranslation();
  const [calendar, setCalendar] = useState<SupportedCalendar>(currentConfig?.calendar ?? DEFAULT_CALENDAR);

  return (
    <div className={configForm}>
      <CalendarField value={calendar} onChange={setCalendar} />
      <Button className={saveButton} onClick={() => saveConfiguration({ calendar })}>
        {t("save")}
      </Button>
    </div>
  );
};
