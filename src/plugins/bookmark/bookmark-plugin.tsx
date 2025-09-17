import { Button } from "@anori/components/Button";
import { Input } from "@anori/components/Input";
import type {
  AnoriPlugin,
  ID,
  WidgetConfigurationScreenProps,
  WidgetDescriptor,
  WidgetInFolderWithMeta,
  WidgetRenderProps,
} from "@anori/utils/user-data/types";
import { type MouseEvent, type MouseEventHandler, useRef, useState } from "react";
import "./styles.scss";
import { Checkbox } from "@anori/components/Checkbox";
import { CheckboxWithPermission } from "@anori/components/CheckboxWithPermission";
import { Hint } from "@anori/components/Hint";
import { IconPicker } from "@anori/components/IconPicker";
import { Link } from "@anori/components/Link";
import { PickBookmark } from "@anori/components/PickBookmark";
import { Popover } from "@anori/components/Popover";
import { RequirePermissions } from "@anori/components/RequirePermissions";
import { Tooltip } from "@anori/components/Tooltip";
import { WidgetExpandArea } from "@anori/components/WidgetExpandArea";
import { listItemAnimation } from "@anori/components/animations";
import { Icon } from "@anori/components/icon/Icon";
import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { dnrPermissions, ensureDnrRules, plantWebRequestHandler } from "@anori/plugins/shared/dnr";
import { translate } from "@anori/translations/index";
import { useWidgetInteractionTracker } from "@anori/utils/analytics";
import { isChromeLike } from "@anori/utils/browser";
import { useSizeSettings } from "@anori/utils/compact";
import { IS_TOUCH_DEVICE } from "@anori/utils/device";
import { useAsyncEffect, useLinkNavigationState } from "@anori/utils/hooks";
import { guid, normalizeUrl, parseHost } from "@anori/utils/misc";
import { usePermissionsQuery } from "@anori/utils/permissions";
import {
  createOnMessageHandlers,
  getAllWidgetsByPlugin,
  getWidgetStorage,
  useWidgetMetadata,
  useWidgetStorage,
} from "@anori/utils/plugin";
import { isMacLike } from "@anori/utils/shortcuts";
import clsx from "clsx";
import { AnimatePresence, m } from "framer-motion";
import moment from "moment-timezone";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import browser from "webextension-polyfill";

type BookmarkWidgetConfigType = {
  url: string;
  title: string;
  icon: string;
  checkStatus?: boolean;
  openInNewTab?: boolean;
};

type BookmarkWidgetStorageType = {
  status: "up" | "down" | "loading";
  lastCheck?: number;
  lastStatusChange?: number;
};

type BookmarkGroupWidgetConfigType = {
  title: string;
  icon: string;
  openInTabGroup: boolean;
  urls: string[];
};

type BookmarksMessageHandlers = {
  openGroup: {
    args: {
      urls: string[];
      openInTabGroup: boolean;
      title: string;
      closeCurrentTab: boolean;
    };
    result: void;
  };
};

const getPageStatus = async (url: string): Promise<"up" | "down"> => {
  try {
    const resp = await fetch(url);
    if (resp.status >= 500) return "down";
    return "up";
  } catch (err) {
    console.log("Error while checking page status", url, err);
    return "down";
  }
};

const updateStatusesForTrackedPages = async () => {
  const widgets = await getAllWidgetsByPlugin(bookmarkPlugin);
  const widgetsToCheck = widgets.filter((w) => {
    return w.widgetId === bookmarkWidgetDescriptor.id && (w.configuration as BookmarkWidgetConfigType).checkStatus;
  }) as WidgetInFolderWithMeta<BookmarkWidgetConfigType, Record<string, never>, BookmarkWidgetConfigType>[];

  const promises = widgetsToCheck.map(async (w) => {
    const store = getWidgetStorage<BookmarkWidgetStorageType>(w.instanceId);
    await store.waitForLoad();
    const currentStatus = store.get("status");
    store.set("status", "loading");
    const newStatus = await getPageStatus(normalizeUrl(w.configuration.url));
    const updatePayload: Partial<BookmarkWidgetStorageType> = {
      lastCheck: Date.now(),
      status: newStatus,
    };
    if (currentStatus !== newStatus) {
      updatePayload.lastStatusChange = Date.now();
    }

    await store.setMany(updatePayload);
  });

  await Promise.all(promises);
};

