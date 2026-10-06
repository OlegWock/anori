import type { Page } from "playwright";
import type { AnoriHarness, TestApiProxy } from "../launch.ts";

const addWidget = async (page: Page, name: string, configure?: (page: Page) => Promise<void>) => {
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByPlaceholder("Search...").fill(name);
  await page.getByLabel(name, { exact: true }).click();
  if (configure) {
    await configure(page);
    await page.getByRole("button", { name: "Save" }).click();
  }
  await page.waitForTimeout(400);
};

const resizeWidget = async (page: Page, api: TestApiProxy, widgetId: string, width: number, height: number) => {
  const state = await api.getState();
  const widget = state.widgets.find((w) => w.widgetId === widgetId);
  if (!widget) throw new Error(`no widget ${widgetId}`);
  const card = page.locator(`#WidgetCard-${widget.instanceId}`);
  await card.hover();
  const handle = await card.getByRole("button", { name: "Resize widget" }).boundingBox();
  if (!handle) throw new Error("resize handle not visible");
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  const step = state.grid.boxSize;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + step * (width - widget.width), startY + step * (height - widget.height), {
    steps: 12,
  });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(500);
};

export const run = async (harness: AnoriHarness) => {
  const page = await harness.openNewTab();
  const api = harness.testApi(page);
  await page.getByRole("button", { name: "Edit folder" }).click();

  await addWidget(page, "Day progress", async () => {});
  await resizeWidget(page, api, "day-progress", 2, 1);
  await addWidget(page, "Week progress", async () => {});
  await resizeWidget(page, api, "week-progress", 3, 1);
  await addWidget(page, "Age ticker", async (p) => {
    await p.getByLabel("Date of birth").fill("1997-01-15");
  });
  await resizeWidget(page, api, "age-ticker", 2, 1);
  await addWidget(page, "Day counter", async (p) => {
    await p.getByLabel("Title").fill("Vacation");
    await p.getByLabel("Date").fill("2026-12-20");
  });
  await resizeWidget(page, api, "day-counter", 1, 1);
  await addWidget(page, "Month progress", async () => {});
  await resizeWidget(page, api, "month-progress", 2, 1);
  await addWidget(page, "Year progress", async () => {});
  await resizeWidget(page, api, "year-progress", 3, 1);
  await addWidget(page, "Life progress", async (p) => {
    await p.getByLabel("Date of birth").fill("1997-01-15");
  });
  await addWidget(page, "Focus", async () => {});
  await resizeWidget(page, api, "focus", 3, 1);

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForTimeout(800);
  const state = await api.getState();
  const screenshot = await harness.screenshot(page, "motivation-showcase");
  return { screenshot, layout: state.widgets.map((w) => `${w.widgetId} ${w.width}x${w.height} @${w.x},${w.y}`) };
};
