// NOTE: There is some problem with cookies in Iframe. When cookie set with SameSite=Lax (default value) or SameSite=Strict
// it's not available for JS (not sent at all?) if opened in iframe. Sites need to explicitly set SameSite=None to allow
// those cookies to function

import "./IframeWidget.scss";
import { Link } from "@anori/components/Link";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { useSizeSettings } from "@anori/utils/compact";
import { ensureDnrRules } from "@anori/utils/plugins/dnr";
import type { WidgetRenderProps } from "@anori/utils/plugins/types";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { IframePluginWidgetConfig } from "../types";

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
    <div className="IframeWidget">
      {!!config.title && (
        <div className="header">
          <h2>{config.title}</h2>
          {config.showLinkToPage && (
            <div className="open-url-btn-wrapper">
              <Link className="open-url-btn" href={config.url}>
                <Icon icon={builtinIcons.openOutline} height={rem(1.25)} width={rem(1.25)} />
              </Link>
            </div>
          )}
        </div>
      )}
      {!config.title && config.showLinkToPage && (
        <div className="open-url-btn-wrapper absolute">
          <Link className="open-url-btn" href={config.url}>
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
