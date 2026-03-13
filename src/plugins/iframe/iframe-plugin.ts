import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { plantWebRequestHandler } from "@anori/utils/plugins/dnr";
import { widgetDescriptor, widgetDescriptorExpandable } from "./widgets/descriptors";

export const iframePlugin = definePlugin({
  id: "iframe-plugin",
  get name() {
    return translate("iframe-plugin.name");
  },
  icon: builtinIcons.pip,
  configurationScreen: null,
})
  .withWidgets(widgetDescriptor, widgetDescriptorExpandable)
  .withOnStart(() => {
    plantWebRequestHandler();
  })
  .build();
