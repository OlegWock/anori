import { RequirePermissions } from "@anori/design-system/components/RequirePermissions/RequirePermissions";
import { translate } from "@anori/translations/utils";
import { defineWidget } from "@anori/utils/plugins/define";
import type { EmptyObject } from "@anori/utils/types";
import { type StashWidgetConfig, stashWidgetConfigSchema } from "../types";
import { RecentlyClosedWidget } from "./RecentlyClosedWidget";
import { StashWidget } from "./StashWidget";
import { StashWidgetMock } from "./StashWidgetMock";
import { SyncedTabsWidget, SyncedTabsWidgetMock } from "./SyncedTabsWidget";

export const stashWidgetDescriptor = defineWidget<"stash-widget", StashWidgetConfig>({
  id: "stash-widget",
  get name() {
    return translate("tabs-plugin.stash.title");
  },
  schema: stashWidgetConfigSchema,
  configurationScreen: null,
  mainScreen: StashWidget,
  mock: StashWidgetMock,
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
      max: { width: 5 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
});

export const widgetDescriptor = defineWidget<"recently-closed-widget", EmptyObject>({
  id: "recently-closed-widget",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  // config-less widget — no schema (decode/encode pass through)
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
      max: { width: 5, height: 6 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
  configurationScreen: null,
  mainScreen: (props) => (
    <RequirePermissions permissions={["sessions", "tabs"]}>
      <RecentlyClosedWidget {...props} />
    </RequirePermissions>
  ),
  mock: () => <RecentlyClosedWidget config={{}} instanceId="mock" />,
});

export const syncedTabsWidgetDescriptor = defineWidget<"synced-tabs-widget", EmptyObject>({
  id: "synced-tabs-widget",
  get name() {
    return translate("tabs-plugin.syncedTabs.title");
  },
  configurationScreen: null,
  mainScreen: SyncedTabsWidget,
  mock: SyncedTabsWidgetMock,
  appearance: {
    resizable: {
      min: { width: 2, height: 2 },
      max: { width: 5, height: 6 },
    },
    size: {
      width: 2,
      height: 2,
    },
  },
});