const updatePageStatusForWidget = async (instaceId: ID, url: string) => {
  const store = getWidgetStorage<BookmarkWidgetStorageType>(instaceId);
  await store.waitForLoad();
  const currentStatus = store.get("status");
  store.set("status", "loading");
  const newStatus = await getPageStatus(normalizeUrl(url));
  const updatePayload: Partial<BookmarkWidgetStorageType> = {
    lastCheck: Date.now(),
    status: newStatus,
  };
  if (currentStatus !== newStatus) {
    updatePayload.lastStatusChange = Date.now();
  }

  await store.setMany(updatePayload);
};

const STATUS_CHECK_INTERVAL_MINUTES = 10;

const BookmarGroupkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<BookmarkGroupWidgetConfigType>) => {
  const onConfirm = () => {
    const cleanedUrls = urls.map((u) => u.url).filter((u) => !!u);
    if (!title || urls.length === 0) return;

    saveConfiguration({ title, icon, urls: cleanedUrls, openInTabGroup });
  };

  const hasTabGroupsPermission = usePermissionsQuery({ permissions: ["tabGroups"] });
  const [title, setTitle] = useState(currentConfig?.title ?? "");
  const [urls, setUrls] = useState<{ id: string; url: string }[]>(() => {
    return currentConfig?.urls ? currentConfig.urls.map((url) => ({ id: guid(), url })) : [{ id: guid(), url: "" }];
  });
  const [icon, setIcon] = useState(currentConfig?.icon ?? builtinIcons.dice);
  const [openInTabGroup, setOpenInTabGroup] = useState<boolean>(
    currentConfig?.openInTabGroup ?? (X_BROWSER === "chrome" && hasTabGroupsPermission),
  );
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  return (
    <m.div className="BookmarkWidget-config">
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
        <label>{t("title")}:</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("urls")}:</label>
        <div className="urls">
          <AnimatePresence initial={false}>
            {urls.map(({ id, url }, ind) => {
              return (
                <m.div className="url-import-wrapper" layout key={id} {...listItemAnimation}>
                  <Input
                    value={url}
                    onValueChange={(newUrl) =>
                      setUrls((p) => {
                        const copy = [...p];
                        copy[ind].url = newUrl;
                        return copy;
                      })
                    }
                  />
                  <Popover
                    component={PickBookmark}
                    additionalData={{
                      onSelected: (title, url) => {
                        console.log("Selected bookmark", title, url);
                        setUrls((p) => {
                          const copy = [...p];
                          copy[ind].url = url;
                          return copy;
                        });
                      },
                    }}
                  >
                    <Button>{t("import")}</Button>
                  </Popover>
                  <Button onClick={() => setUrls((p) => p.filter((_u, i) => i !== ind))}>
                    <Icon icon={builtinIcons.close} height={22} />
                  </Button>
                </m.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <m.div layout className="add-button-wrapper">
        <Button className="add-button" onClick={() => setUrls((p) => [...p, { id: guid(), url: "" }])}>
          {t("add")}
        </Button>
      </m.div>
      {X_BROWSER === "chrome" && (
        <m.div className="field" layout="position">
          <CheckboxWithPermission permissions={["tabGroups"]} checked={openInTabGroup} onChange={setOpenInTabGroup}>
            {t("bookmark-plugin.openInGroup")}
          </CheckboxWithPermission>
        </m.div>
      )}

      <m.div layout className="save-config">
        <Button onClick={onConfirm}>{t("save")}</Button>
      </m.div>
    </m.div>
  );
};

const BookmarkGroupWidget = ({ config }: WidgetRenderProps<BookmarkGroupWidgetConfigType> & { isMock?: boolean }) => {
  const openGroup: MouseEventHandler<HTMLElement> = (e) => {
    trackInteraction("Open group");
    e.preventDefault();
    // aux click but with another button, like rmb
    if (e.type === "auxclick" && e.button !== 1) {
      return;
    }
    onLinkClick(e);
    const shouldKeepCurrentTab = e.ctrlKey || (isMacLike && e.metaKey) || e.type === "auxclick";
    sendMessage("openGroup", {
      urls: config.urls.map((u) => normalizeUrl(u)),
      openInTabGroup: config.openInTabGroup,
      closeCurrentTab: !shouldKeepCurrentTab,
      title: config.title,
    });
  };
  const { rem } = useSizeSettings();
  const { onLinkClick, isNavigating } = useLinkNavigationState();
  const { t } = useTranslation();
  const {
    size: { width },
  } = useWidgetMetadata();
  const trackInteraction = useWidgetInteractionTracker();
  const size = width === 1 ? "s" : "m";

  return (
    <button
      type="button"
      className={clsx(["BookmarkWidget", `size-${size}`])}
      onClick={openGroup}
      onAuxClick={openGroup}
    >
      <div className="bookmark-content">
        <div className="text">
          <h2>{config.title}</h2>
          <div className="host">{t("bookmark-plugin.group")}</div>
        </div>
        {isNavigating ? (
          <Icon
            className="loading"
            icon={builtinIcons.spinner}
            width={size === "m" ? rem(5.75) : rem(2.25)}
            height={size === "m" ? rem(5.75) : rem(2.25)}
          />
        ) : (
          <Icon
            icon={config.icon}
            width={size === "m" ? rem(5.75) : rem(2.25)}
            height={size === "m" ? rem(5.75) : rem(2.25)}
          />
        )}
      </div>
    </button>
  );
};

const BookmarkWidgetConfigScreen = ({
  saveConfiguration,
  currentConfig,
}: WidgetConfigurationScreenProps<BookmarkWidgetConfigType>) => {
  const onConfirm = () => {
    if (!title || !url) return;

    saveConfiguration({ title, url, icon, checkStatus, openInNewTab });
  };

  const [title, setTitle] = useState(currentConfig?.title || "");
  const [url, setUrl] = useState(currentConfig?.url || "");
  const [icon, setIcon] = useState(currentConfig?.icon || builtinIcons.dice);
  const [checkStatus, setCheckStatus] = useState(currentConfig?.checkStatus ?? false);
  const [openInNewTab, setOpenInNewTab] = useState(currentConfig?.openInNewTab ?? false);
  const { rem } = useSizeSettings();
  const iconSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  console.log("BookmarkWidgetConfigScreen", { currentConfig });

  return (
    <div className="BookmarkWidget-config">
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
        <label>{t("title")}:</label>
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
                setTitle(title);
                setUrl(url);
              },
            }}
          >
            <Button>{t("import")}</Button>
          </Popover>
        </div>
      </div>
      <div className="field">
        <Checkbox checked={checkStatus} onChange={setCheckStatus}>
          {t("bookmark-plugin.checkStatus")} <Hint content={t("bookmark-plugin.checkStatusHint")} />
        </Checkbox>
      </div>
      <div className="field">
        <Checkbox checked={openInNewTab} onChange={setOpenInNewTab}>
          {t("bookmark-plugin.openInNewTab")}
        </Checkbox>
      </div>

      <Button className="save-config" onClick={onConfirm}>
        {t("save")}
      </Button>
    </div>
  );
};

