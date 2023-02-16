import { AnoriPlugin } from "@utils/user-data/types";
import { bookmarkPlugin } from "./bookmark/bookmark-plugin";
import { datetimePlugin } from "./datetime/datetime-plugin";
import { searchPlugin } from "./search/search-plugin";
import { recentlyClosedPlugin } from "./recently-closed/recently-closed-plugin";
import { systemStatusPlugin } from "./system-status/system-status-plugin";
import { calendarPlugin } from "./calendar/calendar-plugin";
import { weatherPlugin } from "./weather/weather-plugin";
import { notesPlugin } from "./notes/notes-plugin";
import { tasksPlugin } from "./tasks/tasks-plugin";


export const availablePlugins: AnoriPlugin[] = [
    bookmarkPlugin,
    datetimePlugin,
    notesPlugin,
    tasksPlugin,
    searchPlugin,
    calendarPlugin,
    recentlyClosedPlugin,
    systemStatusPlugin,
    
    // Not finished yet
    // weatherPlugin,
];

export const availablePluginsWithWidgets = availablePlugins.filter(p => p.widgets.length > 0);