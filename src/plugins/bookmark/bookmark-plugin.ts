import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { plantWebRequestHandler } from "@anori/utils/plugins/dnr";
import { STATUS_CHECK_INTERVAL_MINUTES, updateStatusesForTrackedPages } from "./background";
import { handlers } from "./messaging";
import { bookmarkGroupWidgetDescriptor, bookmarkWidgetDescriptor } from "./widgets/descriptors";

export const bookmarkPlugin = definePlugin({
  id: "bookmark-plugin",
  get name() {
    return translate("bookmark-plugin.name");
  },
  icon: builtinIcons.bookmark,
  configurationScreen: null,
})
  .withWidgets(bookmarkWidgetDescriptor, bookmarkGroupWidgetDescriptor)
  .withOnMessage(handlers)
  .withScheduledCallback({
    intervalInMinutes: STATUS_CHECK_INTERVAL_MINUTES,
    callback: (self) => updateStatusesForTrackedPages(self),
  })
  .withOnStart(() => {
    plantWebRequestHandler();
  })
  .build();

// Re-export for external consumers (apply-onboarding-preset.ts)
export { bookmarkGroupWidgetDescriptor, bookmarkWidgetDescriptor };
