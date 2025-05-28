import type { AnoriPlugin } from "@utils/user-data/types";
import { ankiPlugin } from "./anki/anki-plugin";
import { bookmarkPlugin } from "./bookmark/bookmark-plugin";
import { calendarPlugin } from "./calendar/calendar-plugin";
import { datetimePlugin } from "./datetime/datetime-plugin";
import { iframePlugin } from "./iframe/iframe-plugin";
import { labelPlugin } from "./label/label-plugin";
import { mathPlugin } from "./math/math-plugin";
import { notesPlugin } from "./notes/notes-plugin";
import { picturePlugin } from "./picture/picture-plugin";
import { recentlyClosedPlugin } from "./recently-closed/recently-closed-plugin";
import { rssPlugin } from "./rss/rss-plugin";
import { systemStatusPlugin } from "./system-status/system-status-plugin";
import { tasksPlugin } from "./tasks/tasks-plugin";
import { testPlugin } from "./test/test-plugin";
import { topSitesPlugin } from "./top-sites/top-sites-plugin";
import { weatherPlugin } from "./weather/weather-plugin";

const unavailableInFirefox: AnoriPlugin<any, any>[] = [systemStatusPlugin];

export const availablePlugins: AnoriPlugin<any, any>[] = [
  bookmarkPlugin,
  iframePlugin,
  datetimePlugin,
  rssPlugin,
  notesPlugin,
  tasksPlugin,
  mathPlugin,
  weatherPlugin,
  calendarPlugin,
  recentlyClosedPlugin,
  topSitesPlugin,
  systemStatusPlugin,
  labelPlugin,
  picturePlugin,
  ankiPlugin,
].filter((plugin) => {
  if (X_BROWSER === "firefox") {
    return !unavailableInFirefox.includes(plugin);
  }

  return true;
});

if (X_MODE === "development") {
  availablePlugins.unshift(testPlugin);
}

export const availablePluginsWithWidgets = availablePlugins.filter((p) => p.widgets.length > 0);
