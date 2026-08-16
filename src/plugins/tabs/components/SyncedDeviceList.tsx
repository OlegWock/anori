import { TabList, type TabListEntry } from "@anori/components/TabList/TabList";
import { Badge } from "@anori/design-system/components/Badge/Badge";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";
import { clusterDeviceTabs, computeCollapseAfter, type SyncedDevice } from "../synced-tabs";

const list = css({ display: "flex", flexDirection: "column", gap: "3" });
const deviceSection = css({ display: "flex", flexDirection: "column", gap: "0-5" });
const deviceHeader = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  minHeight: "2.25rem",
});
const deviceName = css({
  fontWeight: "medium",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
const deviceBadge = css({ marginLeft: "auto", flexShrink: 0 });

const DeviceSection = ({
  device,
  onOpenAll,
  collapsible,
  collapseAfter,
}: {
  device: SyncedDevice;
  onOpenAll: (urls: string[]) => void;
  collapsible: boolean;
  collapseAfter: number;
}) => {
  const { t } = useTranslation();

  const entries = useMemo<TabListEntry[]>(
    () =>
      clusterDeviceTabs(device.tabs).map((item, index): TabListEntry => {
        if (item.type === "group") {
          return {
            type: "group",
            id: `group-${item.groupId}`,
            name: item.name || t("tabs-plugin.syncedTabs.unnamedGroup"),
            color: item.color,
            tabs: item.tabs.map((tab, tabIndex) => ({
              id: `${index}-${tabIndex}-${tab.url}`,
              url: tab.url,
              title: tab.title || tab.url,
              href: tab.url,
            })),
            onOpenAll: () => onOpenAll(item.tabs.map((tab) => tab.url)),
          };
        }
        return {
          type: "tab",
          id: `${index}-${item.tab.url}`,
          url: item.tab.url,
          title: item.tab.title || item.tab.url,
          href: item.tab.url,
        };
      }),
    [device.tabs, onOpenAll, t],
  );

  return (
    <div className={deviceSection}>
      <div className={deviceHeader}>
        <span className={deviceName}>{device.name}</span>
        <Badge className={deviceBadge}>{t("tabs-plugin.stash.tabCount", { count: device.tabs.length })}</Badge>
      </div>
      <TabList entries={entries} collapsible={collapsible} collapseAfter={collapseAfter} />
    </div>
  );
};

export const SyncedDeviceList = ({
  devices,
  onOpenAll,
  heightBoxes,
}: {
  devices: SyncedDevice[];
  onOpenAll: (urls: string[]) => void;
  heightBoxes: number;
}) => {
  const collapsible = devices.length > 1;
  const collapseAfter = computeCollapseAfter(heightBoxes, devices.length);
  return (
    <div className={list}>
      {devices.map((device) => (
        <DeviceSection
          key={device.deviceId}
          device={device}
          onOpenAll={onOpenAll}
          collapsible={collapsible}
          collapseAfter={collapseAfter}
        />
      ))}
    </div>
  );
};
