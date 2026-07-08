import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { widgetDescriptor } from "./widgets/descriptors";

export const tabsPlugin = definePlugin({
  // Previously this plugin contained only Recently closed tabs widget, but later was extended to tabs management
  // But since plugin id is persisted on widget instances it's easier to keep legacy name rather than write a
  // complex migration
  id: "recently-closed-plugin",
  get name() {
    return translate("tabs-plugin.name");
  },
  icon: builtinIcons.tabsFill,
  widgets: [widgetDescriptor],
}).build();
