import { normalizeUrl } from "@anori/utils/misc";
import { isMacLike } from "@anori/utils/shortcuts";
import type { ComponentProps, MouseEvent } from "react";
import browser from "webextension-polyfill";

// Drop-in replacement for <a> which correctly handles local resource urls (like file:// or chrome://)
export const Link = ({ href, onClick, ref, ...props }: ComponentProps<"a">) => {
  const localOnClick = (e: MouseEvent<HTMLAnchorElement>) => {
    let result: ReturnType<NonNullable<typeof onClick>> | undefined;
    if (onClick) {
      result = onClick(e);
    }

    if (!canOpenCurrentUrl && !e.defaultPrevented) {
      e.preventDefault();
      const inNewTab = e.ctrlKey || (isMacLike && e.metaKey);
      browser.runtime.sendMessage({ type: "open-url", url: normalizedHref, inNewTab });
    }

    return result;
  };

  const normalizedHref = normalizeUrl(href || "#");
  const canOpenCurrentUrl =
    !normalizedHref.includes("://") || normalizedHref.startsWith("http://") || normalizedHref.startsWith("https://");
  const correctHref = canOpenCurrentUrl ? normalizedHref : "#";
  return <a ref={ref} href={correctHref} onClick={localOnClick} {...props} />;
};
