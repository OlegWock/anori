import { ShortcutHint } from "@anori/design-system/components/ShortcutHint/ShortcutHint";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

const shortcutsHelp = css({ display: "flex", flexDirection: "column" });
const shortcutRow = css({
  display: "flex",
  gap: "3",
  "&:not(:last-child)": {
    paddingBottom: "3",
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: "frosted.strong",
    marginBottom: "3",
  },
});
const hintWrapper = css({ alignItems: "center", minWidth: "140px", display: "flex", gap: "2" });

export const ShortcutsHelp = () => {
  const { t } = useTranslation();
  return (
    <div className={shortcutsHelp}>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="alt+h" />
        </div>
        <div>{t("shortcuts.showCheatsheet")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="alt+s" />
        </div>
        <div>{t("shortcuts.toggleSettings")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="Esc" />
        </div>
        <div>{t("shortcuts.closeMenuOrModal")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="meta+up" />
          <ShortcutHint shortcut="alt+up" />
        </div>
        <div>{t("shortcuts.switchToFolderAbove")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="meta+down" />
          <ShortcutHint shortcut="alt+down" />
        </div>
        <div>{t("shortcuts.switchToFolderBelow")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="alt+1" />
        </div>
        <div>{t("shortcuts.switchToNFolder")}</div>
      </div>

      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="alt+e" />
        </div>
        <div>{t("shortcuts.editCurrentFolder")}</div>
      </div>
      <div className={shortcutRow}>
        <div className={hintWrapper}>
          <ShortcutHint shortcut="alt+a" />
        </div>
        <div>{t("shortcuts.addNewWidget")}</div>
      </div>
    </div>
  );
};
