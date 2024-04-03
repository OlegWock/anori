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
import { rssPlugin } from "./rss/rss-plugin";
import { testPlugin } from "./test/test-plugin";
import { iframePlugin } from "./iframe/iframe-plugin";
import { mathPlugin } from "./math/math-plugin";
import { labelPlugin } from "./label/label-plugin";

const unavailableInFirefox: AnoriPlugin<any, any>[] = [
    systemStatusPlugin,
];

const unavailableInSafari: AnoriPlugin<any, any>[] = [
    systemStatusPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
    iframePlugin,
];

export const availablePlugins: AnoriPlugin<any, any>[] = [
    bookmarkPlugin,
    iframePlugin,
    datetimePlugin,
    rssPlugin,
    notesPlugin,
    tasksPlugin,
    mathPlugin,
    searchPlugin,
    weatherPlugin,
    calendarPlugin,
    recentlyClosedPlugin,
    topSitesPlugin,
    systemStatusPlugin,
    labelPlugin,
].filter(plugin => {
    if (X_BROWSER === 'firefox') {
        return !unavailableInFirefox.includes(plugin);
    }
    
    if (X_BROWSER === 'safari') {
        return !unavailableInSafari.includes(plugin);
    }
    
    return true;
});

if (X_MODE === 'development') {
    availablePlugins.unshift(testPlugin);
}

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);