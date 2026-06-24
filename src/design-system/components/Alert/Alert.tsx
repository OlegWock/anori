import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { m } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { css, cva, cx } from "styled-system/css";

export type AlertVariant = "accent" | "info" | "success" | "warning" | "danger";

const VARIANT_ICON: Partial<Record<AlertVariant, { icon: string; labelKey: string }>> = {
  info: { icon: builtinIcons.informationCircle, labelKey: "info" },
  success: { icon: builtinIcons.checkSharp, labelKey: "success" },
  warning: { icon: builtinIcons.warning, labelKey: "warning" },
  danger: { icon: builtinIcons.alertCircle, labelKey: "error" },
};

const grid = cva({
  base: {
    display: "grid",
    columnGap: "3",
    rowGap: "1-5",
    alignItems: "start",
    padding: "4",
    borderRadius: "lg",
    bg: "control",
    boxShadow: "control.edge",
  },
  variants: {
    layout: {
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
  title?: ReactNode;
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
