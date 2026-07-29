import type { SvgIconCacheDescriptor } from "@anori/design-system/components/Icon/types";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { iife } from "@anori/utils/misc";
import { combineRefs } from "@anori/utils/react";
import { m } from "motion/react";
import { type ComponentPropsWithRef, type Ref, useLayoutEffect, useMemo, useRef, useState } from "react";

export const SVG_ICON_HOST_ATTR = "data-anori-svg-icon";

const SVG_NS = "http://www.w3.org/2000/svg";

const shadowSvgStyle = `
  :host {
    display: inline-block;
    color: inherit;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
    color: inherit;
  }
`;

type MotionSvgProps = ComponentPropsWithRef<typeof m.svg>;
type MotionSpanProps = ComponentPropsWithRef<typeof m.span>;

type SvgIconRenderedProps = {
  icon: string;
  src?: string;
  svgText?: string;
  cache?: boolean;
  width?: number | string;
  height?: number | string;
  style?: MotionSpanProps["style"];
  ref?: Ref<HTMLElement>;
} & Omit<MotionSvgProps, "children" | "ref" | "width" | "height" | "style">;

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

  const iconCacheDescriptorRef = useRef<SvgIconCacheDescriptor | null>(null);
  iconCacheDescriptorRef.current = descriptor;
  const svgHostRef = useRef<HTMLSpanElement>(null);

  const patchSvgHostRef = (host: HTMLSpanElement | null) => {
    if (host && iconCacheDescriptorRef.current) {
      const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      renderSvgIntoShadowRoot(shadowRoot, iconCacheDescriptorRef.current, cache);
      // TODO: for some reason aspectRatio is not applied by Motion when passed as field of `style`
      // so we set it manually. Might get resolved on itself after Motion update
      host.style.aspectRatio = iconCacheDescriptorRef.current.aspectRatio.toString();
    }
  };

  const mergedRef = combineRefs<HTMLSpanElement>(ref as Ref<HTMLSpanElement>, svgHostRef, patchSvgHostRef);

  // The callback ref only patches the shadow tree when it (re)attaches — i.e. on mount. When the same
  // host instance is reused for a different icon (e.g. a bookmark icon swapped for the loading spinner),
  // the reactive attributes update but the imperatively injected shadow contents would stay stale.
  // Re-inject whenever the resolved descriptor changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: patchSvgHostRef is recreated every render and reads the descriptor via a ref
  useLayoutEffect(() => {
    if (svgHostRef.current) patchSvgHostRef(svgHostRef.current);
  }, [descriptor]);

  useAsyncLayoutEffect(async () => {
    if (syncDescriptor) {
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
    if (svgHostRef.current) patchSvgHostRef(svgHostRef.current);
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

  const finalWidth = width || (height ? undefined : "1rem");
  const finalHeight = height || (width ? undefined : "1rem");
  const hasAccessibleName = Boolean(props["aria-label"] || props["aria-labelledby"]);
  const explicitRole = typeof props.role === "string" ? props.role : undefined;
  const hostProps = props as Omit<MotionSpanProps, "children" | "ref" | "width" | "height" | "style">;

  return (
    <m.span
      {...hostProps}
      {...{ [SVG_ICON_HOST_ATTR]: "" }}
      role={explicitRole ?? (hasAccessibleName ? "img" : undefined)}
      style={{
        aspectRatio,
        borderRadius,
        overflow: "hidden",
        width: finalWidth,
        height: finalHeight,
        ...style,
      }}
      ref={mergedRef}
    />
  );
};

export const globalSvgIconsCache: Map<string, SvgIconCacheDescriptor | Promise<SvgIconCacheDescriptor>> = new Map();

function renderSvgIntoShadowRoot(shadowRoot: ShadowRoot, descriptor: SvgIconCacheDescriptor, cache: boolean) {
  const style = document.createElement("style");
  style.textContent = shadowSvgStyle;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", descriptor.viewbox);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const [name, value] of Object.entries(descriptor.rootAttributes)) {
    svg.setAttribute(name, value);
  }

  const nodes = cache ? descriptor.nodes.map((n) => n.cloneNode(true)) : descriptor.nodes;
  svg.replaceChildren(...nodes);
  shadowRoot.replaceChildren(style, svg);
}

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
