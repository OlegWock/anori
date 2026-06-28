import { IconPicker } from "@anori/components/IconPicker/IconPicker";
import { PickBookmark } from "@anori/components/PickBookmark/PickBookmark";
import { Button } from "@anori/design-system/components/Button/Button";
import { Checkbox } from "@anori/design-system/components/Checkbox/Checkbox";
import { Field } from "@anori/design-system/components/Field/Field";
import { Hint } from "@anori/design-system/components/Hint/Hint";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { token } from "styled-system/tokens";
import type { BookmarkWidgetConfig } from "../types";
import {
  compactField,
  config,
  iconPickerTrigger,
  mainColumn,
  row,
  saveConfig,
  urlImportWrapper,
} from "./config-styles";

export const BookmarkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<BookmarkWidgetConfig>) => {
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
    <div className={config}>
      <div className={row}>
        <Field label={`${t("icon")}:`}>
          <Popover
            component={IconPicker}
            initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
            additionalData={{
              onSelected: setIcon,
              inputRef: iconSearchRef,
              iconColor: token("colors.icon.subtle"),
            }}
          >
            <Button variant="secondary" className={iconPickerTrigger}>
              <Icon icon={icon} width={rem(3)} color="icon.subtle" />
            </Button>
          </Popover>
        </Field>
        <div className={mainColumn}>
          <Field label={`${t("title")}:`}>
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
                    setTitle(title);
                    setUrl(url);
                  },
                }}
              >
                <Button variant="secondary">{t("import")}</Button>
              </Popover>
            </div>
          </Field>
        </div>
      </div>
      <div className={compactField}>
        <Checkbox checked={checkStatus} onChange={setCheckStatus}>
          {t("bookmark-plugin.checkStatus")} <Hint content={t("bookmark-plugin.checkStatusHint")} />
        </Checkbox>
      </div>
      <div className={compactField}>
        <Checkbox checked={openInNewTab} onChange={setOpenInNewTab}>
          {t("bookmark-plugin.openInNewTab")}
        </Checkbox>
      </div>

      <Button className={saveConfig} onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};
