import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { definePlugin } from "@anori/utils/plugins/define";
import { expandableWidgetDescriptor, resizableWidgetDescriptor } from "./widgets/descriptors";

export const testPlugin = definePlugin({
  id: "test-plugin",
  get name() {
    return "Test plugin";
  },
  icon: builtinIcons.plugin,
  configurationScreen: null,
})
  .withWidgets(expandableWidgetDescriptor, resizableWidgetDescriptor)
  .build();
