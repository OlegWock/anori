// NOTE: There is some problem with cookies in Iframe. When cookie set with SameSite=Lax (default value) or SameSite=Strict
// it's not available for JS (not sent at all?) if opened in iframe. Sites need to explicitly set SameSite=None to allow
// those cookies to function

import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { Icon } from "@anori/design-system/components/Icon/Icon";
import { Link } from "@anori/design-system/components/Link/Link";
import { useSizeSettings } from "@anori/utils/compact";
import { ensureDnrRules } from "@anori/utils/plugins/dnr";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cva } from "styled-system/css";
import type { IframePluginWidgetConfig } from "../types";
import { openUrlBtn } from "./widget-styles";

const widget = css({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  alignItems: "flex-start",
  textDecoration: "none",
  flexGrow: 1,
  gap: "2",
  "& iframe": { flexGrow: 1, alignSelf: "stretch", borderRadius: "sm", background: "white" },
});
const widgetHeader = css({
  display: "flex",
  justifyContent: "space-between",
  alignSelf: "stretch",
  alignItems: "center",
});
const openUrlWrapper = cva({
  base: {
    background: "surface.elevated",
    whiteSpace: "nowrap",
    color: "text.primary",
    overflow: "hidden",
    borderRadius: "xl",
  },
  variants: { absolute: { true: { position: "absolute", top: "0.5rem", right: "0.5rem" } } },
});

export const MainWidget = ({ config }: WidgetRenderProps<IframePluginWidgetConfig>) => {
  const [canRenderIframe, setCanRenderIframe] = useState(false);
  const { rem } = useSizeSettings();
  const { t } = useTranslation();

  useEffect(() => {
    const main = async () => {
      setCanRenderIframe(false);
      await ensureDnrRules(config.url);
      setCanRenderIframe(true);
    };

    main();
  }, [config.url]);

  return (
    <div className={widget}>
      {!!config.title && (
        <div className={widgetHeader}>
          <h2>{config.title}</h2>
          {config.showLinkToPage && (
            <div className={openUrlWrapper()}>
              <Link className={openUrlBtn} href={config.url}>
                <Icon icon={builtinIcons.openOutline} height={rem(1.25)} width={rem(1.25)} />
              </Link>
            </div>
          )}
        </div>
      )}
      {!config.title && config.showLinkToPage && (
        <div className={openUrlWrapper({ absolute: true })}>
          <Link className={openUrlBtn} href={config.url}>
            <Icon icon={builtinIcons.openOutline} height={rem(1.25)} width={rem(1.25)} />
          </Link>
        </div>
      )}
      {canRenderIframe && (
        <iframe
          src={config.url}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated"
          title={t("iframe-plugin.name")}
        />
      )}
    </div>
  );
};
