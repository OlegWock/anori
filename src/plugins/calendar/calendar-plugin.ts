import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { widgetDescriptor } from "./widgets/descriptors";

export const calendarPlugin = definePlugin({
  id: "calendar-plugin",
  get name() {
    return translate("calendar-plugin.name");
  },
  icon: builtinIcons.calendar,
  configurationScreen: null,
})
  .withWidgets(widgetDescriptor)
  .build();
