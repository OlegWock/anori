import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { anoriSchema } from "@anori/utils/storage";
import { useStorageFile } from "@anori/utils/storage-lib/react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { PicturePluginWidgetConfig } from "../types";

const widget = css({
  display: "flex",
  alignItems: "center",
  textDecoration: "none",
  flexGrow: 1,
  maxHeight: "100%",
  maxWidth: "100%",
});
const image = css({ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", pointerEvents: "none" });

export const PictureWidget = ({ config }: WidgetRenderProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  const isLocal = config.source === "local" && !!config.imageId;
  const { objectUrl } = useStorageFile(anoriSchema.pictureWidgetImages.byId(config.imageId ?? ""));
  const src = isLocal ? objectUrl : config.url;

  return <div className={widget}>{!!src && <img className={image} src={src} alt={t("picture-plugin.name")} />}</div>;
};
