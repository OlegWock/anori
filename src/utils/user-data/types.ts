import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import type { GridItem } from "@anori/utils/grid/types";
import type { SomePlugin, SomeWidget } from "@anori/utils/plugins/types";
import type { ID, Mapping } from "@anori/utils/types";

export type Folder = {
  id: ID;
  name: string;
  icon: string;
};

export type FolderDetailsInStorage = {
  widgets: WidgetInFolder[];
};

// A widget instance as stored in a folder. `configuration` is the persisted JSON object; its concrete
// shape lives inside the owning widget, so consumers get the opaque `Mapping` and narrow at the point of use.
export type WidgetInFolder = {
  pluginId: string;
  widgetId: string;
  instanceId: ID;
  configuration: Mapping;
} & GridItem;

export type WidgetInFolderWithMeta = WidgetInFolder & {
  plugin: SomePlugin;
  widget: SomeWidget;
};

export const homeFolder = {
  id: "home",
  get name() {
    return translate("home");
  },
  icon: builtinIcons.home,
} satisfies Folder;
