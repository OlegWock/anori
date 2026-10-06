import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseLocalDateKey } from "../periods";
import type { DayCounterConfig } from "../types";
import { configForm, saveButton } from "./config-fields";

export const DayCounterConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<DayCounterConfig>) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(currentConfig?.title ?? "");
  const [targetDate, setTargetDate] = useState(currentConfig?.targetDate ?? "");
  const valid = title.trim() !== "" && parseLocalDateKey(targetDate) !== null;

  return (
    <div className={configForm}>
      <Field label={t("title")}>
        <Input value={title} onValueChange={setTitle} />
      </Field>
      <Field label={t("motivation-plugin.targetDate")}>
        <Input type="date" value={targetDate} onValueChange={setTargetDate} />
      </Field>
      <Button
        className={saveButton}
        disabled={!valid}
        onClick={() => saveConfiguration({ title: title.trim(), targetDate })}
      >
        {t("save")}
      </Button>
    </div>
  );
};
