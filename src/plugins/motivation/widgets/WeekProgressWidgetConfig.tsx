import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Select } from "@anori/design-system/components/Select/Select";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { weekdayRange, weekdayRangeBounds } from "../periods";
import type { WeekProgressConfig } from "../types";
import { configForm, FirstDayField, fieldRow, saveButton, useWeekdayNames } from "./config-fields";

export const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4];

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const WeekProgressConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<WeekProgressConfig>) => {
  const { t } = useTranslation();
  const weekdays = useWeekdayNames();
  const initialRange = weekdayRangeBounds(currentConfig?.days ?? DEFAULT_WORK_DAYS);
  const [countOnlyPart, setCountOnlyPart] = useState(currentConfig?.countOnlyPart ?? false);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [firstDay, setFirstDay] = useState(currentConfig?.firstDay ?? 0);

  return (
    <div className={configForm}>
      <Checkbox checked={countOnlyPart} onChange={setCountOnlyPart}>
        {t("motivation-plugin.countOnlyPartOfWeek")}
      </Checkbox>
      {countOnlyPart ? (
        <div className={fieldRow}>
          <Field label={t("motivation-plugin.from")}>
            <Select<number>
              options={WEEKDAYS}
              value={from}
              onChange={setFrom}
              getOptionKey={(o) => o.toString()}
              getOptionLabel={(o) => weekdays[o]}
            />
          </Field>
          <Field label={t("motivation-plugin.to")}>
            <Select<number>
              options={WEEKDAYS}
              value={to}
              onChange={setTo}
              getOptionKey={(o) => o.toString()}
              getOptionLabel={(o) => weekdays[o]}
            />
          </Field>
        </div>
      ) : (
        <FirstDayField value={firstDay} onChange={setFirstDay} />
      )}
      <Button
        className={saveButton}
        onClick={() => saveConfiguration({ countOnlyPart, days: weekdayRange(from, to), firstDay })}
      >
        {t("save")}
      </Button>
    </div>
  );
};
