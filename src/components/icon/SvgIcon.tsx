import { SvgIconRenderer, globalSvgIconsCache } from "@anori/components/icon/SvgIconRenderer";
import { getBuiltinIcon } from "@anori/components/icon/builtin-icons";
import { ICONIFY_API_BASE } from "@anori/components/icon/remote-icons";
import type { IconProps } from "@anori/components/icon/types";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { m } from "framer-motion";
import { useState } from "react";

export const SvgIcon = ({ children, icon, cache = true, ref, ...props }: IconProps) => {
  const [prevIcon, setPrevIcon] = useState<unknown>(icon);
  const [family, iconName] = icon.split(":");
  const [svgText, setSvgText] = useState<string | null>(null);

  if (prevIcon !== icon) {
    setPrevIcon(icon);
    setSvgText(null);
  }

  useAsyncLayoutEffect(async () => {
    const builtinIcon = getBuiltinIcon(icon);
    if (builtinIcon) {
      // This is built-in icon, not need to load it
      return setSvgText(builtinIcon);
    }

    if (family === "custom") {
      // Will be handled by <CustomIcon />
      return;
    }

    const fromCache = await globalSvgIconsCache.get(icon);
    if (cache && fromCache) {
      setSvgText(fromCache.svgText);
    } else {
      const svgText = await fetch(`${ICONIFY_API_BASE}/${family}/${iconName}.svg`, {
        // Icons very rarely (if ever) change, so we can use cache aggresively
        cache: "force-cache",
      }).then((r) => r.text());
      setSvgText(svgText);
    }
  }, [icon]);

  if (svgText) {
    return <SvgIconRenderer ref={ref} icon={icon} svgText={svgText} cache={cache} {...props} />;
  }

  return (
    <m.div
      style={{
        background: "var(--text)",
        borderRadius: 8,
        opacity: 0.35,
        width: props.width || props.height || 24,
        height: props.height || props.width || 24,
      }}
    />
  );
};
