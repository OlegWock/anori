import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { BlueprintWidgetConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const saveConfig = css({ alignSelf: "center", marginTop: "4" });

export const BlueprintWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<BlueprintWidgetConfig>) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(currentConfig?.title ?? "");
  const [showIcon, setShowIcon] = useState(currentConfig?.showIcon ?? false);

  const onConfirm = () => {
    saveConfiguration({ title, showIcon });
  };

  return (
    <div className={config}>
      <Field label={t("blueprint-plugin.name")}>
        <Input value={title} onValueChange={setTitle} placeholder="Widget title" />
      </Field>

      <Checkbox checked={showIcon} onChange={setShowIcon}>
        Show icon
      </Checkbox>

      <Button className={saveConfig} onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
