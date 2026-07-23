import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { useSizeSettings } from "@anori/utils/compact";
import { useWidgetDragActive } from "@anori/utils/dnd";
import { useDroppable } from "@dnd-kit/react";
import { m } from "motion/react";
import type { ComponentProps } from "react";
import { css, cva, cx } from "styled-system/css";

export type SidebarButtonProps = {
  name: string;
  icon: string;
  active?: boolean;
  withRedDot?: boolean;
  sidebarOrientation: "vertical" | "horizontal";
  dropDestination?: {
    id: string;
  };
} & ComponentProps<typeof m.button>;

const folderButton = cva({
  base: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "2",
    background: "none",
    color: "text.subtle",
    borderRadius: "md",
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.1s ease-in-out",
    _hover: { transform: "scale(1.15)", color: "accent" },
  },
  variants: {
    // While a widget is being dragged this button is a drop target; lift it above the edit-mode scrim so it stays bright.
    dropTarget: {
      true: { borderColor: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)", zIndex: "docked" },
    },
    highlight: { true: { background: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)" } },
  },
});

const activeRing = css({
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  borderRadius: "md",
  boxShadow: "0 0 0 3px var(--ds-accent)",
});

const redDot = css({
  position: "absolute",
  top: "10%",
  right: "10%",
  width: "8px",
  height: "8px",
  background: "notification",
  borderRadius: "xs",
});

export const SidebarButton = ({
  name,
  active,
  icon,
  className,
  withRedDot,
  sidebarOrientation,
  dropDestination,
  ...props
}: SidebarButtonProps) => {
  const currentlyDraggingWidget = useWidgetDragActive();
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: dropDestination?.id ?? `sidebar-button-${name}`,
    type: "folder",
    accept: "widget",
    disabled: !dropDestination,
  });
  const { rem } = useSizeSettings();

  const content = (
    <m.button
      ref={dropRef}
      className={cx(
        "SidebarButton",
        folderButton({ dropTarget: currentlyDraggingWidget && !!dropDestination, highlight: isDropTarget }),
        className,
      )}
      {...props}
    >
      {active && (
        <m.div className={activeRing} layoutId="SidebarButton-glow" transition={{ duration: 0.2, type: "spring" }} />
      )}
      {withRedDot && <m.div className={redDot} />}
      <Icon icon={icon} width={rem(1.5)} height={rem(1.5)} />
    </m.button>
  );

  return (
    <Tooltip label={name} placement={sidebarOrientation === "vertical" ? "right" : "top"}>
      {content}
    </Tooltip>
  );
};
