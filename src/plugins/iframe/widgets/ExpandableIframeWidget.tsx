import "./ExpandableIframeWidget.scss";
import { Link } from "@anori/components/Link";
import { WidgetExpandArea } from "@anori/components/WidgetExpandArea";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { normalizeUrl, parseHost } from "@anori/utils/misc";
import { ensureDnrRules } from "@anori/utils/plugins/dnr";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginExpandableWidgetConfig } from "../types";

export const ExpandableWidget = ({ config }: WidgetRenderProps<IframePluginExpandableWidgetConfig>) => {
  const [open, setOpen] = useState(false);
  const { rem } = useSizeSettings();
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
        className="ExpandableIframeWidget"
        onClick={() => {
          trackInteraction("Expand");
          setOpen(true);
        }}
      >
        <div className="iframe-widget-content">
          <Icon icon={config.icon} width={rem(2.25)} height={rem(2.25)} />
          <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{host}</div>
          </div>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <WidgetExpandArea
            title={config.title}
            size="max"
            onClose={() => setOpen(false)}
            withoutScroll
            className="ExpandableIframeWidget-expand-area"
            extraButtons={
              config.showLinkToPage && (
                <Link className="open-url-btn" href={config.url}>
                  <Icon icon={builtinIcons.openOutline} height={rem(1.5)} width={rem(1.5)} />
                </Link>
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
