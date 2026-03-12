import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";
import type { BlueprintWidgetConfig } from "../types";
import "./BlueprintWidget.scss";

export const BlueprintWidget = ({ config, instanceId }: WidgetRenderProps<BlueprintWidgetConfig>) => {
  const { t } = useTranslation();

  return (
    <div className="BlueprintWidget">
      <div className="title">{config.title || t("blueprint-plugin.name")}</div>
      <div className="instance-id">Instance: {instanceId}</div>
      {config.showIcon && <div className="icon-placeholder">Icon here</div>}
    </div>
  );
};
