import type { SvgIconCacheDescriptor } from "@anori/components/icon/types";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { iife } from "@anori/utils/misc";
import { combineRefs } from "@anori/utils/react";
import { m } from "framer-motion";
import { type ComponentPropsWithRef, useEffect, useRef, useState } from "react";

type SvgIconRenderedProps = {
  icon: string;
  svgText: string;
  cache?: boolean;
} & ComponentPropsWithRef<typeof m.svg>;

export const SvgIconRenderer = ({
  icon,
  svgText,
  cache = true,
  width,
  height,
  style = {},
  ref,
  ...props
}: SvgIconRenderedProps) => {
  const [aspectRatio, setAspectRatio] = useState<string>();
  const [viewBox, setViewBox] = useState<string>();
  const iconCacheDescriptorRef = useRef<SvgIconCacheDescriptor | null>(null);
  const svgElementRef = useRef<SVGSVGElement>(null);

  const patchSvgRef = (root: SVGSVGElement | null) => {
    if (root && iconCacheDescriptorRef.current) {
      if (cache) root.replaceChildren(...iconCacheDescriptorRef.current.nodes.map((n) => n.cloneNode(true)));
      else root.replaceChildren(...iconCacheDescriptorRef.current.nodes);
      // TODO: for some reason aspectRatio is not applied by Motion when passed as field of `style`
      // so we set it manually. Might get resolved on itself after Motion update
      root.style.aspectRatio = iconCacheDescriptorRef.current.aspectRatio.toString();
    }
  };

  const mergedRef = combineRefs(ref, svgElementRef, patchSvgRef);

  useAsyncLayoutEffect(async () => {
    let iconInfo: SvgIconCacheDescriptor;
    const fromCache = globalSvgIconsCache.get(icon);
    if (cache && fromCache) {
      iconInfo = await fromCache;
    } else {
      const promise = iife(async () => {
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
    setAspectRatio(iconInfo.aspectRatio.toString());
    setViewBox(iconInfo.viewbox);
    if (svgElementRef.current) patchSvgRef(svgElementRef.current);
  }, [icon]);

  const borderRadius =
    iife(() => {
      const rawSize = width || height || 24;
      if (typeof rawSize === "string") {
        return Number.parseInt(rawSize);
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
  const width = Number.parseInt(svgRoot.getAttribute("width") || "24");
  const height = Number.parseInt(svgRoot.getAttribute("height") || "24");
  return {
    svgText,
    viewbox: viewBox,
    aspectRatio: width / height,
    nodes: Array.from(svgRoot.childNodes),
  };
}
