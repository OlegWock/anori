import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useTranslation } from "react-i18next";
import type { PicturePluginWidgetConfig } from "../types";
import "./PictureWidget.scss";

export const PictureWidget = ({ config }: WidgetRenderProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  return (
    <div className="PictureWidget">
      <img className="Image" src={config.url} alt={t("picture-plugin.name")} />
    </div>
  );
};
