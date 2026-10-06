import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseLocalDateKey } from "../periods";
import type { LifeProgressConfig } from "../types";
import { configForm, DateOfBirthField, saveButton } from "./config-fields";

export const DEFAULT_LIFESPAN = 80;

export const LifeProgressConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<LifeProgressConfig>) => {
  const { t } = useTranslation();
  const [dateOfBirth, setDateOfBirth] = useState(currentConfig?.dateOfBirth ?? "");
  const [lifespan, setLifespan] = useState(String(currentConfig?.lifespan ?? DEFAULT_LIFESPAN));
  const lifespanNumber = Number.parseInt(lifespan, 10);
  const valid = parseLocalDateKey(dateOfBirth) !== null && lifespanNumber >= 1;

  return (
    <div className={configForm}>
      <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
      <Field label={t("motivation-plugin.expectedLifespan")}>
        <Input type="number" min={1} value={lifespan} onValueChange={setLifespan} />
      </Field>
      <Button
        className={saveButton}
        disabled={!valid}
        onClick={() => saveConfiguration({ dateOfBirth, lifespan: lifespanNumber })}
      >
        {t("save")}
      </Button>
    </div>
  );
};
