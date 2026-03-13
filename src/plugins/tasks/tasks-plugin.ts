import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { tasksWidgetDescriptor } from "./widgets/descriptors";

export { tasksWidgetDescriptor };

export const tasksPlugin = definePlugin({
  id: "tasks-plugin",
  get name() {
    return translate("tasks-plugin.name");
  },
  icon: builtinIcons.checklist,
  configurationScreen: null,
})
  .withWidgets(tasksWidgetDescriptor)
  .build();
