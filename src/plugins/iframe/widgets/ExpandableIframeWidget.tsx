import { WidgetExpandArea } from "@anori/components/WidgetExpandArea/WidgetExpandArea";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { LinkIconButton } from "@anori/design-system/components/LinkIconButton/LinkIconButton";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { normalizeUrl, parseHost } from "@anori/utils/misc";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { ensureDnrRules } from "@anori/utils/plugins/dnr";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import { AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import type { IframePluginExpandableWidgetConfig } from "../types";

const widget = css({
  display: "flex",
  alignItems: "stretch",
  textDecoration: "none",
  flexGrow: 1,
  maxHeight: "100%",
  padding: "4",
  position: "relative",
  cursor: "pointer",
  textAlign: "start",
});
const content = cva({
  base: {
    display: "flex",
    alignItems: "center",
    flexGrow: 1,
    overflow: "hidden",
    "& svg": { color: "icon" },
  },
  variants: { size: { s: { flexFlow: "column-reverse", alignItems: "flex-start" }, m: {} } },
});
const textCol = css({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignSelf: "stretch",
  overflow: "hidden",
});
const heading = cva({
  base: { marginTop: "1", marginBottom: "4", lineHeight: "1.25" },
  variants: { size: { s: { marginTop: "3", marginBottom: "1", lineHeight: "none", whiteSpace: "nowrap" }, m: {} } },
});
const hostText = css({
  fontSize: "xs",
  color: "text.placeholder",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
});
const expandArea = css({
  position: "relative",
  "& iframe": { flexGrow: 1, alignSelf: "stretch", borderRadius: "lg", background: "white" },
});

export const ExpandableWidget = ({ config }: WidgetRenderProps<IframePluginExpandableWidgetConfig>) => {
  const [open, setOpen] = useState(false);
  const { rem } = useSizeSettings();
  const {
    size: { width },
  } = useWidgetMetadata();
  const size = width === 1 ? "s" : "m";
  const { t } = useTranslation();
  const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
  const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);
  const trackInteraction = useWidgetInteractionTracker();

  useEffect(() => {
    ensureDnrRules(config.url);
  }, [config.url]);

  return (
    <>
      <button
        type="button"
        className={widget}
        onClick={() => {
          trackInteraction("Expand");
          setOpen(true);
        }}
      >
        <div className={content({ size })}>
          <div className={textCol}>
            <h2 className={heading({ size })}>{config.title}</h2>
            <div className={hostText}>{host}</div>
          </div>
          <Icon
            icon={config.icon}
            width={size === "m" ? rem(5.75) : rem(2.25)}
            height={size === "m" ? rem(5.75) : rem(2.25)}
          />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <WidgetExpandArea
            title={config.title}
            size="max"
            onClose={() => setOpen(false)}
            withoutScroll
            className={expandArea}
            extraButtons={
              config.showLinkToPage && (
                <LinkIconButton
                  variant="ghost"
                  icon={builtinIcons.openOutline}
                  label={t("iframe-plugin.openPage")}
                  href={config.url}
                />
              )
            }
          >
            <iframe
              src={config.url}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated"
              title={t("iframe-plugin.name")}
            />
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </>
  );
};
