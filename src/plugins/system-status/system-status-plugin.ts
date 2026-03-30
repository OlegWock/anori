import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { cpuWidgetDescriptor, ramWidgetDescriptor } from "./widgets/descriptors";

export const systemStatusPlugin = definePlugin({
  id: "system-status-plugin",
  get name() {
    return translate("system-status-plugin.name");
  },
  icon: builtinIcons.speedometer,
  configurationScreen: null,
})
  .withWidgets(cpuWidgetDescriptor, ramWidgetDescriptor)
  .build();
