import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseTimeOfDay } from "../periods";
import type { DayProgressConfig } from "../types";
import { configForm, fieldRow, saveButton } from "./config-fields";

export const DayProgressConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<DayProgressConfig>) => {
  const { t } = useTranslation();
  const [countOnlyPart, setCountOnlyPart] = useState(currentConfig?.countOnlyPart ?? false);
  const [start, setStart] = useState(currentConfig?.start ?? "07:00");
  const [end, setEnd] = useState(currentConfig?.end ?? "23:00");
  const valid = !countOnlyPart || (parseTimeOfDay(start) !== null && parseTimeOfDay(end) !== null);

  return (
    <div className={configForm}>
      <Checkbox checked={countOnlyPart} onChange={setCountOnlyPart}>
        {t("motivation-plugin.countOnlyPartOfDay")}
      </Checkbox>
      {countOnlyPart && (
        <div className={fieldRow}>
          <Field label={t("motivation-plugin.from")}>
            <Input type="time" value={start} onValueChange={setStart} />
          </Field>
          <Field label={t("motivation-plugin.to")}>
            <Input type="time" value={end} onValueChange={setEnd} />
          </Field>
        </div>
      )}
      <Button className={saveButton} disabled={!valid} onClick={() => saveConfiguration({ countOnlyPart, start, end })}>
        {t("save")}
      </Button>
    </div>
  );
};
