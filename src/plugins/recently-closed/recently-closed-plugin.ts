import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { widgetDescriptor } from "./widgets/descriptors";

export const recentlyClosedPlugin = definePlugin({
  id: "recently-closed-plugin",
  get name() {
    return translate("recently-closed-plugin.name");
  },
  icon: builtinIcons.tabsFill,
  configurationScreen: null,
})
  .withWidgets(widgetDescriptor)
  .build();
