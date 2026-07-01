import type { m } from "motion/react";
import type { ComponentPropsWithoutRef, Ref } from "react";
import type { JsxStyleProps } from "styled-system/types";

export const ICON_SIZES = {
  xs: "0.875rem",
  sm: "1rem",
  md: "1.25rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

export type IconSize = keyof typeof ICON_SIZES;

type IconStyleProps = Omit<JsxStyleProps, "width" | "height" | "transition">;
type IconMotionProps = Omit<ComponentPropsWithoutRef<typeof m.svg>, keyof IconStyleProps | "width" | "height">;

export type BaseIconProps = {
  width?: number | string;
  height?: number | string;
  size?: IconSize;
  className?: string;
  ref?: Ref<SVGSVGElement>;
} & IconMotionProps;

export type IconRenderProps = { icon: string; cache?: boolean } & Omit<BaseIconProps, "size">;

export type IconProps = { icon: string; cache?: boolean } & BaseIconProps & IconStyleProps;

export type SvgIconCacheDescriptor = {
  svgText: string;
  viewbox: string;
  aspectRatio: number;
  nodes: Node[];
  rootAttributes: Record<string, string>;
};
