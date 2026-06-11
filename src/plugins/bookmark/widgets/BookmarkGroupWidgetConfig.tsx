import { listItemAnimation } from "@anori/components/animations";
import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { IconPicker } from "@anori/components/IconPicker/IconPicker";
import { PickBookmark } from "@anori/components/PickBookmark/PickBookmark";
import { Button } from "@anori/design-system/components/Button/Button";
import { Field } from "@anori/design-system/components/Field/Field";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Input } from "@anori/design-system/components/Input/Input";
import { Popover } from "@anori/design-system/components/Popover/Popover";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { guid } from "@anori/utils/misc";
import { usePermissionsQuery } from "@anori/utils/permissions";
import type { WidgetConfigScreenProps } from "@anori/utils/plugins/define";
import { AnimatePresence, m } from "motion/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BookmarkGroupWidgetConfig } from "../types";
import {
  addButtonWrapper,
  compactField,
  config,
  iconPickerTrigger,
  mainColumn,
  row,
  saveConfig,
  urlImportWrapper,
  urls as urlsClass,
} from "./config-styles";

export const BookmarGroupkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigScreenProps<BookmarkGroupWidgetConfig>) => {
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
    <m.div className={config}>
      <div className={row}>
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
        <div className={mainColumn}>
          <Field label={`${t("title")}:`}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={`${t("bookmark-plugin.pages")}:`}>
            <div className={urlsClass}>
              <AnimatePresence initial={false}>
                {urls.map(({ id, url }, ind) => {
                  return (
                    <m.div className={urlImportWrapper} layout key={id} {...listItemAnimation}>
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
                        <Button variant="secondary">{t("import")}</Button>
                      </Popover>
                      <Button variant="secondary" onClick={() => setUrls((p) => p.filter((_u, i) => i !== ind))}>
                        <Icon icon={builtinIcons.close} height={22} />
                      </Button>
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <m.div layout className={addButtonWrapper}>
              <Button variant="secondary" onClick={() => setUrls((p) => [...p, { id: guid(), url: "" }])}>
                {t("bookmark-plugin.addPage")}
              </Button>
            </m.div>
          </Field>
        </div>
      </div>
      {X_BROWSER === "chrome" && (
        <m.div className={compactField} layout="position">
          <CheckboxWithPermission permissions={["tabGroups"]} checked={openInTabGroup} onChange={setOpenInTabGroup}>
            {t("bookmark-plugin.openInGroup")}
          </CheckboxWithPermission>
        </m.div>
      )}

      <m.div layout className={saveConfig}>
        <Button onClick={onConfirm}>{t("save")}</Button>
      </m.div>
    </m.div>
  );
};
