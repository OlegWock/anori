import type { Mapping } from "@anori/utils/types";
import { Popover as BasePopover } from "@base-ui/react/popover";
import {
  Children,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useId,
  useState,
} from "react";
import { css, cx } from "styled-system/css";

const positioner = css({ zIndex: "tooltip" });

const popover = css({
  width: "max-content",
  maxWidth: "632px",
  padding: "4",
  borderRadius: "sm",
  bg: "surface.elevated",
  color: "text.primary",
  boxShadow: "popover",
  transitionProperty: "opacity, transform",
  transitionDuration: "0.2s",
  transitionTimingFunction: "ease-out",
  "&[data-starting-style], &[data-ending-style]": { opacity: 0 },
  "&[data-side='top'][data-starting-style], &[data-side='top'][data-ending-style]": { transform: "translateY(5px)" },
  "&[data-side='bottom'][data-starting-style], &[data-side='bottom'][data-ending-style]": {
    transform: "translateY(-5px)",
  },
  "&[data-side='left'][data-starting-style], &[data-side='left'][data-ending-style]": { transform: "translateX(5px)" },
  "&[data-side='right'][data-starting-style], &[data-side='right'][data-ending-style]": {
    transform: "translateX(-5px)",
  },
});

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";
type Placement = Side | `${Side}-${"start" | "end"}`;

export type PopoverProps<D = undefined> = {
  component: (data: PopoverRenderProps<D>) => ReactNode;
  trigger?: "click" | "hover";
  placement?: Placement;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onStateChange?: (open: boolean) => void;
  initialFocus?: number | RefObject<HTMLElement | null>;
} & (D extends undefined ? { additionalData?: D } : { additionalData: D });

export type PopoverRenderProps<D = undefined> = {
  close: () => void;
  labelId: string;
  descriptionId: string;
  data: D;
};

export const Popover = <D = undefined>({
  children,
  component: ContentComponent,
  placement = "top",
  additionalData = undefined,
  className,
  style,
  onStateChange,
  trigger = "click",
  initialFocus = 0,
}: PopoverProps<D>) => {
  if (!Children.only(children)) {
    throw new Error("Popover children should be single element");
  }
  const childrenReactElement = children as ReactElement<Mapping>;

  const [open, setOpen] = useState(false);

  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;

  const [sidePart, alignPart] = placement.split("-");
  const side = sidePart as Side;
  const align: Align = alignPart === "start" ? "start" : alignPart === "end" ? "end" : "center";

  const resolvedInitialFocus = typeof initialFocus === "number" ? initialFocus >= 0 : initialFocus;

  return (
    <BasePopover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onStateChange?.(nextOpen);
      }}
    >
      <BasePopover.Trigger render={childrenReactElement} openOnHover={trigger === "hover"} delay={0} closeDelay={0} />
      <BasePopover.Portal>
        <BasePopover.Positioner className={positioner} side={side} align={align} sideOffset={5} collisionPadding={5}>
          <BasePopover.Popup
            className={cx(popover, "Popover", className)}
            style={style}
            initialFocus={resolvedInitialFocus}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
          >
            <ContentComponent
              labelId={labelId}
              descriptionId={descriptionId}
              // @ts-expect-error Additional data typing is kind ad-hoc, couldn't figure out better way to do it
              data={additionalData}
              close={() => setOpen(false)}
            />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
};
