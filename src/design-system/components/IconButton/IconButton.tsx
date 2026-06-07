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
};

// Square, icon-only button: the text Button with its horizontal padding collapsed to match the
// vertical (1:1). Inherits all Button variants / sizes / states, and shows its label as a delayed
// tooltip (mimicking the native `title`).
const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center" });

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, tooltip, className, ...props },
  ref,
) {
  return (
    <Tooltip label={tooltip ?? label} showDelay={700} targetRef={ref as Ref<HTMLElement>}>
      <Button iconStart={icon} aria-label={label} className={cx(iconButton, className)} {...props} />
    </Tooltip>
  );
});
