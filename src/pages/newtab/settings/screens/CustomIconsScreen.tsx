import { Button } from "@anori/design-system/components/Button/Button";
import { Heading } from "@anori/design-system/components/Heading/Heading";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { isValidCustomIconName, useCustomIcons } from "@anori/design-system/components/Icon/custom-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { Input } from "@anori/design-system/components/Input/Input";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { showOpenFilePicker } from "@anori/utils/files";
import { guid } from "@anori/utils/misc";
import { AnimatePresence, LayoutGroup, m } from "motion/react";
import { type ComponentProps, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const screen = css({ display: "flex", flexDirection: "column", gap: "4" });
const header = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" });
const emptyState = css({ color: "text.subtle", textAlign: "center", paddingBlock: "6" });

// One row per icon: a prominent preview, the name, and a delete affordance on the trailing edge.
const list = css({ display: "flex", flexDirection: "column", gap: "2" });
const row = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  paddingBlock: "2",
  paddingInline: "3",
  borderRadius: "md",
  bg: "control",
  boxShadow: "control.edge",
});
const rowIcon = css({ flexShrink: 0 });
const rowName = css({ flex: 1, fontSize: "sm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

// The pending-import drafts sit at the top (right under the header) so they're never hidden below a
// long list of existing icons.
const draftList = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: "4",
  borderRadius: "lg",
  bg: "control",
  boxShadow: "control.edge",
});
const draftRow = css({ display: "flex", alignItems: "center", gap: "4" });
const draftPreview = css({ flexShrink: 0, borderRadius: "md" });
const draftNameWrapper = css({ flexGrow: 1, display: "flex", flexDirection: "column", gap: "2" });
const draftNameError = css({ color: "text.subtle", fontSize: "xs" });
const draftActions = css({ display: "flex", justifyContent: "flex-end", gap: "3" });
// Trim the ghost IconButton's bumped glyph (1.375em) down a touch for the row's delete affordance.
const deleteIcon = css({ "& svg": { height: "1.2em!" } });

type DraftCustomIcon = {
  id: string;
  name: string;
  extension: string;
  content: ArrayBuffer;
  preview: string;
};

export const CustomIconsScreen = (props: ComponentProps<typeof m.div>) => {
  const { t } = useTranslation();
  const { customIcons, addNewCustomIcon, removeCustomIcon } = useCustomIcons();
  const [draftCustomIcons, setDraftCustomIcons] = useState<DraftCustomIcon[]>([]);
  const [recentlySavedNames, setRecentlySavedNames] = useState<string[]>([]);
  const hasDraftIconsWithInvalidName = draftCustomIcons.some((i) => !isValidCustomIconName(i.name));

  // Surface just-saved icons at the top so it's obvious they were added (they re-sort on next load).
  const orderedIcons = useMemo(() => {
    if (recentlySavedNames.length === 0) return customIcons;
    const recentSet = new Set(recentlySavedNames);
    const recent = recentlySavedNames
      .map((name) => customIcons.find((i) => i.name === name))
      .filter((i): i is (typeof customIcons)[number] => i !== undefined);
    return [...recent, ...customIcons.filter((i) => !recentSet.has(i.name))];
  }, [customIcons, recentlySavedNames]);

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

        return { id, content: arrayBuffer, name, extension, preview };
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
    const savedNames = draftCustomIcons.map((d) => d.name);
    await Promise.all(
      draftCustomIcons.map((draftCustomIcon) =>
        addNewCustomIcon(draftCustomIcon.name, draftCustomIcon.extension, draftCustomIcon.content),
      ),
    );
    setRecentlySavedNames((prev) => [...savedNames, ...prev]);
    setDraftCustomIcons([]);
  };

  const discardDraftCustomIcons = () => {
    for (const draft of draftCustomIcons) URL.revokeObjectURL(draft.preview);
    setDraftCustomIcons([]);
  };

  return (
    <m.div {...props} className={screen}>
      <div className={header}>
        <Heading level={2} size={1}>
          {t("settings.customIcons.title")}
        </Heading>
        <Tooltip label={t("settings.customIcons.supportedFormats")} maxWidth={500} placement="top" enableOnTouch>
          <Button iconStart={builtinIcons.add} onClick={importCustomIcons}>
            {t("settings.customIcons.addIcons")}
          </Button>
        </Tooltip>
      </div>

      {draftCustomIcons.length !== 0 && (
        <m.div className={draftList} layout layoutRoot>
          <Heading level={3}>{t("settings.customIcons.newIcons")}</Heading>
          {draftCustomIcons.map((draftCustomIcon) => {
            const validName = isValidCustomIconName(draftCustomIcon.name) || draftCustomIcon.name.length === 0;
            return (
              <m.div
                layout="position"
                layoutId={draftCustomIcon.id}
                className={draftRow}
                key={draftCustomIcon.id}
                initial={{ translateY: "10%", opacity: 0 }}
                animate={{ translateY: "0%", opacity: 1 }}
              >
                <img
                  height={64}
                  width={64}
                  className={draftPreview}
                  src={draftCustomIcon.preview}
                  alt={draftCustomIcon.name}
                />
                <div className={draftNameWrapper}>
                  <Input
                    placeholder={t("settings.customIcons.iconName")}
                    value={draftCustomIcon.name}
                    onValueChange={(name) =>
                      setDraftCustomIcons((p) => p.map((i) => (i.id === draftCustomIcon.id ? { ...i, name } : i)))
                    }
                  />
                  {!validName && (
                    <div className={draftNameError}>{t("settings.customIcons.nameContainsInvalidChars")}</div>
                  )}
                </div>
                <IconButton
                  variant="ghost"
                  className={deleteIcon}
                  icon={builtinIcons.trash}
                  label={t("settings.customIcons.removeIcon")}
                  onClick={() => {
                    setDraftCustomIcons((p) => p.filter((i) => i.id !== draftCustomIcon.id));
                    URL.revokeObjectURL(draftCustomIcon.preview);
                  }}
                />
              </m.div>
            );
          })}
          <div className={draftActions}>
            <Button variant="secondary" onClick={discardDraftCustomIcons}>
              {t("settings.customIcons.discardIcons")}
            </Button>
            <Button disabled={hasDraftIconsWithInvalidName} onClick={saveDraftCustomIcons}>
              {t("settings.customIcons.saveIcons")}
            </Button>
          </div>
        </m.div>
      )}

      {customIcons.length === 0 && draftCustomIcons.length === 0 && (
        <div className={emptyState}>{t("settings.customIcons.noIcons")}</div>
      )}

      {customIcons.length > 0 && (
        <m.div className={list} layout>
          <LayoutGroup>
            <AnimatePresence initial={false} mode="sync">
              {orderedIcons.map((icon) => (
                <m.div
                  key={icon.name}
                  layout
                  layoutId={icon.name}
                  className={row}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Icon className={rowIcon} icon={`custom:${icon.name}`} height={40} width={40} />
                  <div className={rowName}>{icon.name}</div>
                  <IconButton
                    variant="ghost"
                    className={deleteIcon}
                    icon={builtinIcons.trash}
                    label={t("settings.customIcons.removeIcon")}
                    onClick={() => removeCustomIcon(icon.name)}
                  />
                </m.div>
              ))}
            </AnimatePresence>
          </LayoutGroup>
        </m.div>
      )}
    </m.div>
  );
};
