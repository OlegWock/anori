import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { datetimeWidgetDescriptorM, datetimeWidgetDescriptorS } from "./widgets/descriptors";

export const datetimePlugin = definePlugin({
  id: "datetime-plugin",
  get name() {
    return translate("datetime-plugin.name");
  },
  icon: builtinIcons.clock,
  widgets: [datetimeWidgetDescriptorS, datetimeWidgetDescriptorM],
}).build();

export { datetimeWidgetDescriptorM, datetimeWidgetDescriptorS };
