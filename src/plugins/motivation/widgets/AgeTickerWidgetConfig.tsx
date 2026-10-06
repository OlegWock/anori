import { Button } from "@anori/design-system/components/Button/Button";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { parseLocalDateKey } from "../periods";
import type { AgeTickerConfig } from "../types";
import { configForm, DateOfBirthField, saveButton } from "./config-fields";

export const AgeTickerConfigScreen = ({
  currentConfig,
  saveConfiguration,
}: WidgetConfigScreenProps<AgeTickerConfig>) => {
  const { t } = useTranslation();
  const [dateOfBirth, setDateOfBirth] = useState(currentConfig?.dateOfBirth ?? "");
  const valid = parseLocalDateKey(dateOfBirth) !== null;

  return (
    <div className={configForm}>
      <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
      <Button className={saveButton} disabled={!valid} onClick={() => saveConfiguration({ dateOfBirth })}>
        {t("save")}
      </Button>
    </div>
  );
};
