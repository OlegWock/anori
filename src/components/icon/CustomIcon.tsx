import { SvgIconRenderer } from "@anori/components/icon/SvgIconRenderer";
import { useCustomIcon } from "@anori/components/icon/custom-icons";
import type { IconProps } from "@anori/components/icon/types";
import clsx from "clsx";
import { m } from "framer-motion";
import type { CSSProperties, Ref } from "react";

export const CustomIcon = ({ icon, className, style = {}, cache = true, ref, ...props }: IconProps) => {
  const customIconInfo = useCustomIcon(icon);
  let size = props.width || props.height || 24;
  if (typeof size === "string") size = Number.parseInt(size);

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

  if (customIconInfo.svgContent !== null) {
    return (
      <SvgIconRenderer
        icon={`custom:${icon}`}
        svgText={customIconInfo.svgContent}
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
      src={customIconInfo.urlObject}
      width={props.width || props.height || 24}
      height={props.height || props.width || 24}
    />
  );
};
