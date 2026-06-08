import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { BlueprintWidgetConfig } from "../types";

const widget = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flexGrow: 1,
  gap: "2",
});
const title = css({ fontWeight: "semibold" });
const instanceId = css({ fontSize: "sm", color: "text.placeholder" });

export const BlueprintWidget = ({ config, instanceId: id }: WidgetRenderProps<BlueprintWidgetConfig>) => {
  const { t } = useTranslation();

  return (
    <div className={widget}>
      <div className={title}>{config.title || t("blueprint-plugin.name")}</div>
      <div className={instanceId}>Instance: {id}</div>
      {config.showIcon && <div>Icon here</div>}
    </div>
  );
};
