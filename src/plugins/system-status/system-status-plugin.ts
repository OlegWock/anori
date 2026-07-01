import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { cpuWidgetDescriptor, ramWidgetDescriptor } from "./widgets/descriptors";

export const systemStatusPlugin = definePlugin({
  id: "system-status-plugin",
  get name() {
    return translate("system-status-plugin.name");
  },
  icon: builtinIcons.speedometer,
  widgets: [cpuWidgetDescriptor, ramWidgetDescriptor],
}).build();
