import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Tooltip } from "@anori/design-system/components/Tooltip/Tooltip";
import { useCurrentlyDragging } from "@anori/utils/drag-and-drop";
import clsx from "clsx";
import { m } from "motion/react";
import { type ComponentProps, useState } from "react";
import { css, cva } from "styled-system/css";
import { DropDestination } from "../DropDestination";

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
    // A widget is being dragged and this folder is a valid drop target — outline it faintly.
    dropTarget: { true: { borderColor: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)" } },
    // The dragged widget is hovering over this folder.
    highlight: { true: { background: "color-mix(in srgb, var(--ds-text-primary) 25%, transparent)" } },
  },
});

// Active-folder highlight: an accent outline ring (a spread-only, blur-less box-shadow), not a glow.
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
  background: "hsl(0, 87%, 60%)",
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
  const currentlyDraggingWidget = useCurrentlyDragging({ type: "widget" });
  const [highlightDrop, setHighlightDrop] = useState(false);

  const content = (
    <m.button
      className={clsx(
        "SidebarButton",
        folderButton({ dropTarget: currentlyDraggingWidget && !!dropDestination, highlight: highlightDrop }),
        className,
      )}
      {...props}
    >
      {active && (
        <m.div className={activeRing} layoutId="SidebarButton-glow" transition={{ duration: 0.2, type: "spring" }} />
      )}
      {withRedDot && <m.div className={redDot} />}
      <Icon icon={icon} width={24} height={24} />
    </m.button>
  );

  if (dropDestination) {
    return (
      <Tooltip label={name} placement={sidebarOrientation === "vertical" ? "right" : "top"}>
        <DropDestination
          type="folder"
          id={dropDestination.id}
          filter="widget"
          onDragEnter={() => setHighlightDrop(true)}
          onDragLeave={() => setHighlightDrop(false)}
        >
          {content}
        </DropDestination>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={name} placement={sidebarOrientation === "vertical" ? "right" : "top"}>
      {content}
    </Tooltip>
  );
};
