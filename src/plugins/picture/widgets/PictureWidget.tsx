import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageFile } from "@anori/utils/storage-lib/react";
import { useTranslation } from "react-i18next";
import type { PicturePluginWidgetConfig } from "../types";
import "./PictureWidget.scss";

export const PictureWidget = ({ config }: WidgetRenderProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  const isLocal = config.source === "local" && !!config.imageId;
  const { objectUrl } = useStorageFile(anoriSchema.pictureWidgetImages.byId(config.imageId ?? ""));
  const src = isLocal ? objectUrl : config.url;

  return (
    <div className="PictureWidget">{!!src && <img className="Image" src={src} alt={t("picture-plugin.name")} />}</div>
  );
};
