import { forwardRef } from "react";
import { css, cx } from "styled-system/css";
import { Button, type ButtonProps } from "../Button/Button";

export type IconButtonProps = Omit<ButtonProps, "children" | "iconStart" | "iconEnd" | "block" | "aria-label"> & {
  icon: string;
  // Required: an icon-only control has no visible label, so it must carry an accessible name.
  "aria-label": string;
};

// Square, icon-only button: the text Button with its horizontal padding collapsed to match the
// vertical (1:1), so it reads as a compact square. Inherits all Button variants / sizes / states.
const iconButton = css({ px: 0, aspectRatio: "1", justifyContent: "center" });

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, className, ...props },
  ref,
) {
  return <Button ref={ref} iconStart={icon} className={cx(iconButton, className)} {...props} />;
});