const BookmarkWidget = ({
  config,
  isMock,
  instanceId,
}: WidgetRenderProps<BookmarkWidgetConfigType> & { isMock?: boolean }) => {
  const openIframe = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowExpandArea(true);
    trackInteraction("Open iframe");
    if (hasDnrPermissions) {
      if (!showIframe) {
        ensureDnrRules(normalizedUrl).then(() => setShowIframe(true));
      }
    }
  };

  const closeExpand = () => {
    setShowExpandArea(false);
  };

  const createStatusMessage = () => {
    if (status === "loading") return t("bookmark-plugin.checkingStatus");
    console.log("Create status message", { lastStatusChange, lastCheck });
    return t("bookmark-plugin.status", {
      status: status === "up" ? t("bookmark-plugin.statusUp") : t("bookmark-plugin.statusDown"),
      lastChange: lastStatusChangeMoment.fromNow(),
      lastCheck: lastCheckMoment.fromNow(),
    });
  };

  const [showExpandArea, setShowExpandArea] = useState(false);
  const [showIframe, setShowIframe] = useState(false);

  const { rem } = useSizeSettings();
  const store = useWidgetStorage<BookmarkWidgetStorageType>();
  const { t, i18n } = useTranslation();
  const trackInteraction = useWidgetInteractionTracker();

  const [status] = store.useValue("status", "loading");
  const [lastCheck] = store.useValue("lastCheck", undefined);
  const [lastStatusChange] = store.useValue("lastStatusChange", undefined);
  // TODO: probably should refactor this so dependencies are explicit?
  // biome-ignore lint/correctness/useExhaustiveDependencies: we use i18n as reactive proxy for current locale which affect some of functions outside of components
  const lastCheckMoment = useMemo(() => moment(lastCheck), [lastCheck, i18n.language]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: same as above
  const lastStatusChangeMoment = useMemo(() => moment(lastStatusChange), [lastStatusChange, i18n.language]);
  const statusColor = {
    loading: "var(--text-disabled)",
    up: "#2eb46a",
    down: "var(--error-color)",
  }[status];

  const normalizedUrl = useMemo(() => normalizeUrl(config.url), [config.url]);
  const host = useMemo(() => parseHost(normalizedUrl), [normalizedUrl]);

  const {
    size: { width },
  } = useWidgetMetadata();
  const size = width === 1 ? "s" : "m";

  const { onLinkClick, isNavigating } = useLinkNavigationState();

  useAsyncEffect(async () => {
    if (!config.checkStatus) return;
    await store.waitForLoad();
    const lastCheck = store.get("lastCheck");
    console.log("Last checked status for", config.url, "at", lastCheck);
    if (!lastCheck) {
      updatePageStatusForWidget(instanceId, config.url);
    }
  }, [config.url]);

  const hasDnrPermissions = usePermissionsQuery({
    hosts: [parseHost(config.url)],
    permissions: ["declarativeNetRequestWithHostAccess", "browsingData"],
  });

  const [prevUrl, setPrevUrl] = useState(config.url);
  if (prevUrl && prevUrl !== config.url) {
    setPrevUrl(config.url);
    setShowIframe(false);
  }

  return (
    <>
      <Link
        className={clsx(["BookmarkWidget", `size-${size}`])}
        href={isMock ? undefined : normalizedUrl}
        onClick={(e) => {
          trackInteraction("Open bookmark");
          return onLinkClick(e);
        }}
        target={config.openInNewTab ? "_blank" : undefined}
      >
        <div className="bookmark-content">
          <div className="text">
            <h2>{config.title}</h2>
            <div className="host">{host}</div>
          </div>
          {isNavigating && !config.openInNewTab ? (
            <Icon
              className="loading"
              icon={builtinIcons.spinner}
              width={size === "m" ? rem(5.75) : rem(2.25)}
              height={size === "m" ? rem(5.75) : rem(2.25)}
            />
          ) : (
            <Icon
              icon={config.icon}
              width={size === "m" ? rem(5.75) : rem(2.25)}
              height={size === "m" ? rem(5.75) : rem(2.25)}
            />
          )}
        </div>
        <div className="corner-controls">
          {config.checkStatus && (
            <Tooltip label={createStatusMessage}>
              <div className="status-dot" style={{ backgroundColor: statusColor }} />
            </Tooltip>
          )}

          {["chrome", "firefox"].includes(X_BROWSER) && (
            <button type="button" onClick={openIframe} className="open-in-iframe">
              <div>
                <Icon icon={builtinIcons.expand} />
              </div>
            </button>
          )}
        </div>
      </Link>
      <AnimatePresence>
        {showExpandArea && (
          <WidgetExpandArea
            title={config.title}
            onClose={closeExpand}
            size="max"
            withoutScroll
            className="BookmarkWidget-expand"
          >
            <RequirePermissions
              hosts={[parseHost(config.url)]}
              permissions={dnrPermissions}
              onGrant={() => {
                ensureDnrRules(config.url).then(() => setShowIframe(true));
              }}
            >
              {showIframe && (
                <iframe
                  src={config.url}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; cross-origin-isolated"
                  title={t("iframe-plugin.name")}
                />
              )}
            </RequirePermissions>
          </WidgetExpandArea>
        )}
      </AnimatePresence>
    </>
  );
};

