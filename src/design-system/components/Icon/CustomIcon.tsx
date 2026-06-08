import { useCustomIcon } from "@anori/design-system/components/Icon/custom-icons";
import { SvgIconRenderer } from "@anori/design-system/components/Icon/SvgIconRenderer";
import type { IconRenderProps } from "@anori/design-system/components/Icon/types";
import clsx from "clsx";
import { m } from "framer-motion";
import type { CSSProperties, Ref } from "react";

export const CustomIcon = ({ icon, className, style = {}, cache = true, ref, ...props }: IconRenderProps) => {
  const customIconInfo = useCustomIcon(icon);
  // Size goes through CSS, not the img width/height attributes: those only accept pixel integers, so a
  // unit value (e.g. the default `size` of "1.25rem") would be read as ~1px. A relative radius then
  // works regardless of the unit. React turns bare numbers into px, and passes unit strings through.
  const width = props.width || props.height || 24;
  const height = props.height || props.width || 24;
  const sizing: CSSProperties = { borderRadius: "20%", width, height };

  if (!customIconInfo) {
    return <div ref={ref as Ref<HTMLDivElement>} style={{ background: "var(--text)", opacity: 0.35, ...sizing }} />;
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
      style={{ ...sizing, ...(style as CSSProperties) }}
      src={customIconInfo.objectUrl}
    />
  );
};
