import { PickBookmark } from "@anori/components/PickBookmark/PickBookmark";
import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Input } from "@anori/design-system/components/Input/Input";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginWidgetConfig } from "../types";
import { compactField, config, saveConfig, urlImportWrapper } from "./config-styles";

export const MainWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<IframePluginWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ url, title, showLinkToPage });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
  const { t } = useTranslation();

  return (
    <div className={config}>
      <Alert>{t("iframe-plugin.limitations")}</Alert>
      <Field label={`${t("title")} (${t("canBeEmpty")})`}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={`${t("url")}:`}>
        <div className={urlImportWrapper}>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <Popover
            component={PickBookmark}
            additionalData={{
              onSelected: (title, url) => {
                console.log("Selected bookmark", title, url);
                setUrl(url);
              },
            }}
          >
            <Button variant="secondary">{t("import")}</Button>
          </Popover>
        </div>
      </Field>
      <div className={compactField}>
        <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>
          {t("iframe-plugin.showLink")}
        </Checkbox>
      </div>

      <Button className={saveConfig} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
