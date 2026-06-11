import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { type ContextOf, definePlugin } from "@anori/utils/plugins/define";
import { plantWebRequestHandler } from "@anori/utils/plugins/dnr";
import { STATUS_CHECK_INTERVAL_MINUTES, updateStatusesForTrackedPages } from "./background";
import { handlers } from "./messaging";
import { bookmarkGroupWidgetDescriptor, bookmarkWidgetDescriptor } from "./widgets/descriptors";

const base = definePlugin({
  id: "bookmark-plugin",
  get name() {
    return translate("bookmark-plugin.name");
  },
  icon: builtinIcons.bookmark,
  widgets: [bookmarkWidgetDescriptor, bookmarkGroupWidgetDescriptor],
});
export type BookmarkContext = ContextOf<typeof base>;
export const bookmarkPlugin = base
  .withMessaging(handlers)
  .withScheduledCallback(STATUS_CHECK_INTERVAL_MINUTES, updateStatusesForTrackedPages)
  .withOnStart(() => {
    plantWebRequestHandler();
  })
  .build();
// Re-export for external consumers (apply-onboarding-preset.ts)
