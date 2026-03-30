import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { expandableWidgetDescriptor, widgetDescriptor } from "./widgets/descriptors";

export const mathPlugin = definePlugin({
  id: "math-plugin",
  get name() {
    return translate("math-plugin.name");
  },
  icon: builtinIcons.calculator,
  configurationScreen: null,
})
  .withWidgets(widgetDescriptor, expandableWidgetDescriptor)
  .build();
