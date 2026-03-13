import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { datetimeWidgetDescriptorM, datetimeWidgetDescriptorS } from "./widgets/descriptors";

export const datetimePlugin = definePlugin({
  id: "datetime-plugin",
  get name() {
    return translate("datetime-plugin.name");
  },
  icon: builtinIcons.clock,
  configurationScreen: null,
})
  .withWidgets(datetimeWidgetDescriptorS, datetimeWidgetDescriptorM)
  .build();

export { datetimeWidgetDescriptorS, datetimeWidgetDescriptorM };
