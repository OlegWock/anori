import { m } from "motion/react";
import type { Ref } from "react";
import { cva } from "styled-system/css";

// Fade the resolved icon in. Shared by SvgIcon/CustomIcon for the async paths; built-in icons skip it.
export const iconEnter = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } } as const;

// The placeholder only reveals after this delay: most icons resolve faster (cache/local), so the
// placeholder unmounts before the fade even starts and the grey box never flashes. Until then it just
// reserves the icon's space, transparent.
const PLACEHOLDER_DELAY = 0.15;
const PLACEHOLDER_OPACITY = 0.35;

const placeholder = cva({
  base: { background: "text.primary" },
  variants: { shape: { icon: { borderRadius: "md" }, image: { borderRadius: "20%" } } },
  defaultVariants: { shape: "icon" },
});

type IconPlaceholderProps = {
  width: number | string;
  height: number | string;
  shape?: "icon" | "image";
  ref?: Ref<HTMLDivElement>;
};

export const IconPlaceholder = ({ width, height, shape, ref }: IconPlaceholderProps) => (
  <m.div
    ref={ref}
    className={placeholder({ shape })}
    initial={{ opacity: 0 }}
    animate={{ opacity: PLACEHOLDER_OPACITY }}
    transition={{ delay: PLACEHOLDER_DELAY, duration: 0.15 }}
    style={{ width, height }}
  />
);
