import { getBuiltinIcon } from "@anori/design-system/components/Icon/builtin-icons";
import { ICONIFY_API_BASE } from "@anori/design-system/components/Icon/remote-icons";
import { globalSvgIconsCache, SvgIconRenderer } from "@anori/design-system/components/Icon/SvgIconRenderer";
import type { IconRenderProps } from "@anori/design-system/components/Icon/types";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { m } from "framer-motion";
import { useState } from "react";
import { css } from "styled-system/css";

// Shown while the icon is still loading.
const placeholder = css({ background: "text.primary", borderRadius: "md", opacity: 0.35 });

export const SvgIcon = ({ children, icon, cache = true, ref, ...props }: IconRenderProps) => {
  const [family, iconName] = icon.split(":");
  // Built-in icons resolve synchronously — seed state during render so there's no placeholder flash or
  // extra commit per icon; only remote/custom icons fall through to the async effect below.
  const [svgText, setSvgText] = useState<string | null>(() => getBuiltinIcon(icon) ?? null);
  const [prevIcon, setPrevIcon] = useState<unknown>(icon);

  if (prevIcon !== icon) {
    setPrevIcon(icon);
    setSvgText(getBuiltinIcon(icon) ?? null);
  }

  useAsyncLayoutEffect(async () => {
    if (getBuiltinIcon(icon)) {
      // Resolved synchronously during render.
      return;
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
      className={placeholder}
      style={{
        width: props.width || props.height || 24,
        height: props.height || props.width || 24,
      }}
    />
  );
};
