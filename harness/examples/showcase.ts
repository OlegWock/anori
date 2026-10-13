import type { Page } from "playwright";
import type { AnoriHarness, TestApiProxy } from "../launch.ts";
import {
  addWidget,
  createFolder,
  enterEditMode,
  fieldControl,
  finishEditing,
  openFolder,
  pickComboboxOption,
  pickIcon,
  placeAt,
  type Rect,
} from "./helpers.ts";

type Entry = Rect & {
  name: string;
  widgetId: string;
  configure?: (page: Page) => Promise<void>;
  afterAdd?: (page: Page, instanceId: string, api: TestApiProxy) => Promise<void>;
};

const bookmark = (title: string, url: string, icon: { query: string; id: string }) => async (page: Page) => {
  await fieldControl(page, "Icon").locator("button").click();
  await pickIcon(page, icon.query, icon.id);
  await page.waitForTimeout(200);
  await fieldControl(page, "Title").locator("input").fill(title);
  await fieldControl(page, "URL").locator("input").fill(url);
};

const bookmarkGroup = (title: string, icon: { query: string; id?: string }, urls: string[]) => async (page: Page) => {
  await fieldControl(page, "Icon").locator("button").click();
  await pickIcon(page, icon.query, icon.id);
  await page.waitForTimeout(200);
  await fieldControl(page, "Title").locator("input").fill(title);
  for (let i = 1; i < urls.length; i++) await page.getByRole("button", { name: "Add page" }).click();
  const inputs = fieldControl(page, "Pages").locator("input");
  for (let i = 0; i < urls.length; i++) await inputs.nth(i).fill(urls[i]);
};

const typeTasks = (tasks: string[]) => async (page: Page, instanceId: string) => {
  const card = page.locator(`#WidgetCard-${instanceId}`);
  for (let i = 0; i < tasks.length; i++) {
    if (i === 0) await card.getByRole("button", { name: "Add" }).click();
    const input = card.getByPlaceholder("Task description...").last();
    await input.fill(tasks[i]);
    if (i < tasks.length - 1) await input.press("Enter");
  }
  await page.mouse.click(5, 500);
  await page.waitForTimeout(200);
};

const typeNote = (title: string, body: string) => async (page: Page, instanceId: string) => {
  const card = page.locator(`#WidgetCard-${instanceId}`);
  await card.getByPlaceholder("Note title").fill(title);
  await card.getByRole("button", { name: "Note text (markdown supported)" }).click();
  await card.getByPlaceholder("Note text (markdown supported)").fill(body);
  await page.mouse.click(5, 500);
  await page.waitForTimeout(200);
};

const typeFocus = (text: string) => async (page: Page, instanceId: string) => {
  const card = page.locator(`#WidgetCard-${instanceId}`);
  const input = card.getByPlaceholder("Type and press Enter");
  await input.fill(text);
  await input.press("Enter");
  await page.waitForTimeout(200);
};

const stashLinks =
  (links: { url: string; title: string }[]) => async (_page: Page, _instanceId: string, api: TestApiProxy) => {
    await api.stashLinks(links);
  };

const clock = (title: string, query: string, tz: string) => async (p: Page) => {
  await fieldControl(p, "Title").locator("input").fill(title);
  await pickComboboxOption(p, "Start typing to search", query, tz);
};

