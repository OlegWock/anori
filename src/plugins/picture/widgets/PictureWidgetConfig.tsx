import { Button } from "@anori/components/Button";
import { Select } from "@anori/components/lazy-components";
import { Input } from "@anori/design-system/components/Input/Input";
import { showOpenFilePicker } from "@anori/utils/files";
import { guid } from "@anori/utils/misc";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { anoriSchema, getAnoriStorage } from "@anori/utils/storage";
import { useStorageFile } from "@anori/utils/storage-lib/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PicturePluginWidgetConfig } from "../types";
import "./PictureWidgetConfig.scss";

type Source = "url" | "local";

const ACCEPTED_IMAGE_TYPES = ".png,.jpg,.jpeg,.gif,.webp,.svg";

export const PictureConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<PicturePluginWidgetConfig>) => {
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
    <div className="PictureWidget-config">
      <div className="field">
        <label>{t("picture-plugin.imageSource")}:</label>
        <Select<Source>
          options={["url", "local"]}
          value={source}
          onChange={setSource}
          getOptionKey={(o) => o}
          getOptionLabel={(o) => (o === "url" ? t("url") : t("picture-plugin.localFile"))}
        />
      </div>

      {source === "url" ? (
        <div className="field">
          <label>{t("url")}:</label>
          <Input placeholder="https://example.com/image.jpg" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      ) : (
        <div className="field">
          <label>{t("picture-plugin.image")}:</label>
          {!!previewUrl && <img className="image-preview" src={previewUrl} alt={t("picture-plugin.name")} />}
          <Button onClick={selectImage}>
            {hasLocalImage ? t("picture-plugin.changeImage") : t("picture-plugin.selectImage")}
          </Button>
        </div>
      )}

      <Button className="save-config" disabled={source === "local" && !hasLocalImage} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
