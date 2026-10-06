import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import { Select } from "@anori/design-system/components/Select/Select";
import { DEFAULT_CALENDAR, type SupportedCalendar } from "@anori/plugins/calendar/calendar-adapter";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FOCUS_CADENCES, type FocusCadence, type FocusConfig } from "../types";
import { CalendarField, configForm, FirstDayField, saveButton } from "./config-fields";

export const FocusConfigScreen = ({ currentConfig, saveConfiguration }: WidgetConfigScreenProps<FocusConfig>) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState(currentConfig?.prompt ?? t("motivation-plugin.defaultPrompt"));
  const [cadence, setCadence] = useState<FocusCadence>(currentConfig?.cadence ?? "daily");
  const [firstDay, setFirstDay] = useState(currentConfig?.firstDay ?? 0);
  const [calendar, setCalendar] = useState<SupportedCalendar>(currentConfig?.calendar ?? DEFAULT_CALENDAR);
  const valid = prompt.trim() !== "";

  return (
    <div className={configForm}>
      <Field label={t("motivation-plugin.focusPrompt")}>
        <Input value={prompt} onValueChange={setPrompt} />
      </Field>
      <Field label={t("motivation-plugin.resetCadence")}>
        <Select<FocusCadence>
          options={[...FOCUS_CADENCES]}
          value={cadence}
          onChange={setCadence}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => t(`motivation-plugin.cadences.${o}`)}
        />
      </Field>
      {cadence === "weekly" && <FirstDayField value={firstDay} onChange={setFirstDay} />}
      {cadence === "monthly" && <CalendarField value={calendar} onChange={setCalendar} />}
      <Button
        className={saveButton}
        disabled={!valid}
        onClick={() => saveConfiguration({ prompt: prompt.trim(), cadence, firstDay, calendar })}
      >
        {t("save")}
      </Button>
    </div>
  );
};
