import type { AnoriHarness } from "./launch.ts";

type ManagementPage = { chrome: { management: { setEnabled: (id: string, enabled: boolean) => Promise<void> } } };

export const reloadExtension = async (harness: AnoriHarness, timeoutMs = 30_000) => {
  const openPageIds = [...harness.pages.keys()];
  const extensionsPage = await harness.context.newPage();
  const setEnabled = (enabled: boolean) =>
    extensionsPage.evaluate(
      ([id, enabled]) => (globalThis as unknown as ManagementPage).chrome.management.setEnabled(id, enabled),
      [harness.extensionId, enabled] as const,
    );

  try {
    await extensionsPage.goto("chrome://extensions/", { waitUntil: "load" });
    const newWorker = harness.context.waitForEvent("serviceworker", { timeout: timeoutMs });
    await setEnabled(false);
    await setEnabled(true);
    await newWorker;
  } finally {
    await extensionsPage.close();
  }

  for (const pageId of openPageIds) {
    const page = harness.pages.get(pageId);
    if (page && !page.isClosed()) {
      await page.reload({ waitUntil: "load" }).catch(() => undefined);
    } else {
      await harness.openNewTab({ pageId });
    }
  }
  return { pageIds: openPageIds };
};
