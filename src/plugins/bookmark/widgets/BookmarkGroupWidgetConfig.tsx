import { Button } from "@anori/components/Button";
import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { IconPicker } from "@anori/components/IconPicker";
import { Input } from "@anori/components/Input";
import { PickBookmark } from "@anori/components/PickBookmark";
import { Popover } from "@anori/components/Popover";
import { listItemAnimation } from "@anori/components/animations";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { guid } from "@anori/utils/misc";
import { usePermissionsQuery } from "@anori/utils/permissions";
import type { WidgetConfigurationScreenProps } from "@anori/utils/plugins/types";
import { AnimatePresence, m } from "framer-motion";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BookmarkGroupWidgetConfig } from "../types";
import "./BookmarkWidgetConfig.scss";

export const BookmarGroupkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<BookmarkGroupWidgetConfig>) => {
  const onConfirm = () => {
    const cleanedUrls = urls.map((u) => u.url).filter((u) => !!u);
    if (!title || urls.length === 0) return;

    saveConfiguration({ title, icon, urls: cleanedUrls, openInTabGroup });
  };

  const hasTabGroupsPermission = usePermissionsQuery({ permissions: ["tabGroups"] });
  const [title, setTitle] = useState(currentConfig?.title ?? "");
  const [urls, setUrls] = useState<{ id: string; url: string }[]>(() => {
    return currentConfig?.urls ? currentConfig.urls.map((url) => ({ id: guid(), url })) : [{ id: guid(), url: "" }];
  });
  const [icon, setIcon] = useState(currentConfig?.icon ?? builtinIcons.dice);
  const [openInTabGroup, setOpenInTabGroup] = useState<boolean>(
    currentConfig?.openInTabGroup ?? (X_BROWSER === "chrome" && hasTabGroupsPermission),
  );
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  return (
    <m.div className="BookmarkWidget-config">
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
        <label>{t("urls")}:</label>
        <div className="urls">
          <AnimatePresence initial={false}>
            {urls.map(({ id, url }, ind) => {
              return (
                <m.div className="url-import-wrapper" layout key={id} {...listItemAnimation}>
                  <Input
                    value={url}
                    onValueChange={(newUrl) =>
                      setUrls((p) => {
                        const copy = [...p];
                        copy[ind].url = newUrl;
                        return copy;
                      })
                    }
                  />
                  <Popover
                    component={PickBookmark}
                    additionalData={{
                      onSelected: (title, url) => {
                        console.log("Selected bookmark", title, url);
                        setUrls((p) => {
                          const copy = [...p];
                          copy[ind].url = url;
                          return copy;
                        });
                      },
                    }}
                  >
                    <Button>{t("import")}</Button>
                  </Popover>
                  <Button onClick={() => setUrls((p) => p.filter((_u, i) => i !== ind))}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <m.div layout className="add-button-wrapper">
        <Button className="add-button" onClick={() => setUrls((p) => [...p, { id: guid(), url: "" }])}>
          {t("add")}
        </Button>
      </m.div>
      {X_BROWSER === "chrome" && (
        <m.div className="field" layout="position">
          <CheckboxWithPermission permissions={["tabGroups"]} checked={openInTabGroup} onChange={setOpenInTabGroup}>
            {t("bookmark-plugin.openInGroup")}
          </CheckboxWithPermission>
        </m.div>
      )}

      <m.div layout className="save-config">
        <Button onClick={onConfirm}>{t("save")}</Button>
      </m.div>
    </m.div>
  );
};
