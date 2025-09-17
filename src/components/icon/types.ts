import type { m } from "framer-motion";
import type { ComponentPropsWithoutRef, Ref } from "react";

export type BaseIconProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
  ref?: Ref<SVGSVGElement>;
} & ComponentPropsWithoutRef<typeof m.svg>;

export type IconProps = {
  icon: string;
  cache?: boolean;
} & BaseIconProps;

export type SvgIconCacheDescriptor = {
  svgText: string;
  viewbox: string;
  aspectRatio: number;
  nodes: Node[];
};
