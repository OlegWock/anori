import { Tooltip } from "@anori/components/Tooltip";
import { forwardRef, type ReactNode, type Ref } from "react";
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
const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center" });

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tooltip, showTooltip = true, className, ...props },
  ref,
) {
  // Always render the Tooltip wrapper (it adds no DOM node and `disabled` just suppresses opening), so
  // toggling `showTooltip` mid-gesture doesn't remount the button and break its pointer capture.
  return (
    <Tooltip label={tooltip ?? label} showDelay={700} disabled={!showTooltip} targetRef={ref as Ref<HTMLElement>}>
      <Button iconStart={icon} aria-label={label} className={cx(iconButton, className)} {...props} />
    </Tooltip>
  );
});
