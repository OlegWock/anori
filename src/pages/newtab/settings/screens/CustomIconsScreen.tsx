import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import { Tooltip } from "@anori/components/Tooltip";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { isValidCustomIconName, useCustomIcons } from "@anori/components/icon/custom-icons";
import { showOpenFilePicker } from "@anori/utils/files";
import { guid } from "@anori/utils/misc";
import { AnimatePresence, LayoutGroup, m } from "framer-motion";
import { type ComponentProps, useState } from "react";
import { useTranslation } from "react-i18next";
import "./CustomIconsScreen.scss";

type DraftCustomIcon = {
  id: string;
  name: string;
  extension: string;
  content: ArrayBuffer;
  preview: string;
};

export const CustomIconsScreen = (props: ComponentProps<typeof m.div>) => {
  const importCustomIcons = async () => {
    const files = await showOpenFilePicker(true, ".jpg,.jpeg,.png,.svg");
    let hasErrors = false;
    const importedFiles: DraftCustomIcon[] = await Promise.all(
      files.map(async (file) => {
        const id = guid();
        const arrayBuffer = await file.arrayBuffer();
        const preview = URL.createObjectURL(file);
        const tokens = file.name.split(".");
        const extension = tokens[tokens.length - 1];
        const name = tokens.slice(0, tokens.length - 1).join(".");
        if (!name || !extension || !["png", "jpg", "jpeg", "svg"].includes(extension.toLowerCase())) {
          hasErrors = true;
        }

        return {
          id,
          content: arrayBuffer,
          name,
          extension,
          preview,
        };
      }),
    );

    if (hasErrors) {
      // TODO: replace with toast
      alert(t("settings.customIcons.incorrectFormat"));
      return;
    }
    setDraftCustomIcons((p) => [...p, ...importedFiles]);
  };

  const saveDraftCustomIcons = async () => {
    await Promise.all(
      draftCustomIcons.map((draftCustomIcon) =>
        addNewCustomIcon(draftCustomIcon.name, draftCustomIcon.extension, draftCustomIcon.content),
      ),
    );
    setDraftCustomIcons([]);
  };

  const { t } = useTranslation();
  const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
  const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
  const hasDraftIconsWithInvalidName = draftCustomIcons.some((i) => !isValidCustomIconName(i.name));

  return (
    <m.div {...props} className="CustomIconsScreen">
      {customIcons.length === 0 && <div className="no-custom-icons-alert">{t("settings.customIcons.noIcons")}</div>}

      <m.div className="custom-icons-grid" layout>
        <LayoutGroup>
          <AnimatePresence initial={false} mode="sync">
            {customIcons.map((icon) => {
              return (
                <m.div
                  key={icon.name}
                  layout
                  layoutId={icon.name}
                  className="custom-icon-plate"
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Icon icon={`custom:${icon.name}`} height={32} width={32} />
                  <div className="custom-icon-name">{icon.name}</div>
                  <Button onClick={() => removeCustomIcon(icon.name)}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </LayoutGroup>
      </m.div>

      {draftCustomIcons.length !== 0 && (
        <m.div className="draft-icons-list" layout layoutRoot>
          {draftCustomIcons.map((draftCustomIcon) => {
            const validName = isValidCustomIconName(draftCustomIcon.name) || draftCustomIcon.name.length === 0;
            return (
              <m.div
                layout="position"
                layoutId={draftCustomIcon.id}
                className="draft-icon-section"
                key={draftCustomIcon.id}
                initial={{ translateY: "10%", opacity: 0 }}
                animate={{ translateY: "0%", opacity: 1 }}
              >
                <img
                  height={64}
                  width={64}
                  className="draft-icon-preview"
                  src={draftCustomIcon.preview}
                  alt={draftCustomIcon.name}
                />
                <div className="draft-icon-name-wrapper">
                  <Input
                    className="draft-icon-name"
                    placeholder={t("settings.customIcons.iconName")}
                    value={draftCustomIcon.name}
                    onValueChange={(name) =>
                      setDraftCustomIcons((p) => p.map((i) => (i.id === draftCustomIcon.id ? { ...i, name } : i)))
                    }
                  />
                  {!validName && (
                    <div className="draft-icon-name-error">{t("settings.customIcons.nameContainsInvalidChars")}</div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setDraftCustomIcons((p) => p.filter((i) => i.id !== draftCustomIcon.id));
                    URL.revokeObjectURL(draftCustomIcon.preview);
                  }}
                >
                  <Icon icon={builtinIcons.close} height={22} />
                </Button>
              </m.div>
            );
          })}

          {hasDraftIconsWithInvalidName && (
            <Tooltip placement="top" label={t("settings.customIcons.invalidNames")} enableOnTouch>
              <Button visuallyDisabled>{t("settings.customIcons.saveIcons")}</Button>
            </Tooltip>
          )}
          {!hasDraftIconsWithInvalidName && (
            <Button onClick={saveDraftCustomIcons}>{t("settings.customIcons.saveIcons")}</Button>
          )}
        </m.div>
      )}

      {draftCustomIcons.length === 0 && (
        <Tooltip label={t("settings.customIcons.supportedFormats")} maxWidth={500} placement="top" enableOnTouch>
          <Button onClick={importCustomIcons}>{t("settings.customIcons.importIcons")}</Button>
        </Tooltip>
      )}
    </m.div>
  );
};
