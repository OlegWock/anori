import { trpc } from "@anori/cloud-integration/api-client";
import { useCloudAccount } from "@anori/cloud-integration/hooks";
import { openAnoriPlusSettings } from "@anori/cloud-integration/modal-events";
import { subscribeToSyncedTabsUpdates } from "@anori/cloud-integration/synced-tabs-subscription";
import { WidgetHeader } from "@anori/components/WidgetHeader/WidgetHeader";
import { Button } from "@anori/design-system/components/Button/Button";
import { EmptyState } from "@anori/design-system/components/EmptyState/EmptyState";
import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { ScrollArea } from "@anori/design-system/components/ScrollArea/ScrollArea";
import type { WidgetRenderProps } from "@anori/utils/plugins/define";
import { useWidgetMetadata } from "@anori/utils/plugins/widget";
import type { EmptyObject } from "@anori/utils/types";
import { memo, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import browser from "webextension-polyfill";
import { SyncedDeviceList } from "../components/SyncedDeviceList";
import { resolveSyncedTabsView, type SyncedDevice, sortDevices } from "../synced-tabs";

const widget = css({ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" });
const scroll = css({ flexGrow: 1, minHeight: 0 });
const fill = css({ flexGrow: 1 });
const loadingText = css({
  flexGrow: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "text.subtle",
  fontSize: "sm",
});

const openAllTabs = (urls: string[]) => {
  for (const url of urls) browser.tabs.create({ url, active: false });
};

export const SyncedTabsWidget = memo(function SyncedTabsWidget(_props: WidgetRenderProps<EmptyObject>) {
  const { t } = useTranslation();
  const { isConnected } = useCloudAccount();
  const {
    size: { height },
  } = useWidgetMetadata();

  const devicesQuery = trpc.tabs.listDevices.useQuery(undefined, { enabled: isConnected });
  const { refetch } = devicesQuery;
  const devices = useMemo(() => sortDevices((devicesQuery.data?.devices ?? []) as SyncedDevice[]), [devicesQuery.data]);

  useEffect(() => {
    if (!isConnected) return;
    return subscribeToSyncedTabsUpdates(() => {
      refetch();
    });
  }, [isConnected, refetch]);
  const view = resolveSyncedTabsView({ isConnected, deviceCount: devices.length });
  const isLoading = isConnected && devicesQuery.isLoading;

  return (
    <div className={widget}>
      <WidgetHeader title={t("tabs-plugin.syncedTabs.title")} />
      {view === "not-connected" ? (
        <EmptyState
          className={fill}
          icon={builtinIcons.cloud}
          title={t("tabs-plugin.syncedTabs.notConnectedTitle")}
          description={t("tabs-plugin.syncedTabs.notConnectedDescription")}
        >
          <Button onClick={openAnoriPlusSettings}>{t("tabs-plugin.syncedTabs.connect")}</Button>
        </EmptyState>
      ) : isLoading && devices.length === 0 ? (
        <div className={loadingText}>{t("tabs-plugin.syncedTabs.loading")}</div>
      ) : view === "empty" ? (
        <EmptyState
          className={fill}
          icon={builtinIcons.tabsFill}
          title={t("tabs-plugin.syncedTabs.emptyTitle")}
          description={t("tabs-plugin.syncedTabs.emptyDescription")}
        />
      ) : (
        <ScrollArea className={scroll} type="hover">
          <SyncedDeviceList devices={devices} onOpenAll={openAllTabs} heightBoxes={height} />
        </ScrollArea>
      )}
    </div>
  );
});

const MOCK_DEVICES: SyncedDevice[] = [
  {
    deviceId: "mock-laptop",
    name: "Chrome on macOS",
    browser: "Chrome",
    os: "macOS",
    updatedAt: "2026-07-08T09:00:00.000Z",
    tabs: [
      { url: "https://github.com/anori-app/anori", title: "anori-app/anori", lastActiveAt: 500 },
      { url: "https://developer.mozilla.org/en-US/docs/Web", title: "MDN Web Docs", lastActiveAt: 400 },
      {
        url: "https://www.figma.com/files",
        title: "Figma — Drafts",
        groupId: 1,
        groupName: "Design",
        groupColor: "purple",
        lastActiveAt: 300,
      },
      {
        url: "https://dribbble.com/shots",
        title: "Dribbble",
        groupId: 1,
        groupName: "Design",
        groupColor: "purple",
        lastActiveAt: 200,
      },
    ],
  },
  {
    deviceId: "mock-desktop",
    name: "Firefox on Windows",
    browser: "Firefox",
    os: "Windows",
    updatedAt: "2026-07-07T18:30:00.000Z",
    tabs: [
      { url: "https://news.ycombinator.com", title: "Hacker News", lastActiveAt: 250 },
      { url: "https://youtube.com", title: "YouTube", lastActiveAt: 150 },
    ],
  },
];

export const SyncedTabsWidgetMock = () => {
  const { t } = useTranslation();
  return (
    <div className={widget}>
      <WidgetHeader title={t("tabs-plugin.syncedTabs.title")} />
      <ScrollArea className={scroll} type="hover">
        <SyncedDeviceList devices={MOCK_DEVICES} onOpenAll={() => {}} heightBoxes={2} />
      </ScrollArea>
    </div>
  );
};
