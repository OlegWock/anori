import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import type { ReactNode, Ref } from "react";
import { css, cx } from "styled-system/css";
import { Button, type ButtonProps } from "../Button/Button";

export type IconButtonProps = Omit<ButtonProps, "children" | "iconStart" | "iconEnd" | "block" | "aria-label"> & {
  icon: string;
  // Required: an icon-only control has no visible label. Used as the accessible name (aria-label) and
  // the default tooltip text.
  label: string;
  // Override the tooltip content (defaults to `label`) — e.g. a richer/dynamic hint.
  tooltip?: ReactNode;
  // Whether to show the label tooltip. On by default; turn off e.g. while a control is mid-gesture.
  showTooltip?: boolean;
};

// Square, icon-only button: the text Button with its horizontal padding collapsed to match the
// vertical (1:1). Inherits all Button variants / sizes / states, and shows its label as a delayed
// tooltip (mimicking the native `title`).
export const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center" });
// Ghost has no fill/edge framing the icon, so a 1em glyph reads too small — bump it up.
export const ghostIcon = css({ "& svg": { height: "1.375em" } });
// Non-primary icon buttons sit on neutral/transparent surfaces; soften their glyph with the icon token
// (primary keeps its on-accent fill for contrast).
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
