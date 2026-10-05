import type { AnoriHarness } from "../launch.ts";

export const run = async ({ openNewTab, screenshot, testApi }: AnoriHarness) => {
  const page = await openNewTab();
  const api = testApi(page);

  await page.getByRole("button", { name: "Edit folder" }).click();
  await page.getByRole("button", { name: "Add widget" }).click();
  await page.getByRole("button", { name: "Date and time - size S" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Done" }).click();

  const state = await api.getState();
  console.log(`widgets in folder "${state.activeFolderId}":`, state.widgets.length);
  await screenshot(page, "add-first-widget");
};
