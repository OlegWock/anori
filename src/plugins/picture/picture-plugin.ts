import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { widgetDescriptor } from "./widgets/descriptors";

export const picturePlugin = definePlugin({
  id: "picture-plugin",
  get name() {
    return translate("picture-plugin.name");
  },
  icon: builtinIcons.picture,
  widgets: [widgetDescriptor],
}).build();