export const bookmarkWidgetDescriptor = {
  id: "bookmark",
  get name() {
    return translate("bookmark-plugin.widgetName");
  },
  configurationScreen: BookmarkWidgetConfigScreen,
  mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkWidgetConfigType>) => {
    const { t } = useTranslation();
    return (
      <RequirePermissions
        className="rp-paddings"
        additionalInfo={t("bookmark-plugin.permissionExplanation")}
        hosts={[parseHost(config.url)]}
        enabled={config.checkStatus === true}
        compact
      >
        <BookmarkWidget instanceId={instanceId} config={config} isMock={false} />
      </RequirePermissions>
    );
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <BookmarkWidget
        instanceId=""
        isMock
        config={{
          url: "http://example.com",
          title: t("example"),
          icon: builtinIcons.dice,
        }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: { width: 1, height: 1 },
      max: { width: 2, height: 1 },
    },
    withHoverAnimation: true,
    withoutPadding: true,
  },
} as const satisfies WidgetDescriptor<any>;

export const bookmarkGroupWidgetDescriptor = {
  id: "bookmark-group",
  get name() {
    return translate("bookmark-plugin.groupWidgetName");
  },
  configurationScreen: BookmarGroupkWidgetConfigScreen,
  mainScreen: ({ config, instanceId }: WidgetRenderProps<BookmarkGroupWidgetConfigType>) => {
    return <BookmarkGroupWidget instanceId={instanceId} config={config} isMock={false} />;
  },
  mock: () => {
    const { t } = useTranslation();
    return (
      <BookmarkGroupWidget
        instanceId=""
        isMock
        config={{
          urls: ["http://example.com"],
          openInTabGroup: false,
          title: t("example"),
          icon: builtinIcons.cloud,
        }}
      />
    );
  },
  appearance: {
    size: {
      width: 1,
      height: 1,
    },
    resizable: {
      min: { width: 1, height: 1 },
      max: { width: 2, height: 1 },
    },
    withHoverAnimation: true,
    withoutPadding: true,
  },
} as const satisfies WidgetDescriptor<any>;

