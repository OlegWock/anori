import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { m } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";

export type AlertVariant = "accent" | "info" | "success" | "warning" | "danger";

// The feedback variants get an icon (in the text colour — so only the glyph depends on the variant,
// not the colour); `accent` (the neutral default) shows none.
const VARIANT_ICON: Partial<Record<AlertVariant, { icon: string; labelKey: string }>> = {
  info: { icon: builtinIcons.informationCircle, labelKey: "info" },
  success: { icon: builtinIcons.checkSharp, labelKey: "success" },
  warning: { icon: builtinIcons.warning, labelKey: "warning" },
  danger: { icon: builtinIcons.alertCircle, labelKey: "error" },
};

// A neutral surface (edge, no coloured fill/border), laid out as a grid: the icon column on the left
// (only the first row — the icon doesn't stretch down past the title), and title over description on
// the right. With no title the description fills the right column's row; with no icon the left column
// is dropped entirely.
const grid = cva({
  base: {
    display: "grid",
    columnGap: "3",
    rowGap: "1-5",
    alignItems: "start",
    padding: "4",
    borderRadius: "lg",
    // Alerts read as a saturated fill (like the controls they sit among) rather than a near-white box —
    // the `control` family is a few steps darker/greener than `card` in light mode.
    bg: "control",
    boxShadow: "control.edge",
  },
  variants: {
    layout: {
      // The icon spans both rows (top-aligned) so it stays at the top edge without forcing the title
      // row to its height; visually the lower-left stays empty.
      "icon-title": { gridTemplateColumns: "auto 1fr", gridTemplateAreas: '"icon title" "icon desc"' },
      "icon-only": { gridTemplateColumns: "auto 1fr", gridTemplateAreas: '"icon desc"' },
      "title-only": { gridTemplateColumns: "1fr", gridTemplateAreas: '"title" "desc"' },
      plain: { gridTemplateColumns: "1fr", gridTemplateAreas: '"desc"' },
    },
  },
});
const iconCell = css({ gridArea: "icon", lineHeight: 0, opacity: 0.5, marginTop: "2px" });
const titleCell = css({ gridArea: "title", fontWeight: "semibold" });
const descCell = css({ gridArea: "desc" });

export type AlertProps = {
  variant?: AlertVariant;
  // Optional title, shown above the description (and aligned with the icon).
  title?: ReactNode;
  // Override the variant's icon (a name), or `null` to hide it.
  icon?: string | null;
  children?: ReactNode;
} & Omit<ComponentProps<typeof m.div>, "children" | "title">;

export const Alert = ({ className, variant = "accent", title, icon, children, ...props }: AlertProps) => {
  const { t } = useTranslation();
  const cfg = VARIANT_ICON[variant];
  const resolvedIcon = icon === undefined ? cfg?.icon : icon;
  const hasIcon = resolvedIcon != null;
  const hasTitle = title != null;
  const layout = hasIcon ? (hasTitle ? "icon-title" : "icon-only") : hasTitle ? "title-only" : "plain";

  return (
    <m.div className={cx(grid({ layout }), className)} {...props}>
      {hasIcon && (
        <span className={iconCell}>
          <Icon
            icon={resolvedIcon}
            height={24}
            aria-label={cfg ? t(cfg.labelKey) : undefined}
            aria-hidden={cfg ? undefined : true}
          />
        </span>
      )}
      {hasTitle && <div className={titleCell}>{title}</div>}
      <div className={descCell}>{children}</div>
    </m.div>
  );
};
