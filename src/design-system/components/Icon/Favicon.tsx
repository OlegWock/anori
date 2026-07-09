import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import type { BaseIconProps } from "@anori/design-system/components/Icon/types";
import { availablePermissionsAtom } from "@anori/utils/permissions";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import browser from "webextension-polyfill";

export type FaviconProps = {
  url: string;
  fallback?: string;
  useFaviconApiIfPossible?: boolean;
} & BaseIconProps;

export const Favicon = ({ useFaviconApiIfPossible, ref, ...props }: FaviconProps) => {
  const permissions = useAtomValue(availablePermissionsAtom);
  const hasPermission = permissions?.permissions.includes("favicon");
  const [imageError, setImageError] = useState(false);

  const iconUrl = useMemo(() => {
    const size = props.width || props.height || 64;
    const sizeInt = (typeof size === "number" ? size : parseInt(size), 10) * 2;
    if (hasPermission && useFaviconApiIfPossible) {
      const resUrl = new URL(browser.runtime.getURL("/_favicon/"));
      resUrl.searchParams.set("pageUrl", props.url);
      // Double size because on small sizes like 16px Chrome tends to return icon in very bad quality
      resUrl.searchParams.set("size", (sizeInt * 2).toString());
      return resUrl.toString();
    }
    try {
      const host = new URL(props.url).host;
      return `https://favicon.vemetric.com/${host}?size=${size}`;
    } catch (_err) {
      console.log("Error parsing host from", props.url);
      return "";
    }
  }, [hasPermission, props.url, props.height, props.width, useFaviconApiIfPossible]);

  if (iconUrl && !imageError) {
    // @ts-expect-error incorrect ref typing
    return <img src={iconUrl} onError={() => setImageError(true)} {...props} ref={ref} aria-hidden />;
  }

  return <Icon icon={props.fallback || builtinIcons.recentlyClosedTabs.tab} {...props} ref={ref} />;
};
