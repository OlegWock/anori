import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import type { ReactNode, Ref } from "react";
import { css, cx } from "styled-system/css";
import { Button, type ButtonProps } from "../Button/Button";

export type IconButtonProps = Omit<ButtonProps, "children" | "iconStart" | "iconEnd" | "block" | "aria-label"> & {
  icon: string;
  label: string;
  tooltip?: ReactNode;
  showTooltip?: boolean;
};

export const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center" });
export const ghostIcon = css({ "& svg": { height: "1.375em" } });
export const iconColor = css({ "& svg": { color: "icon" } });

export const IconButton = ({
  icon,
  label,
  tooltip,
  showTooltip = true,
  variant,
  className,
  ref,
  ...props
}: IconButtonProps) => {
  // Always render the Tooltip wrapper (it adds no DOM node and `disabled` just suppresses opening), so
  // toggling `showTooltip` mid-gesture doesn't remount the button and break its pointer capture.
  return (
    <Tooltip label={tooltip ?? label} showDelay={1400} disabled={!showTooltip} targetRef={ref as Ref<HTMLElement>}>
      <Button
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
