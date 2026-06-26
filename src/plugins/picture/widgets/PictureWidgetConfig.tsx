import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import { Select } from "@anori/design-system/components/Select/Select";
import { showOpenFilePicker } from "@anori/utils/files";
import { guid } from "@anori/utils/misc";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { useStorageFile } from "@anori/utils/storage-lib/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { PicturePluginWidgetConfig } from "../types";

const config = css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "stretch" });
const imagePreview = css({
  alignSelf: "flex-start",
  maxWidth: "100%",
  maxHeight: "20rem",
  borderRadius: "md",
  objectFit: "contain",
});
const selectButton = css({ alignSelf: "flex-start", marginTop: "2" });
const saveConfig = css({ alignSelf: "flex-end", marginTop: "4" });

type Source = "url" | "local";

const ACCEPTED_IMAGE_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.svg";

export const PictureConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<PicturePluginWidgetConfig>) => {
  const { t } = useTranslation();
  const [source, setSource] = useState<Source>(currentConfig?.source === "local" ? "local" : "url");
  const [url, setUrl] = useState(currentConfig?.url ?? "https://picsum.photos/800");
  const [imageId] = useState(() => currentConfig?.imageId ?? guid());

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pendingUrl = useMemo(() => (pendingFile ? URL.createObjectURL(pendingFile) : null), [pendingFile]);
  useEffect(() => () => void (pendingUrl && URL.revokeObjectURL(pendingUrl)), [pendingUrl]);

  const savedImage = useStorageFile(anoriSchema.pictureWidgetImages.byId(currentConfig?.imageId ?? ""));
  const previewUrl = pendingUrl ?? savedImage.objectUrl;
  const hasLocalImage = !!pendingFile || !!currentConfig?.imageId;

  const selectImage = async () => {
    const files = await showOpenFilePicker(false, ACCEPTED_IMAGE_TYPES);
    if (files[0]) setPendingFile(files[0]);
  };

  const onConfirm = async () => {
    if (source === "local") {
      if (pendingFile) {
        const storage = await getAnoriStorage();
        await storage.files.set(anoriSchema.pictureWidgetImages.byId(imageId), pendingFile, {
          mimeType: pendingFile.type || undefined,
        });
      }
      saveConfiguration({ source: "local", url, imageId });
    } else {
      saveConfiguration({ source: "url", url });
    }
  };

  return (
    <div className={config}>
      <Field label={`${t("picture-plugin.imageSource")}:`}>
        <Select<Source>
          options={["url", "local"]}
          value={source}
          onChange={setSource}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => (o === "url" ? t("url") : t("picture-plugin.localFile"))}
        />
      </Field>

      {source === "url" ? (
        <Field label={`${t("url")}:`}>
          <Input placeholder="https://example.com/image.jpg" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
      ) : (
        <Field label={`${t("picture-plugin.image")}:`}>
          {!!previewUrl && <img className={imagePreview} src={previewUrl} alt={t("picture-plugin.name")} />}
          <Button variant="secondary" className={selectButton} onClick={selectImage}>
            {hasLocalImage ? t("picture-plugin.changeImage") : t("picture-plugin.selectImage")}
          </Button>
        </Field>
      )}

      <Button className={saveConfig} disabled={source === "local" && !hasLocalImage} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
