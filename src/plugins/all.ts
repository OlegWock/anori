import { AnoriPlugin } from "@utils/user-data/types";
import { bookmarkPlugin } from "./bookmark/bookmark-plugin";
import { datetimePlugin } from "./datetime/datetime-plugin";
import { searchPlugin } from "./search/search-plugin";
import { recentlyClosedPlugin } from "./recently-closed/recently-closed-plugin";
import { systemStatusPlugin } from "./system-status/system-status-plugin";
import { calendarPlugin } from "./calendar/calendar-plugin";
import { notesPlugin } from "./notes/notes-plugin";
import { tasksPlugin } from "./tasks/tasks-plugin";
import { topSitesPlugin } from "./top-sites/top-sites-plugin";

const unavailableInFirefox: AnoriPlugin[] = [
    systemStatusPlugin,
];

const unavailableInSafari: AnoriPlugin[] = [
    systemStatusPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
];

export const availablePlugins: AnoriPlugin[] = [
    bookmarkPlugin,
    datetimePlugin,
    notesPlugin,
    tasksPlugin,
    searchPlugin,
    calendarPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
    systemStatusPlugin,
    
    // Not finished yet
    // weatherPlugin,
].filter(plugin => {
    if (X_BROWSER === 'firefox') {
        return !unavailableInFirefox.includes(plugin);
    }
    
    if (X_BROWSER === 'safari') {
        return !unavailableInSafari.includes(plugin);
    }
    
    return true;
});

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);