import { builtinIcons } from "@anori/design-system/components/Icon/builtin-icons";
import { translate } from "@anori/translations/utils";
import { type ContextOf, definePlugin } from "@anori/utils/plugins/define";
import { rssScheduledCallback } from "./background";
import { handlers } from "./messaging";
import { rssFeedDescriptor, rssLastestPostDescriptor } from "./widgets/descriptors";

const base = definePlugin({
  id: "rss-plugin",
  get name() {
    return translate("rss-plugin.name");
  },
  icon: builtinIcons.rssIcon,
  widgets: [rssFeedDescriptor, rssLastestPostDescriptor],
});

export type RssContext = ContextOf<typeof base>;

export const rssPlugin = base.withMessaging(handlers).withScheduledCallback(30, rssScheduledCallback).build();

export { rssFeedDescriptor, rssLastestPostDescriptor };
