import { IconPicker } from "@anori/components/IconPicker/IconPicker";
import { PickBookmark } from "@anori/components/PickBookmark/PickBookmark";
import { Alert } from "@anori/design-system/components/Alert/Alert";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginExpandableWidgetConfig } from "../types";
import { compactField, config, iconPickerTrigger, saveConfig, urlImportWrapper } from "./config-styles";

export const ExpandableWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<IframePluginExpandableWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ url, title, icon, showLinkToPage });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [icon, setIcon] = useState(currentConfig?.icon || builtinIcons.compass);
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
  const { t } = useTranslation();
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);

  return (
    <div className={config}>
      <Alert>{t("iframe-plugin.limitations")}</Alert>

      <Field label={`${t("icon")}:`}>
        <Popover
          component={IconPicker}
          initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
          additionalData={{
            onSelected: setIcon,
            inputRef: iconSearchRef,
          }}
        >
          <Button variant="secondary" className={iconPickerTrigger}>
            <Icon icon={icon} width={rem(3)} />
          </Button>
        </Popover>
      </Field>
      <Field label={t("title")}>
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
