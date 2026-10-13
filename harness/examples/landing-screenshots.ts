import { join } from "node:path";
import type { AnoriHarness } from "../launch.ts";
import { captureBrowserWindow } from "../native.ts";
import { SCREENSHOTS_DIR } from "../paths.ts";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const run = async (harness: AnoriHarness) => {
  const { context } = harness;
  const page = await context.newPage();
  await page.goto("chrome://newtab/");
  await page.waitForLoadState("networkidle");
  for (const other of context.pages()) {
    if (other !== page) await other.close();
  }
  await page.bringToFront();

  const api = harness.testApi(page);
  const original = await page.evaluate(() => window.__anoriTestApi?.getState().activeFolderId);
  const themes = await api.listThemes();
  const files: string[] = [];
  for (const theme of themes) {
    await api.setTheme(theme);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(2500);
    files.push(captureBrowserWindow(join(SCREENSHOTS_DIR, "landing", `${slug(theme)}.png`)));
  }
  await api.setTheme(themes[0]);
  return { activeFolder: original, files };
};
