import type { BaseIconProps } from "@anori/components/icon/types";
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
  return <Icon icon={props.fallback || builtinIcons.recentlyClosedTabs.tab} {...props} ref={ref} />;
};
