import { useMemo } from "react";
import "./Icon.scss";
import { CustomIcon } from "@anori/design-system/components/Icon/CustomIcon";
import { SvgIcon } from "@anori/design-system/components/Icon/SvgIcon";
import { ICON_SIZES, type IconProps } from "@anori/design-system/components/Icon/types";
import { css, cx } from "styled-system/css";
import { splitCssProps } from "styled-system/jsx";

export const Icon = ({ icon, cache = true, size = "md", className, width, height, transition, ...rest }: IconProps) => {
  // Split Panda style props (color, mx, opacity, …) from the rest. width/height/transition are pulled
  // out above so Panda doesn't hijack them (sizing stays numeric; transition stays framer-motion's).
  const [cssProps, forwardProps] = splitCssProps(rest);
  const mergedClassName = cx(css(cssProps), className) || undefined;
  // `size` sets the height; width stays automatic so non-square icons keep their aspect ratio. An
  // explicit `height` wins over `size`; an explicit `width` alone also suppresses the default height,
  // so the icon keeps its aspect instead of being squished to width × size-height.
  const resolvedHeight = height ?? (width === undefined && size ? ICON_SIZES[size] : undefined);

  const [family, iconName] = useMemo(() => icon.split(":"), [icon]);

  const shared = { ...forwardProps, cache, width, height: resolvedHeight, transition, className: mergedClassName };

  if (family === "custom") {
    return <CustomIcon {...shared} icon={iconName} />;
  }

  return <SvgIcon {...shared} icon={icon} />;
};
