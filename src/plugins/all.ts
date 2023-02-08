import { AodakePlugin } from "@utils/user-data/types";
import { bookmarkPlugin } from "./bookmark/bookmark-plugin";
import { datetimePlugin } from "./datetime/datetime-plugin";
import { searchPlugin } from "./search/search-plugin";
import { recentlyClosedPlugin } from "./recently-closed/recently-closed-plugin";
import { systemStatusPlugin } from "./system-status/system-status-plugin";


export const availablePlugins: AodakePlugin[] = [
    bookmarkPlugin,
    datetimePlugin,
    searchPlugin,
    recentlyClosedPlugin,
    systemStatusPlugin,
];

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);