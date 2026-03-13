import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { notesWidgetDescriptor } from "./widgets/descriptors";

export const notesPlugin = definePlugin({
  id: "notes-plugin",
  get name() {
    return translate("notes-plugin.name");
  },
  icon: builtinIcons.pencil,
  configurationScreen: null,
})
  .withWidgets(notesWidgetDescriptor)
  .build();

export { notesWidgetDescriptor };
