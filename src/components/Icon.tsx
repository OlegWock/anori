import { useCustomIcon } from "@anori/utils/custom-icons";
import { useAsyncLayoutEffect } from "@anori/utils/hooks";
import { combineRefs } from "@anori/utils/react";
import {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type Ref,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { forwardRef } from "react";
import browser from "webextension-polyfill";
import "./Icon.scss";
import { ICONIFY_API_BASE } from "@anori/components/icons/api";
import { iife } from "@anori/utils/misc";
import { availablePermissionsAtom } from "@anori/utils/permissions";
import clsx from "clsx";
import { m, motion } from "framer-motion";
import { useAtomValue } from "jotai";

type SvgIconCacheDescriptor = {
  svgText: string;
  viewbox: string;
  aspectRatio: number;
  nodes: Node[];
};

const iconsCache: Map<string, SvgIconCacheDescriptor | Promise<SvgIconCacheDescriptor>> = new Map();

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

type SvgIconRenderedProps = {
  icon: string;
  svgText: string;
  cache?: boolean;
} & ComponentPropsWithoutRef<typeof m.svg>;

const SvgIconRenderer = forwardRef<SVGSVGElement, SvgIconRenderedProps>(
  ({ icon, svgText, cache = true, width, height, style = {}, ...props }, ref) => {
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
      const fromCache = iconsCache.get(icon);
      if (cache && fromCache) {
        iconInfo = await fromCache;
      } else {
        const promise = iife(async () => {
          const cachedIcon = parseSvgToIconInfo(svgText);
          if (!cachedIcon) {
            throw new Error(`Failed to parse SVG for icon ${icon}`);
          }
          if (cache) iconsCache.set(icon, cachedIcon);
          return cachedIcon;
        });
        if (cache) iconsCache.set(icon, promise);
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
      <motion.svg
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
  },
);

type BaseIconProps = {
  width?: number | string;
  height?: number | string;
  className?: string;
} & ComponentPropsWithoutRef<typeof m.svg>;

export type IconProps = {
  icon: string;
  cache?: boolean;
} & BaseIconProps;

const CustomIcon = forwardRef<SVGSVGElement | HTMLImageElement | HTMLDivElement, IconProps>(
  ({ icon, className, style = {}, cache = true, ...props }, ref) => {
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
  },
);

export const Icon = forwardRef<SVGSVGElement, IconProps>(({ children, icon, cache = true, ...props }, ref) => {
  if (typeof icon !== "string") {
    throw new Error(
      `icon prop should be string, but got ${typeof icon}. Did you forget to add ?raw when importing icon from ~icons?`,
    );
  }
  const [prevIcon, setPrevIcon] = useState<unknown>(icon);
  const [family, iconName] = icon.split(":");
  const [svgText, setSvgText] = useState<string | null>(null);

  if (prevIcon !== icon) {
    setPrevIcon(icon);
    setSvgText(null);
  }

  useAsyncLayoutEffect(async () => {
    if (icon.includes("<svg")) {
      // This is built-in icon, not need to load it
      return setSvgText(icon);
    }

    if (family === "custom") {
      // Will be handled by <CustomIcon />
      return;
    }

    const fromCache = await iconsCache.get(icon);
    if (cache && fromCache) {
      setSvgText(fromCache.svgText);
    } else {
      const svgText = await fetch(`${ICONIFY_API_BASE}/${family}/${iconName}.svg`).then((r) => r.text());
      setSvgText(svgText);
    }
  }, [icon]);

  if (family === "custom") {
    return <CustomIcon {...props} icon={iconName} cache={cache} />;
  }

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
});

type FaviconProps = {
  url: string;
  fallback?: string;
  useFaviconApiIfPossible?: boolean;
} & BaseIconProps;

export const Favicon = forwardRef<HTMLElement, FaviconProps>(({ useFaviconApiIfPossible, ...props }, ref) => {
  const permissions = useAtomValue(availablePermissionsAtom);
  const hasPermission = permissions?.permissions.includes("favicon");
  const [imageError, setImageError] = useState(false);

  const iconUrl = useMemo(() => {
    const size = (props.width || props.height || 64).toString();
    if (hasPermission && useFaviconApiIfPossible) {
      const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
      resUrl.searchParams.set("pageUrl", props.url);
      resUrl.searchParams.set("size", size);
      return resUrl.toString();
    }
    try {
      const host = new URL(props.url).host;
      return `https://magnificent-orange-damselfly.faviconkit.com/${host}/${size}`;
    } catch (_err) {
      console.log("Error parsing host from", props.url);
      return "";
    }
  }, [hasPermission, props.url, props.height, props.width, useFaviconApiIfPossible]);

  if (iconUrl && !imageError) {
    // @ts-ignore incorrect ref typing
    return <img src={iconUrl} onError={() => setImageError(true)} {...props} ref={ref} aria-hidden />;
  }

  // @ts-ignore incorrect ref typing
  return <Icon icon={props.fallback || "ic:baseline-tab"} {...props} ref={ref} />;
});
