import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { updateAllWidgets } from "./background";
import { handlers } from "./messaging";
import { blueprintWidgetDescriptor } from "./widgets/descriptors";

export const blueprintPlugin = definePlugin({
  id: "pluginname-plugin",
  get name() {
    return translate("blueprint-plugin.name");
  },
  icon: builtinIcons.plugin,
  configurationScreen: null,
})
  .withWidgets(blueprintWidgetDescriptor)
  .withOnMessage(handlers)
  .withScheduledCallback({
    intervalInMinutes: 15,
    callback: (self) => updateAllWidgets(self),
  })
  .build();
