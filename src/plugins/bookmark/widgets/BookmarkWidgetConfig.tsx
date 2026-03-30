import { Button } from "@anori/components/Button";
import { Checkbox } from "@anori/components/Checkbox";
import { Hint } from "@anori/components/Hint";
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
import type { BookmarkWidgetConfig } from "../types";
import "./BookmarkWidgetConfig.scss";

export const BookmarkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<BookmarkWidgetConfig>) => {
  const onConfirm = () => {
    if (!title || !url) return;

    saveConfiguration({ title, url, icon, checkStatus, openInNewTab });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [icon, setIcon] = useState(currentConfig?.icon || builtinIcons.dice);
  const [checkStatus, setCheckStatus] = useState(currentConfig?.checkStatus ?? false);
  const [openInNewTab, setOpenInNewTab] = useState(currentConfig?.openInNewTab ?? false);
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  console.log("BookmarkWidgetConfigScreen", { currentConfig });

  return (
    <div className="BookmarkWidget-config">
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
        <label>{t("title")}:</label>
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
                setTitle(title);
                setUrl(url);
              },
            }}
          >
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>
      <div className="field">
        <Checkbox checked={checkStatus} onChange={setCheckStatus}>
          {t("bookmark-plugin.checkStatus")} <Hint content={t("bookmark-plugin.checkStatusHint")} />
        </Checkbox>
      </div>
      <div className="field">
        <Checkbox checked={openInNewTab} onChange={setOpenInNewTab}>
          {t("bookmark-plugin.openInNewTab")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
