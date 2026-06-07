import { useCustomIcon } from "@anori/design-system/components/Icon/custom-icons";
import { SvgIconRenderer } from "@anori/design-system/components/Icon/SvgIconRenderer";
import type { IconRenderProps } from "@anori/design-system/components/Icon/types";
import clsx from "clsx";
import { m } from "framer-motion";
import type { CSSProperties, Ref } from "react";

export const CustomIcon = ({ icon, className, style = {}, cache = true, ref, ...props }: IconRenderProps) => {
  const customIconInfo = useCustomIcon(icon);
  let size = props.width || props.height || 24;
  if (typeof size === "string") size = Number.parseInt(size, 10);

  if (!customIconInfo) {
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        style={{
          background: "var(--text)",
          borderRadius: size / 5,
          opacity: 0.35,
          width: props.width || props.height || 24,
          height: props.height || props.width || 24,
        }}
      />
    );
  }

  if (customIconInfo.isSvg) {
    return (
      <SvgIconRenderer
        icon={`custom:${icon}`}
        src={customIconInfo.objectUrl}
        ref={ref as Ref<SVGSVGElement>}
        cache={cache}
        {...props}
      />
    );
  }

  return (
    <m.img
      className={clsx("CustomIcon", className)}
      ref={ref as Ref<HTMLImageElement>}
      style={{
        borderRadius: size / 5,
        ...(style as CSSProperties),
      }}
      src={customIconInfo.objectUrl}
      width={props.width || props.height || 24}
      height={props.height || props.width || 24}
    />
  );
};
