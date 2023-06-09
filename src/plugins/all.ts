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
import { weatherPlugin } from "./weather/weather-plugin";

const unavailableInFirefox: AnoriPlugin<any, any>[] = [
    systemStatusPlugin,
];

const unavailableInSafari: AnoriPlugin<any, any>[] = [
    systemStatusPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
];

export const availablePlugins: AnoriPlugin<any, any>[] = [
    bookmarkPlugin,
    datetimePlugin,
    notesPlugin,
    tasksPlugin,
    searchPlugin,
    weatherPlugin,
    calendarPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
    systemStatusPlugin,
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