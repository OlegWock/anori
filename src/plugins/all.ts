import { AodakePlugin } from "@utils/user-data/types";
import { bookmarkPlugin } from "./bookmark/bookmark-plugin";


export const availablePlugins: AodakePlugin[] = [
    bookmarkPlugin,
];

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);