const HOME: Entry[] = [
  {
    name: "Bookmark group",
    widgetId: "bookmark-group",
    x: 0,
    y: 0,
    width: 2,
    height: 1,
    configure: bookmarkGroup("Open morning tabs", { query: "wi:day-sunny", id: "wi:day-sunny" }, [
      "https://mail.google.com",
      "https://calendar.google.com",
      "https://github.com/notifications",
      "https://news.ycombinator.com",
    ]),
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 2,
    y: 0,
    width: 1,
    height: 1,
    configure: bookmark("GitHub", "https://github.com", { query: "logos:github-icon", id: "logos:github-icon" }),
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 3,
    y: 0,
    width: 1,
    height: 1,
    configure: bookmark("Notion", "https://www.notion.so", { query: "logos:notion-icon", id: "logos:notion-icon" }),
  },
  {
    name: "Tasks",
    widgetId: "tasks-widget",
    x: 4,
    y: 0,
    width: 2,
    height: 2,
    configure: async (p) => {
      await fieldControl(p, "Title").locator("input").fill("Today");
    },
    afterAdd: typeTasks(["Water the plants", "Book dentist appointment", "Reply to Ana about the hike"]),
  },
  {
    name: "Date and time - size M",
    widgetId: "datetime-widget-m",
    x: 6,
    y: 0,
    width: 2,
    height: 2,
    configure: async (p) => {
      await clock("Warsaw", "Warsaw", "Europe/Warsaw")(p);
      await fieldControl(p, "Time format").locator("button").first().click();
      await p
        .getByRole("option", { name: /^\d{2}:\d{2} \(24 hours\)$/ })
        .first()
        .click();
    },
  },
  {
    name: "Current weather",
    widgetId: "weather-current",
    x: 8,
    y: 0,
    width: 2,
    height: 1,
    configure: async (p) => {
      await pickComboboxOption(p, "Select city", "Warsaw", /Warsaw/);
    },
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 0,
    y: 1,
    width: 2,
    height: 1,
    configure: bookmark("Google Maps", "https://maps.google.com", {
      query: "logos:google-maps",
      id: "logos:google-maps",
    }),
  },
  {
    name: "Day counter",
    widgetId: "day-counter",
    x: 2,
    y: 1,
    width: 1,
    height: 1,
    configure: async (p) => {
      await p.getByLabel("Title").fill("Vacation");
      await p.getByLabel("Date").fill("2026-12-20");
    },
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 9,
    y: 2,
    width: 1,
    height: 1,
    configure: bookmark("Reddit", "https://www.reddit.com", { query: "logos:reddit-icon", id: "logos:reddit-icon" }),
  },
  {
    name: "Date and time - size S",
    widgetId: "datetime-widget",
    x: 8,
    y: 1,
    width: 1,
    height: 1,
    configure: clock("Tokyo", "Tokyo", "Asia/Tokyo"),
  },
  {
    name: "Date and time - size S",
    widgetId: "datetime-widget",
    x: 9,
    y: 1,
    width: 1,
    height: 1,
    configure: clock("New York", "New_York", "America/New York"),
  },
  {
    name: "Tab stash",
    widgetId: "stash-widget",
    x: 0,
    y: 2,
    width: 3,
    height: 3,
    afterAdd: stashLinks([
      {
        url: "https://www.seriouseats.com/the-best-slow-cooked-tomato-sauce-recipe",
        title: "The Best Slow-Cooked Tomato Sauce Recipe",
      },
      { url: "https://en.wikipedia.org/wiki/Fermat%27s_Last_Theorem", title: "Fermat's Last Theorem - Wikipedia" },
      {
        url: "https://www.rei.com/learn/expert-advice/backpacking-beginners.html",
        title: "Backpacking for Beginners | REI Expert Advice",
      },
      {
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up (Official Video)",
      },
      { url: "https://www.lonelyplanet.com/portugal/lisbon", title: "Lisbon travel guide - Lonely Planet" },
    ]),
  },
  { name: "Year progress", widgetId: "year-progress", x: 3, y: 2, width: 1, height: 1, configure: async () => {} },
  { name: "Calendar", widgetId: "calendar-m", x: 4, y: 2, width: 2, height: 2, configure: async () => {} },
  {
    name: "Notes",
    widgetId: "notes-widget",
    x: 6,
    y: 2,
    width: 3,
    height: 2,
    afterAdd: typeNote(
      "Groceries",
      "- Oat milk\n- Tomatoes\n- Coffee beans\n- Something for the cat\n- Birthday card for Tom\n- Olive oil, the good one\n- Bread (sourdough if they have it)",
    ),
  },
  {
    name: "Day counter",
    widgetId: "day-counter",
    x: 3,
    y: 1,
    width: 1,
    height: 1,
    configure: async (p) => {
      await p.getByLabel("Title").fill("Running");
      await p.getByLabel("Date").fill("2026-07-01");
    },
  },
  { name: "Calculator — expandable", widgetId: "calc-widget-expandable", x: 3, y: 3, width: 1, height: 1 },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 9,
    y: 3,
    width: 1,
    height: 1,
    configure: bookmark("Netflix", "https://www.netflix.com", {
      query: "logos:netflix-icon",
      id: "logos:netflix-icon",
    }),
  },
  { name: "Day progress", widgetId: "day-progress", x: 3, y: 4, width: 1, height: 1, configure: async () => {} },
  {
    name: "Focus",
    widgetId: "focus",
    x: 4,
    y: 4,
    width: 2,
    height: 1,
    configure: async () => {},
    afterAdd: typeFocus("Finish the cover letter"),
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 6,
    y: 4,
    width: 2,
    height: 1,
    configure: bookmark("Hacker News", "https://news.ycombinator.com", {
      query: "selfhst:hacker-news",
      id: "selfhst:hacker-news",
    }),
  },
  {
    name: "Bookmark",
    widgetId: "bookmark",
    x: 8,
    y: 4,
    width: 2,
    height: 1,
    configure: bookmark("Spotify", "https://open.spotify.com", {
      query: "logos:spotify-icon",
      id: "logos:spotify-icon",
    }),
  },
];

const buildFolder = async (page: Page, api: TestApiProxy, entries: Entry[]) => {
  const known = new Set<string>();
  await enterEditMode(page);
  for (const entry of entries) {
    const instanceId = await addWidget(page, api, entry.name, entry.widgetId, known, entry.configure);
    await placeAt(page, api, instanceId, entry);
  }
  await finishEditing(page);
  for (const entry of entries) {
    if (!entry.afterAdd) continue;
    const state = await api.getState();
    const widget = state.widgets.find((w) => w.x === entry.x && w.y === entry.y);
    if (widget) await entry.afterAdd(page, widget.instanceId, api);
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(6000);
};

export const run = async (harness: AnoriHarness) => {
  const page = await harness.openNewTab();
  const api = harness.testApi(page);

  await createFolder(page, "Work", { query: "solar:checklist-bold", id: "solar:checklist-bold" });
  await createFolder(page, "Weekend", { query: "ion:compass", id: "ion:compass" });
  await openFolder(page, "Home");
  await buildFolder(page, api, HOME);
  const home = await harness.screenshot(page, "showcase-home");
  return { home };
};
