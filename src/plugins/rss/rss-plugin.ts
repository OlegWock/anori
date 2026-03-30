import { builtinIcons } from "@anori/components/icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { definePlugin } from "@anori/utils/plugins/define";
import { rssScheduledCallback } from "./background";
import { handlers } from "./messaging";
import { rssFeedDescriptor, rssLastestPostDescriptor } from "./widgets/descriptors";

export const rssPlugin = definePlugin({
  id: "rss-plugin",
  get name() {
    return translate("rss-plugin.name");
  },
  icon: builtinIcons.rssIcon,
  configurationScreen: null,
})
  .withWidgets(rssFeedDescriptor, rssLastestPostDescriptor)
  .withOnMessage(handlers)
  .withScheduledCallback({
    intervalInMinutes: 30,
    callback: (self) => rssScheduledCallback(self),
  })
  .build();

export { rssFeedDescriptor, rssLastestPostDescriptor };
