import "../styles.scss";
import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TaskWidgetConfig } from "../types";

export const TasksWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<TaskWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ title });
  };

  const { t } = useTranslation();
  const [title, setTitle] = useState(currentConfig ? currentConfig.title : t("tasks-plugin.todo"));

  return (
    <div className="TasksWidget-config">
      <div>
        <label>{t("title")}:</label>
        <Input value={title} onValueChange={setTitle} />
      </div>

      <Button className="save-config" onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
