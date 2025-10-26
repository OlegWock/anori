import { Button } from "@anori/components/Button";
import "./styles.scss";
import { Alert } from "@anori/components/Alert";
import { Checkbox } from "@anori/components/Checkbox";
import { IconPicker } from "@anori/components/IconPicker";
import { Input } from "@anori/components/Input";
import { Link } from "@anori/components/Link";
import { PickBookmark } from "@anori/components/PickBookmark";
import { Popover } from "@anori/components/Popover";
import { RequirePermissions } from "@anori/components/RequirePermissions";
import { WidgetExpandArea } from "@anori/components/WidgetExpandArea";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/index";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { normalizeUrl, parseHost } from "@anori/utils/misc";
import { definePlugin, defineWidget } from "@anori/utils/plugins/define";
import { dnrPermissions, ensureDnrRules, plantWebRequestHandler } from "@anori/utils/plugins/dnr";
import type { WidgetConfigurationScreenProps, WidgetRenderProps } from "@anori/utils/plugins/types";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// NOTE: There is some problem with cookies in Iframe. When cookie set with SameSite=Lax (default value) or SameSite=Strict
// it's not available for JS (not sent at all?) if opened in iframe. Sites need to explicitly set SameSite=None to allow
// those cookies to function

type IframePluginWidgetConfig = {
  title: string;
  url: string;
  showLinkToPage: boolean;
};

type IframePluginExpandableWidgetConfig = {
  title: string;
  icon: string;
  url: string;
  showLinkToPage: boolean;
};

const MainWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<IframePluginWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ url, title, showLinkToPage });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
  const { t } = useTranslation();

  return (
    <div className="IframeWidget-config">
      <Alert>{t("iframe-plugin.limitations")}</Alert>
      <div className="field">
        <label>
          {t("title")} ({t("canBeEmpty")})
        </label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("url")}:</label>
        <div className="url-import-wrapper">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <Popover
            component={PickBookmark}
            additionalData={{
              onSelected: (title, url) => {
                console.log("Selected bookmark", title, url);
                setUrl(url);
              },
            }}
          >
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>
      <div className="field">
        <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>
          {t("iframe-plugin.showLink")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};

const MainWidget = ({ config }: WidgetRenderProps<IframePluginWidgetConfig>) => {
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

const ExpandableWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<IframePluginExpandableWidgetConfig>) => {
  const onConfirm = () => {
    saveConfiguration({ url, title, icon, showLinkToPage });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [icon, setIcon] = useState(currentConfig?.icon || builtinIcons.compass);
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [showLinkToPage, setShowLinkToPage] = useState(currentConfig?.showLinkToPage ?? true);
  const { t } = useTranslation();
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);

  return (
    <div className="IframeWidget-config">
      <Alert>{t("iframe-plugin.limitations")}</Alert>

      <div className="field">
        <label>{t("icon")}:</label>
        <Popover
          component={IconPicker}
          initialFocus={IS_TOUCH_DEVICE ? -1 : iconSearchRef}
          additionalData={{
            onSelected: setIcon,
            inputRef: iconSearchRef,
          }}
        >
          <Button className="icon-picker-trigger">
            <Icon icon={icon} width={rem(3)} />
          </Button>
        </Popover>
      </div>
      <div className="field">
        <label>{t("title")}</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("url")}:</label>
        <div className="url-import-wrapper">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          <Popover
            component={PickBookmark}
            additionalData={{
              onSelected: (title, url) => {
                console.log("Selected bookmark", title, url);
                setUrl(url);
              },
            }}
          >
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>

      <div className="field">
        <Checkbox checked={showLinkToPage} onChange={setShowLinkToPage}>
          {t("iframe-plugin.showLink")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        Save
      </Button>
    </div>
  );
};

const ExpandableWidget = ({ config }: WidgetRenderProps<IframePluginExpandableWidgetConfig>) => {
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

const widgetDescriptor = defineWidget({
  id: "iframe-widget",
  get name() {
    return translate("iframe-plugin.name");
  },
  configurationScreen: MainWidgetConfigScreen,
  mainScreen: (props: WidgetRenderProps<IframePluginWidgetConfig>) => {
    return (
      <RequirePermissions hosts={[parseHost(props.config.url)]} permissions={dnrPermissions}>
        <MainWidget {...props} />
      </RequirePermissions>
    );
  },
  mock: () => {
    return <MainWidget instanceId="mock" config={{ url: "http://example.com/", title: "", showLinkToPage: true }} />;
  },
  appearance: {
    size: {
      width: 2,
      height: 2,
    },
    resizable: {
      min: { width: 2, height: 2 },
    },
  },
});

const widgetDescriptorExpandable = defineWidget({
  id: "iframe-widget-expandable",
  get name() {
    return translate("iframe-plugin.expandWidgetName");
  },
  configurationScreen: ExpandableWidgetConfigScreen,
  mainScreen: (props: WidgetRenderProps<IframePluginExpandableWidgetConfig>) => {
    return (
      <RequirePermissions
        compact
        hosts={[parseHost(props.config.url)]}
        className="rp-paddings"
        permissions={dnrPermissions}
      >
        <ExpandableWidget {...props} />
      </RequirePermissions>
    );
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <ExpandableWidget
        instanceId="mock"
        config={{ url: "http://example.com/", title: t("example"), icon: builtinIcons.compass, showLinkToPage: true }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    withHoverAnimation: true,
    withoutPadding: true,
    resizable: false,
  },
});

export const iframePlugin = definePlugin({
  id: "iframe-plugin",
  get name() {
    return translate("iframe-plugin.name");
  },
  icon: builtinIcons.pip,
  configurationScreen: null,
  onStart: () => {
    plantWebRequestHandler();
  },
}).withWidgets(widgetDescriptor, widgetDescriptorExpandable);
