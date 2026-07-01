import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { config, saveConfig } from "../styles";
import type { TaskWidgetConfig } from "../types";

export const TasksWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<TaskWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ title });
  };

  const { t } = useTranslation();
  const [title, setTitle] = useState(currentConfig ? currentConfig.title : t("tasks-plugin.todo"));

  return (
    <div className={config}>
      <Field label={`${t("title")}:`}>
        <Input value={title} onValueChange={setTitle} />
      </Field>

      <Button className={saveConfig} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
