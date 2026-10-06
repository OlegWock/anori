import type { Page } from "playwright";
import type { AnoriHarness } from "../launch.ts";

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

export const run = async ({ openNewTab, screenshot, testApi }: AnoriHarness) => {
  const page = await openNewTab();
  const api = testApi(page);
  await pause(page, 1500);

  await page.getByRole("button", { name: "Edit folder" }).click();
  await pause(page);

  await page.getByRole("button", { name: "Add widget" }).click();
  await pause(page);
  await page.getByPlaceholder("Search...").pressSequentially("date", { delay: 80 });
  await pause(page);
  await page.getByRole("button", { name: "Date and time - size M" }).click();
  await pause(page);
  await page.getByLabel("Title").pressSequentially("Tokyo", { delay: 80 });
  await pause(page, 600);
  await page.getByRole("button", { name: "Save" }).click();
  await pause(page, 1200);

  await page.getByRole("button", { name: "Add widget" }).click();
  await pause(page);
  await page.getByPlaceholder("Search...").pressSequentially("notes", { delay: 80 });
  await pause(page);
  await page.getByLabel("Notes", { exact: true }).click();
  await pause(page, 1200);

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await pause(page);

  await page.getByPlaceholder("Note title").click();
  await page.getByPlaceholder("Note title").pressSequentially("Harness demo", { delay: 60 });
  await page.getByRole("button", { name: "Note text (markdown supported)" }).click();
  await page
    .getByPlaceholder("Note text (markdown supported)")
    .pressSequentially("Driven by **Playwright** through the harness.", { delay: 40 });
  await pause(page, 800);
  await page.getByPlaceholder("Note title").click();
  await pause(page, 1200);

  await api.setEditMode(true);
  await pause(page, 1200);
  const state = await api.getState();
  await api.setEditMode(false);
  await pause(page);

  await page.getByRole("button", { name: "Settings" }).click();
  await pause(page, 1500);
  await page.keyboard.press("Escape");
  await pause(page);

  const file = await screenshot(page, "demo-tour");
  return {
    screenshot: file,
    widgets: state.widgets.map(({ widgetId, x, y, width, height }) => ({ widgetId, x, y, width, height })),
  };
};
