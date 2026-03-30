import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { widgetDescriptor } from "./widgets/descriptors";

export const ankiPlugin = definePlugin({
  id: "anki-plugin",
  get name() {
    return translate("anki-plugin.name");
  },
  icon: builtinIcons.albums,
  configurationScreen: null,
})
  .withWidgets(widgetDescriptor)
  .build();
