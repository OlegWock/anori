import { ghostIcon, iconButton, iconColor } from "@anori/design-system/components/IconButton/IconButton";
import { LinkButton, type LinkButtonProps } from "@anori/design-system/components/LinkButton/LinkButton";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import type { ReactNode, Ref } from "react";
import { cx } from "styled-system/css";

export type LinkIconButtonProps = Omit<
  LinkButtonProps,
  "children" | "iconStart" | "iconEnd" | "block" | "aria-label"
> & {
  icon: string;
  // Required: an icon-only control has no visible label. Used as the accessible name and tooltip text.
  label: string;
  tooltip?: ReactNode;
  showTooltip?: boolean;
};

// Square, icon-only navigation control: the LinkIconButton is to LinkButton what IconButton is to
// Button — same square sizing, glyph treatment and delayed label tooltip, but it's a real <a>.
export const LinkIconButton = ({
  icon,
  label,
  tooltip,
  showTooltip = true,
  variant,
  className,
  ref,
  ...props
}: LinkIconButtonProps) => {
  return (
    <Tooltip label={tooltip ?? label} showDelay={1400} disabled={!showTooltip} targetRef={ref as Ref<HTMLElement>}>
      <LinkButton
        variant={variant}
        iconStart={icon}
        aria-label={label}
        className={cx(
          iconButton,
          variant === "ghost" && ghostIcon,
          variant && variant !== "primary" && iconColor,
          className,
        )}
        {...props}
      />
    </Tooltip>
  );
};
