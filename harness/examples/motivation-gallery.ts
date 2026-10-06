import type { Page } from "playwright";
import type { AnoriHarness, TestApiProxy, TestApiState } from "../launch.ts";

type Rect = { x: number; y: number; width: number; height: number };
type Target = Rect & { name: string; widgetId: string; configure?: (page: Page) => Promise<void>; focusText?: string };

const dateOfBirth = async (page: Page) => {
  await page.getByLabel("Date of birth").fill("1997-01-15");
};

const LAYOUT: Target[] = [
  {
    name: "Day counter",
    widgetId: "day-counter",
    x: 0,
    y: 0,
    width: 2,
    height: 1,
    configure: async (p) => {
      await p.getByLabel("Title").fill("Started running");
      await p.getByLabel("Date").fill("2026-07-01");
    },
  },
  {
    name: "Day counter",
    widgetId: "day-counter",
    x: 2,
    y: 0,
    width: 1,
    height: 1,
    configure: async (p) => {
      await p.getByLabel("Title").fill("Vacation");
      await p.getByLabel("Date").fill("2026-12-20");
    },
  },
  {
    name: "Day progress",
    widgetId: "day-progress",
    x: 4,
    y: 0,
    width: 2,
    height: 1,
    configure: async (p) => {
      await p.getByText("Count only part of the day").click();
      await p.getByLabel("From").fill("09:00");
      await p.getByLabel("To").fill("17:00");
    },
  },
  { name: "Week progress", widgetId: "week-progress", x: 6, y: 0, width: 2, height: 1, configure: async () => {} },
  { name: "Age ticker", widgetId: "age-ticker", x: 8, y: 0, width: 2, height: 1, configure: dateOfBirth },
  {
    name: "Focus",
    widgetId: "focus",
    x: 0,
    y: 1,
    width: 3,
    height: 1,
    configure: async (p) => {
      await p.getByLabel("Prompt").fill("One thing I'm grateful for");
      await p.locator("label").filter({ hasText: "Reset" }).locator("button").first().click();
      await p.getByRole("option", { name: "Every week" }).click();
    },
    focusText: "A quiet morning walk before work",
  },
  { name: "Month progress", widgetId: "month-progress", x: 4, y: 1, width: 2, height: 1, configure: async () => {} },
  { name: "Year progress", widgetId: "year-progress", x: 6, y: 1, width: 2, height: 1, configure: async () => {} },
  { name: "Life progress", widgetId: "life-progress", x: 8, y: 1, width: 1, height: 1, configure: dateOfBirth },
  { name: "Age ticker", widgetId: "age-ticker", x: 9, y: 1, width: 1, height: 1, configure: dateOfBirth },
  {
    name: "Focus",
    widgetId: "focus",
    x: 0,
    y: 2,
    width: 2,
    height: 1,
    configure: async () => {},
    focusText: "Finish the quarterly report",
  },
  { name: "Day progress", widgetId: "day-progress", x: 4, y: 2, width: 1, height: 1, configure: async () => {} },
  { name: "Week progress", widgetId: "week-progress", x: 5, y: 2, width: 1, height: 1, configure: async () => {} },
  { name: "Month progress", widgetId: "month-progress", x: 6, y: 2, width: 1, height: 1, configure: async () => {} },
  { name: "Year progress", widgetId: "year-progress", x: 7, y: 2, width: 1, height: 1, configure: async () => {} },
];

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const findFreePosition = (
  state: TestApiState,
  size: { width: number; height: number },
  reserved: Rect[],
  ignore: string,
) => {
  const occupied = [...state.widgets.filter((w) => w.instanceId !== ignore), ...reserved];
  for (let y = 0; y + size.height <= state.grid.rows; y++) {
    for (let x = 0; x + size.width <= state.grid.columns; x++) {
      const candidate = { x, y, ...size };
      if (!occupied.some((o) => overlaps(candidate, o))) return { x, y };
    }
  }
  throw new Error(`no free ${size.width}x${size.height} slot`);
};

const addWidget = async (page: Page, api: TestApiProxy, target: Target, known: Set<string>) => {
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByPlaceholder("Search...").fill(target.name);
  await page.getByLabel(target.name, { exact: true }).click();
  if (target.configure) {
    await target.configure(page);
    await page.getByRole("button", { name: "Save" }).click();
  }
  await page.waitForTimeout(400);
  const state = await api.getState();
  const widget = state.widgets.find((w) => w.widgetId === target.widgetId && !known.has(w.instanceId));
  if (!widget) throw new Error(`no new instance of ${target.widgetId}`);
  known.add(widget.instanceId);
  return widget.instanceId;
};

const resizeTo = async (
  page: Page,
  api: TestApiProxy,
  instanceId: string,
  size: { width: number; height: number },
  attempt = 0,
) => {
  const state = await api.getState();
  const widget = state.widgets.find((w) => w.instanceId === instanceId);
  if (!widget) throw new Error(`no widget ${instanceId}`);
  if (widget.width === size.width && widget.height === size.height) return;
  if (attempt >= 3) throw new Error(`could not resize ${widget.widgetId} to ${size.width}x${size.height}`);
  const card = page.locator(`#WidgetCard-${instanceId}`);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  const handle = await card.getByRole("button", { name: "Resize widget" }).boundingBox();
  if (!handle) throw new Error("resize handle not visible");
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  const step = state.grid.boxSize * 0.92;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + step * (size.width - widget.width), startY + step * (size.height - widget.height), {
    steps: 12,
  });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await resizeTo(page, api, instanceId, size, attempt + 1);
};

const placeAt = async (page: Page, api: TestApiProxy, instanceId: string, target: Rect) => {
  let state = await api.getState();
  const self = state.widgets.find((w) => w.instanceId === instanceId);
  if (!self) throw new Error(`no widget ${instanceId}`);
  if (self.width > target.width || self.height > target.height) {
    await resizeTo(page, api, instanceId, {
      width: Math.min(self.width, target.width),
      height: Math.min(self.height, target.height),
    });
    state = await api.getState();
  }
  for (const blocker of state.widgets.filter((w) => w.instanceId !== instanceId && overlaps(w, target))) {
    const spot = findFreePosition(await api.getState(), blocker, [target], blocker.instanceId);
    await api.moveWidget(blocker.instanceId, spot);
    await page.waitForTimeout(150);
  }
  await api.moveWidget(instanceId, { x: target.x, y: target.y });
  await page.waitForTimeout(250);
  await resizeTo(page, api, instanceId, { width: target.width, height: target.height });
};

const typeFocus = async (page: Page, instanceId: string, text: string) => {
  const card = page.locator(`#WidgetCard-${instanceId}`);
  const input = card.getByPlaceholder("Type and press Enter");
  await input.click();
  await input.pressSequentially(text, { delay: 10 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
};

export const run = async (harness: AnoriHarness) => {
  const page = await harness.openNewTab();
  const api = harness.testApi(page);
  const known = new Set<string>();
  await page.getByRole("button", { name: "Edit folder" }).click();

  for (const target of LAYOUT) {
    const instanceId = await addWidget(page, api, target, known);
    await placeAt(page, api, instanceId, target);
    if (target.focusText) await typeFocus(page, instanceId, target.focusText);
  }

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForTimeout(800);
  const state = await api.getState();
  const screenshot = await harness.screenshot(page, "motivation-gallery");
  return {
    screenshot,
    instances: state.widgets.length,
    layout: state.widgets.map((w) => `${w.widgetId} ${w.width}x${w.height} @${w.x},${w.y}`),
  };
};
