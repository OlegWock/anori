import "./IframeWidgetConfig.scss";
import { Alert } from "@anori/components/Alert";
import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { IconPicker } from "@anori/components/IconPicker";
import { Input } from "@anori/components/Input";
import { PickBookmark } from "@anori/components/PickBookmark";
import { Popover } from "@anori/components/Popover";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginExpandableWidgetConfig } from "../types";

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
    <div className="IframeWidget-config">
      <Alert>{t("iframe-plugin.limitations")}</Alert>

      <div className="field">
        <label>{t("icon")}:</label>
        <Popover
          component={IconPicker}
          initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
          additionalData={{
            onSelected: setIcon,
            inputRef: iconSearchRef,
          }}
        >
          <Button className="icon-picker-trigger">
            <Icon icon={icon} width={rem(3)} />
          </Button>
        </Popover>
      </div>
      <div className="field">
        <label>{t("title")}</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("url")}:</label>
        <div className="url-import-wrapper">
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
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>

      <div className="field">
        <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>
          {t("iframe-plugin.showLink")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};
