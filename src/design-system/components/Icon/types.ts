import type { m } from "motion/react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import type { JsxStyleProps } from "styled-system/types";

// Predefined icon sizes. `size` sets the icon's *height*; width is left automatic so non-square
// icons keep their aspect ratio. Explicit `width`/`height` still win over `size`.
export const ICON_SIZES = {
  xs: "0.875rem",
  sm: "1rem",
  md: "1.25rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// Panda style props the icon exposes (color, mx, opacity, fill, …). `width`/`height` are kept as the
// numeric SVG sizing props (below), and `transition` stays framer-motion's (not Panda's) — so they're
// excluded here, partitioning the keys to avoid type clashes between Panda and the SVG/motion props.
type IconStyleProps = Omit<JsxStyleProps, "width" | "height" | "transition">;
// Framer/SVG passthrough (animate, initial, transition, onClick, …), minus anything Panda owns and the
// explicitly-typed sizing props.
type IconMotionProps = Omit<ComponentPropsWithoutRef<typeof m.svg>, keyof IconStyleProps | "width" | "height">;

export type BaseIconProps = {
  width?: number | string;
  height?: number | string;
  size?: IconSize;
  className?: string;
  ref?: Ref<SVGSVGElement>;
} & IconMotionProps;

// What the underlying renderers consume: numeric sizing + framer/SVG passthrough, no Panda style props
// (those are split off in <Icon> and applied as a className) and no `size` (already resolved to height).
export type IconRenderProps = { icon: string; cache?: boolean } & Omit<BaseIconProps, "size">;

// Public <Icon> props: render props + the predefined `size` + Panda style props.
export type IconProps = { icon: string; cache?: boolean } & BaseIconProps & IconStyleProps;

export type SvgIconCacheDescriptor = {
  svgText: string;
  viewbox: string;
  aspectRatio: number;
  nodes: Node[];
  rootAttributes: Record<string, string>;
};
