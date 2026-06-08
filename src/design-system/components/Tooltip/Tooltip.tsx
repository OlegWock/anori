import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import type { Mapping } from "@anori/utils/types";
import {
  autoUpdate,
  FloatingPortal,
  flip,
  offset,
  type Placement,
  type Strategy,
  safePolygon,
  shift,
  useClick,
  useDelayGroup,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { clsx } from "clsx";
import { AnimatePresence, m } from "framer-motion";
import { cloneElement, type ReactElement, type ReactNode, type Ref, useId, useState } from "react";
import { mergeRefs } from "react-merge-refs";
import { cva } from "styled-system/css";

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
  },
  variants: { clickable: { true: { pointerEvents: "auto" } } },
});

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
  ignoreFocus?: boolean;
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
  showDelay = 200,
  resetDelay = 100,
  targetRef,
  hasClickableContent = false,
  ignoreFocus = false,
  enableOnTouch = false,
  disabled = false,
}: Props) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  const {
    x,
    y,
    refs,
    strategy: localStrategy,
    context,
  } = useFloating({
    placement,
    strategy,
    open,
    onOpenChange(open) {
      setOpen(open);

      if (open) {
        setCurrentId(id);
      }
    },
    middleware: [offset(5), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const { delay = showDelay, setCurrentId } = useDelayGroup(context, { id });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: !disabled,
      handleClose: hasClickableContent ? safePolygon() : undefined,
      mouseOnly: true,
      delay:
        typeof delay === "object"
          ? delay
          : {
              open: showDelay,
              close: resetDelay,
            },
    }),
    useClick(context, {
      enabled: IS_TOUCH_DEVICE && enableOnTouch,
      ignoreMouse: true,
      toggle: false,
    }),
    useFocus(context, {
      enabled: !ignoreFocus,
    }),
    useRole(context, { role: "tooltip" }),
    useDismiss(context),
  ]);

  const translate = {
    top: { translateY: 5 },
    bottom: { translateY: -5 },
    left: { translateX: 5 },
    right: { translateX: -5 },
  }[placement.includes("-") ? placement.split("-")[0] : placement];

  const refsToMerge: Ref<Element>[] = [refs.setReference];
  if (targetRef) refsToMerge.push(targetRef);
  const mergedRef = mergeRefs(refsToMerge);
  const content = typeof label === "function" ? label() : label;

  return (
    <>
      {cloneElement(children, getReferenceProps({ ref: mergedRef, ...children.props }))}
      <FloatingPortal root={document.body}>
        <AnimatePresence>
          {open && !disabled && (
            <m.div
              initial={{ opacity: 0, ...translate }}
              animate={{ opacity: 1, translateX: 0, translateY: 0 }}
              exit={{ opacity: 0, ...translate }}
              transition={
                // When in "grouped phase", make the transition faster
                typeof delay === "object" && delay.open === 1
                  ? { duration: 0.1 }
                  : { type: "spring", damping: 20, stiffness: 300 }
              }
              {...getFloatingProps({
                ref: refs.setFloating,
                className: clsx(tooltip({ clickable: hasClickableContent }), "Tooltip"),
                style: {
                  position: localStrategy,
                  maxWidth: maxWidth || undefined,
                  top: y ?? 0,
                  left: x ?? 0,
                },
              })}
            >
              {content}
            </m.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
};
