import type { Page } from "playwright";
import type { TestApiProxy, TestApiState } from "../launch.ts";

export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };

export const fieldControl = (page: Page, fieldLabel: string) =>
  page.locator("label").filter({ hasText: fieldLabel }).first();

export const selectOption = async (page: Page, fieldLabel: string, optionText: string | RegExp) => {
  await fieldControl(page, fieldLabel).locator("button").first().click();
  await page.getByRole("option", { name: optionText }).click();
};

export const pickComboboxOption = async (
  page: Page,
  placeholder: string,
  query: string,
  optionText: string | RegExp,
) => {
  const input = page.getByPlaceholder(placeholder).first();
  await input.click();
  await input.fill(query);
  await page.getByRole("option", { name: optionText }).first().click();
};

export const pickIcon = async (page: Page, query: string, preferredIconId?: string) => {
  const search = page.getByPlaceholder("Search...").last();
  await search.fill(query);
  const results = page.locator("[data-icon]");
  await results.first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  const preferred = preferredIconId ? page.locator(`[data-icon="${preferredIconId}"]`).first() : null;
  if (preferred && (await preferred.isVisible())) {
    await preferred.click({ timeout: 5000 }).catch(() => results.first().click());
  } else {
    await results.first().click();
  }
};

export const openWizard = async (page: Page, name: string) => {
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByPlaceholder("Search...").first().fill(name);
  await page.getByLabel(name, { exact: true }).click();
};

export const addWidget = async (
  page: Page,
  api: TestApiProxy,
  name: string,
  widgetId: string,
  known: Set<string>,
  configure?: (page: Page) => Promise<void>,
) => {
  await openWizard(page, name);
  if (configure) {
    await configure(page);
    await page.getByRole("button", { name: "Save" }).click();
  }
  await page.waitForTimeout(400);
  const state = await api.getState();
  const widget = state.widgets.find((w) => w.widgetId === widgetId && !known.has(w.instanceId));
  if (!widget) throw new Error(`no new instance of ${widgetId}`);
  known.add(widget.instanceId);
  return widget.instanceId;
};

export const resizeTo = async (page: Page, api: TestApiProxy, instanceId: string, size: Size, attempt = 0) => {
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

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const findFreePosition = (state: TestApiState, size: Size, reserved: Rect[], ignore: string) => {
  const occupied = [...state.widgets.filter((w) => w.instanceId !== ignore), ...reserved];
  for (let y = 0; y + size.height <= state.grid.rows; y++) {
    for (let x = 0; x + size.width <= state.grid.columns; x++) {
      const candidate = { x, y, ...size };
      if (!occupied.some((o) => overlaps(candidate, o))) return { x, y };
    }
  }
  throw new Error(`no free ${size.width}x${size.height} slot`);
};

export const placeAt = async (page: Page, api: TestApiProxy, instanceId: string, target: Rect) => {
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

export const enterEditMode = async (page: Page) => {
  await page.getByRole("button", { name: "Edit folder" }).click();
  await page.waitForTimeout(300);
};

export const finishEditing = async (page: Page) => {
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.waitForTimeout(600);
};

export const createFolder = async (page: Page, name: string, icon?: { query: string; id: string }) => {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Folders" }).click();
  await page.getByRole("button", { name: "New folder" }).click();
  const input = page.locator("[data-folder-name-input]").last();
  await input.fill(name);
  await input.press("Enter");
  await page.waitForTimeout(300);
  if (icon) {
    await page.getByRole("button", { name: "Change icon" }).last().click();
    await pickIcon(page, icon.query, icon.id);
    await page.waitForTimeout(300);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
};

export const openFolder = async (page: Page, name: string) => {
  await page.getByRole("button", { name, exact: true }).first().click();
  await page.waitForTimeout(700);
};
