import type { Mapping } from "@anori/utils/types";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode, Ref } from "react";
import { css, cva, cx } from "styled-system/css";

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";
type Placement = Side | `${Side}-start` | `${Side}-end`;
type Strategy = "absolute" | "fixed";

const positioner = css({
  zIndex: "tooltip",
  // Base UI flags the positioner with data-anchor-hidden when the trigger is hidden or detached (e.g. a
  // hover-revealed button that reverts to display:none, or a trigger that unmounts). Hide the tooltip
  // outright in that case — otherwise the positioner reads the now-empty trigger rect and snaps to the
  // top-left corner for the duration of its close animation.
  "&[data-anchor-hidden]": { visibility: "hidden" },
});

const tooltip = cva({
  base: {
    bg: "tooltip",
    color: "on-tooltip",
    borderRadius: "sm",
    paddingBlock: "2",
    paddingInline: "4",
    fontSize: { base: "sm", _compact: "base" },
    maxWidth: "400px",
    zIndex: "tooltip",
    pointerEvents: "none",
    transitionProperty: "opacity, transform",
    transitionDuration: "0.12s",
    transitionTimingFunction: "ease-out",
    "&[data-starting-style], &[data-ending-style]": { opacity: 0 },
    "&[data-side='top'][data-starting-style], &[data-side='top'][data-ending-style]": { transform: "translateY(5px)" },
    "&[data-side='bottom'][data-starting-style], &[data-side='bottom'][data-ending-style]": {
      transform: "translateY(-5px)",
    },
    "&[data-side='left'][data-starting-style], &[data-side='left'][data-ending-style]": {
      transform: "translateX(5px)",
    },
    "&[data-side='right'][data-starting-style], &[data-side='right'][data-ending-style]": {
      transform: "translateX(-5px)",
    },
  },
  variants: { clickable: { true: { pointerEvents: "auto" } } },
});

export const TooltipProvider = BaseTooltip.Provider;

interface Props {
  label: ReactNode | (() => ReactNode);
  showDelay?: number;
  resetDelay?: number;
  placement?: Placement;
  strategy?: Strategy;
  maxWidth?: number;
  children: ReactElement<Mapping>;
  targetRef?: Ref<HTMLElement>;
  hasClickableContent?: boolean;
  enableOnTouch?: boolean;
  // Keep the tooltip wired up (no remount of the child) but never open it. Useful while the child is
  // mid-gesture (dragging/resizing), where a popup would be noise.
  disabled?: boolean;
}

export const Tooltip = ({
  children,
  label,
  placement = "bottom",
  strategy = "absolute",
  maxWidth = 0,
  showDelay,
  resetDelay,
  targetRef,
  hasClickableContent = false,
  disabled = false,
}: Props) => {
  const [sidePart, alignPart] = placement.split("-");
  const side = sidePart as Side;
  const align: Align = alignPart === "start" ? "start" : alignPart === "end" ? "end" : "center";
  const content = typeof label === "function" ? label() : label;

  return (
    <BaseTooltip.Root disabled={disabled} disableHoverablePopup={!hasClickableContent}>
      <BaseTooltip.Trigger
        ref={targetRef as Ref<HTMLButtonElement>}
        delay={showDelay}
        closeDelay={resetDelay}
        render={children}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className={positioner}
          side={side}
          align={align}
          sideOffset={5}
          collisionPadding={8}
          positionMethod={strategy}
        >
          <BaseTooltip.Popup
            className={cx(tooltip({ clickable: hasClickableContent }), "Tooltip")}
            style={maxWidth ? { maxWidth } : undefined}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
};
