import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { expandableWidgetDescriptor, widgetDescriptor } from "./widgets/descriptors";

export const mathPlugin = definePlugin({
  id: "math-plugin",
  get name() {
    return translate("math-plugin.name");
  },
  icon: builtinIcons.calculator,
  widgets: [widgetDescriptor, expandableWidgetDescriptor],
}).build();
