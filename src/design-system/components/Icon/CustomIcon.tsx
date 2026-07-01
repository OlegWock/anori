import { useCustomIcon } from "@anori/design-system/components/Icon/custom-icons";
import { IconPlaceholder, iconEnter } from "@anori/design-system/components/Icon/IconPlaceholder";
import { SvgIconRenderer } from "@anori/design-system/components/Icon/SvgIconRenderer";
import type { IconRenderProps } from "@anori/design-system/components/Icon/types";
import { m } from "motion/react";
import type { CSSProperties, Ref } from "react";
import { css, cx } from "styled-system/css";

const customImage = css({ borderRadius: "20%" });

export const CustomIcon = ({ icon, className, style = {}, cache = true, ref, ...props }: IconRenderProps) => {
  const customIconInfo = useCustomIcon(icon);
  // Size goes through CSS, not the img width/height attributes: those only accept pixel integers, so a
  // unit value (e.g. the default `size` of "1.25rem") would be read as ~1px. React turns bare numbers
  // into px, and passes unit strings through.
  const width = props.width || props.height || 24;
  const height = props.height || props.width || 24;

  if (!customIconInfo) {
    return <IconPlaceholder shape="image" width={width} height={height} ref={ref as Ref<HTMLDivElement>} />;
  }

  if (customIconInfo.isSvg) {
    return (
      <SvgIconRenderer
        icon={`custom:${icon}`}
        src={customIconInfo.objectUrl}
        ref={ref as Ref<SVGSVGElement>}
        cache={cache}
        {...iconEnter}
        {...props}
      />
    );
  }

  return (
    <m.img
      className={cx(customImage, className)}
      ref={ref as Ref<HTMLImageElement>}
      style={{ width, height, ...(style as CSSProperties) }}
      src={customIconInfo.objectUrl}
      {...iconEnter}
    />
  );
};
