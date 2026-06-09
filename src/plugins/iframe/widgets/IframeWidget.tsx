// NOTE: There is some problem with cookies in Iframe. When cookie set with SameSite=Lax (default value) or SameSite=Strict
// it's not available for JS (not sent at all?) if opened in iframe. Sites need to explicitly set SameSite=None to allow
// those cookies to function

import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { LinkIconButton } from "@anori/design-system/components/LinkIconButton/LinkIconButton";
import { ensureDnrRules } from "@anori/utils/plugins/dnr";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import type { IframePluginWidgetConfig } from "../types";

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
// Pins the "open page" button over the iframe when there's no title row to sit in.
const absoluteLink = css({ position: "absolute", top: "0.5rem", right: "0.5rem" });

export const MainWidget = ({ config }: WidgetRenderProps<IframePluginWidgetConfig>) => {
  const [canRenderIframe, setCanRenderIframe] = useState(false);
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
            <LinkIconButton
              variant="secondary"
              icon={builtinIcons.openOutline}
              label={t("iframe-plugin.openPage")}
              href={config.url}
            />
          )}
        </div>
      )}
      {!config.title && config.showLinkToPage && (
        <LinkIconButton
          variant="secondary"
          icon={builtinIcons.openOutline}
          label={t("iframe-plugin.openPage")}
          href={config.url}
          className={absoluteLink}
        />
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
