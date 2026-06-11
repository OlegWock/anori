import type { SvgIconCacheDescriptor } from "@anori/design-system/components/Icon/types";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { iife } from "@anori/utils/misc";
import { combineRefs } from "@anori/utils/react";
import { m } from "framer-motion";
import { type ComponentPropsWithRef, useEffect, useMemo, useRef, useState } from "react";

type SvgIconRenderedProps = {
  icon: string;
  src?: string;
  svgText?: string;
  cache?: boolean;
} & ComponentPropsWithRef<typeof m.svg>;

export const SvgIconRenderer = ({
  icon,
  src,
  svgText: svgTextFromProps,
  cache = true,
  width,
  height,
  style = {},
  ref,
  ...props
}: SvgIconRenderedProps) => {
  // Resolve the parsed icon synchronously when we already have what we need (a cached descriptor, or the
  // svgText handed to us) so there's no extra commit; only a remote `src` (or a cache entry still in
  // flight) needs the async effect below.
  const syncDescriptor = useMemo<SvgIconCacheDescriptor | null>(() => {
    const fromCache = globalSvgIconsCache.get(icon);
    if (cache && fromCache && !(fromCache instanceof Promise)) return fromCache;
    if (svgTextFromProps && !src) {
      const parsed = parseSvgToIconInfo(svgTextFromProps);
      if (parsed) {
        if (cache) globalSvgIconsCache.set(icon, parsed);
        return parsed;
      }
    }
    return null;
  }, [icon, src, svgTextFromProps, cache]);

  const [asyncDescriptor, setAsyncDescriptor] = useState<SvgIconCacheDescriptor | null>(null);
  const descriptor = syncDescriptor ?? asyncDescriptor;
  const aspectRatio = descriptor?.aspectRatio.toString();
  const viewBox = descriptor?.viewbox;

  const iconCacheDescriptorRef = useRef<SvgIconCacheDescriptor | null>(null);
  iconCacheDescriptorRef.current = descriptor;
  const svgElementRef = useRef<SVGSVGElement>(null);

  const patchSvgRef = (root: SVGSVGElement | null) => {
    if (root && iconCacheDescriptorRef.current) {
      if (cache) root.replaceChildren(...iconCacheDescriptorRef.current.nodes.map((n) => n.cloneNode(true)));
      else root.replaceChildren(...iconCacheDescriptorRef.current.nodes);
      for (const [name, value] of Object.entries(iconCacheDescriptorRef.current.rootAttributes)) {
        root.setAttribute(name, value);
      }
      // TODO: for some reason aspectRatio is not applied by Motion when passed as field of `style`
      // so we set it manually. Might get resolved on itself after Motion update
      root.style.aspectRatio = iconCacheDescriptorRef.current.aspectRatio.toString();
    }
  };

  const mergedRef = combineRefs(ref, svgElementRef, patchSvgRef);

  useAsyncLayoutEffect(async () => {
    if (syncDescriptor) {
      // Already resolved during render; the ref callback patches the SVG on mount.
      return;
    }
    let iconInfo: SvgIconCacheDescriptor;
    const fromCache = globalSvgIconsCache.get(icon);
    if (cache && fromCache) {
      iconInfo = await fromCache;
    } else {
      const promise = iife(async () => {
        let svgText: string;
        if (src) {
          const response = await fetch(src);
          svgText = await response.text();
        } else if (svgTextFromProps) {
          svgText = svgTextFromProps;
        } else {
          throw new Error("either src or svgText prop should be set on SvgIconRenderer");
        }
        const cachedIcon = parseSvgToIconInfo(svgText);
        if (!cachedIcon) {
          throw new Error(`Failed to parse SVG for icon ${icon}`);
        }

        return cachedIcon;
      });
      if (cache) globalSvgIconsCache.set(icon, promise);
      iconInfo = await promise;
    }

    iconCacheDescriptorRef.current = iconInfo;
    setAsyncDescriptor(iconInfo);
    if (svgElementRef.current) patchSvgRef(svgElementRef.current);
  }, [icon]);

  const borderRadius =
    iife(() => {
      const rawSize = width || height || 24;
      if (typeof rawSize === "string") {
        return Number.parseInt(rawSize, 10);
      }
      if (typeof rawSize === "number") {
        return rawSize;
      }
      return 24;
    }) / 5;

  useEffect(() => {
    // TODO: for some reason borderRadius is not applied by Motion when passed as field of `style`
    // so we set it manually. Might get resolved on itself after Motion update
    if (svgElementRef.current) {
      svgElementRef.current.style.borderRadius = `${borderRadius.toString()}px`;
    }
  });

  const finalWidth = width || (height ? undefined : "1rem");
  const finalHeight = height || (width ? undefined : "1rem");

  return (
    <m.svg
      {...props}
      style={{
        aspectRatio,
        borderRadius,
        ...style,
      }}
      width={finalWidth}
      height={finalHeight}
      viewBox={viewBox}
      ref={mergedRef}
    />
  );
};

export const globalSvgIconsCache: Map<string, SvgIconCacheDescriptor | Promise<SvgIconCacheDescriptor>> = new Map();

function parseSvgToIconInfo(svgText: string): SvgIconCacheDescriptor | null {
  const div = document.createElement("div");
  div.innerHTML = svgText;

  const svgRoot = Array.from(div.children).find((child) => child instanceof SVGSVGElement);

  if (!svgRoot) {
    return null;
  }

  const viewBox = svgRoot.getAttribute("viewBox") || "0 0 24 24";
  const width = Number.parseInt(svgRoot.getAttribute("width") || "24", 10);
  const height = Number.parseInt(svgRoot.getAttribute("height") || "24", 10);

  // Preserve presentational attributes (fill, stroke, etc.) that children inherit from the <svg> root
  const managedAttributes = new Set(["width", "height", "viewbox", "style", "class", "id", "xmlns"]);
  const rootAttributes: Record<string, string> = {};
  for (const attr of Array.from(svgRoot.attributes)) {
    if (!managedAttributes.has(attr.name.toLowerCase())) {
      rootAttributes[attr.name] = attr.value;
    }
  }

  return {
    svgText,
    viewbox: viewBox,
    aspectRatio: width / height,
    nodes: Array.from(svgRoot.childNodes),
    rootAttributes,
  };
}
