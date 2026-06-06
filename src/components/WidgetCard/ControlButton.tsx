import { Icon } from "@anori/components/icon/Icon";
import { useSizeSettings } from "@anori/utils/compact";
import clsx from "clsx";
import { m } from "framer-motion";
import type { ComponentProps } from "react";
import { floatingControl } from "./floatingControl";

// A floating corner button on a widget card in edit mode (drag / remove / edit). A plain motion
// button styled by `floatingControl` — not the design-system Button (different look, and the drag
// handle needs motion/drag props).
type ControlButtonProps = Omit<ComponentProps<typeof m.button>, "children"> & {
  icon: string;
  position: "remove" | "edit" | "drag";
};

export const ControlButton = ({ icon, position, className, ...props }: ControlButtonProps) => {
  const { rem } = useSizeSettings();
  return (
    <m.button type="button" className={clsx(floatingControl({ position }), "widget-control", className)} {...props}>
      <Icon icon={icon} width={rem(1.25)} height={rem(1.25)} />
    </m.button>
  );
};
