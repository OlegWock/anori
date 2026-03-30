import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { topSitesWidgetDescriptorHorizontal, topSitesWidgetDescriptorVertical } from "./widgets/descriptors";

export { topSitesWidgetDescriptorHorizontal, topSitesWidgetDescriptorVertical };

export const topSitesPlugin = definePlugin({
  id: "top-sites-plugin",
  get name() {
    return translate("top-sites-plugin.name");
  },
  icon: builtinIcons.listOl,
  configurationScreen: null,
})
  .withWidgets(topSitesWidgetDescriptorHorizontal, topSitesWidgetDescriptorVertical)
  .build();