const { handlers, sendMessage } = createOnMessageHandlers<BookmarksMessageHandlers>("bookmark-plugin", {
  openGroup: async (args, senderTabId) => {
    const tabs = await Promise.all(
      args.urls.map((url, i) => {
        return browser.tabs.create({
          url,
          active: i === 0,
        });
      }),
    );
    if (senderTabId !== undefined && args.closeCurrentTab) browser.tabs.remove(senderTabId);
    if (args.openInTabGroup && isChromeLike(browser)) {
      const groupId = await browser.tabs.group({
        tabIds: tabs.map((t) => t.id).filter(Boolean),
      });

      await browser.tabGroups.update(groupId, { collapsed: false, title: args.title });
    }
  },
});

export const bookmarkPlugin: AnoriPlugin<
  Record<string, never>,
  BookmarkWidgetConfigType | BookmarkGroupWidgetConfigType
> = {
  id: "bookmark-plugin",
  get name() {
    return translate("bookmark-plugin.name");
  },
  widgets: [bookmarkWidgetDescriptor, bookmarkGroupWidgetDescriptor],
  configurationScreen: null,
  onMessage: handlers,
  scheduledCallback: {
    intervalInMinutes: STATUS_CHECK_INTERVAL_MINUTES,
    callback: updateStatusesForTrackedPages,
  },
  onStart: () => {
    plantWebRequestHandler();
  },
};
