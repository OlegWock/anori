import { buildPalette, type Gamut, type Mode } from "@anori/design-system/color-engine";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { IconButton } from "@anori/design-system/components/IconButton/IconButton";
import { getThemeBackground, type Theme } from "@anori/utils/user-data/theme";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";
import browser from "webextension-polyfill";

const plate = css({
  position: "relative",
  height: "84px",
  "& .theme-plate-actions": { opacity: 0, transition: "opacity 0.15s ease" },
  "&:hover .theme-plate-actions, &:focus-within .theme-plate-actions": { opacity: 1 },
});
const plateButton = cva({
  base: {
    appearance: "none",
    position: "absolute",
    inset: 0,
    padding: 0,
    borderRadius: "lg",
    backgroundColor: "transparent",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundClip: "padding-box",
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
  },
  variants: { active: { true: { borderColor: "accent" } } },
});
const colorCircle = css({
  position: "absolute",
  bottom: "1-5",
  left: "1-5",
  width: "1.5rem",
  height: "1.5rem",
  borderRadius: "full",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "frosted.strong",
});
const plateActions = css({ position: "absolute", top: "1", right: "1", display: "flex", gap: "1" });

export const ThemePlate = ({
  theme,
  active,
  gamut,
  mode,
  onSelect,
  onEdit,
  onDelete,
}: {
  theme: Theme;
  active: boolean;
  gamut: Gamut;
  mode: Mode;
  onSelect: VoidFunction;
  onEdit?: VoidFunction;
  onDelete?: VoidFunction;
}) => {
  const { t } = useTranslation();
  // Show the palette's accent step, not the raw input colour — the input lightness is ignored, so the
  // raw value can look off; this is the swatch the theme actually produces.
  const accentSwatch = useMemo(() => buildPalette(theme.accent, "dark", gamut).scales.accent[7], [theme.accent, gamut]);
  // Custom themes have a single image loaded from storage (mode-independent); built-in previews are derived
  // from the per-mode filename below.
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    if (theme.type !== "custom") return;
    let objectUrl: string | null = null;
    getThemeBackground(theme.name).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setCustomBackgroundUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [theme]);

  // Built-in previews follow the currently-selected mode; custom themes use their single stored image.
  const backgroundUrl =
    theme.type === "builtin"
      ? browser.runtime.getURL(`/assets/images/backgrounds/previews/${theme.background[mode]}`)
      : customBackgroundUrl;

  return (
    <div className={plate}>
      <button
        type="button"
        className={plateButton({ active })}
        style={{ backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined }}
        onClick={onSelect}
      >
        <div className={colorCircle} style={{ backgroundColor: accentSwatch }} />
      </button>

      {(onEdit || onDelete) && (
        <div className={cx(plateActions, "theme-plate-actions")}>
          {onEdit && (
            <IconButton
              variant="secondary"
              size="compact"
              icon={builtinIcons.pencil}
              label={t("edit")}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            />
          )}
          {onDelete && (
            <IconButton
              variant="secondary"
              size="compact"
              icon={builtinIcons.trash}
              label={t("settings.theme.removeTheme")}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
