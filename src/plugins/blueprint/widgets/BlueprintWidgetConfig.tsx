import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { Input } from "@anori/components/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlueprintWidgetConfig } from "../types";
import "./BlueprintWidgetConfig.scss";

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
    <div className="BlueprintWidgetConfig">
      <div className="field">
        <label>{t("blueprint-plugin.name")}</label>
        <Input value={title} onValueChange={setTitle} placeholder="Widget title" />
      </div>

      <Checkbox checked={showIcon} onChange={setShowIcon}>
        Show icon
      </Checkbox>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
