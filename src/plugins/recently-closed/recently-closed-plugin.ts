import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define2";
import { widgetDescriptor } from "./widgets/descriptors";

export const recentlyClosedPlugin = definePlugin({
  id: "recently-closed-plugin",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  icon: builtinIcons.tabsFill,
  widgets: [widgetDescriptor],
}).build();
