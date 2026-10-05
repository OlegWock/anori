import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type BrowserContext, chromium, type Page, type Worker } from "playwright";
import type { AnoriTestApi } from "../src/utils/test-api.ts";
import { EXT_DIR, PROFILE_DIR, REPO_DIR, SCREENSHOTS_DIR } from "./paths.ts";

export type LaunchOptions = {
  headless?: boolean;
  viewport?: { width: number; height: number };
  colorScheme?: "light" | "dark";
};

export type TestApiProxy = {
  [K in keyof AnoriTestApi]: (...args: Parameters<AnoriTestApi[K]>) => Promise<Awaited<ReturnType<AnoriTestApi[K]>>>;
};

export type AnoriHarness = {
  context: BrowserContext;
  extensionId: string;
  newTabUrl: string;
  pages: Map<number, Page>;
  pageIdOf: (page: Page) => number | undefined;
  lastPage: () => Page | undefined;
  openNewTab: (options?: { pageId?: number }) => Promise<Page>;
  screenshot: (page: Page, name?: string) => Promise<string>;
  testApi: (page: Page) => TestApiProxy;
  currentWorker: () => Worker;
  close: () => Promise<void>;
};

export const ensureBuilt = () => {
  if (!existsSync(join(EXT_DIR, "manifest.json"))) {
    throw new Error(
      `No build at ${EXT_DIR}. Run \`pnpm build:harness\` first (or start \`pnpm harness\`, which builds).`,
    );
  }
};

const ensureChromium = () => {
  try {
    const executable = chromium.executablePath();
    if (executable && existsSync(executable)) return;
  } catch {}
  console.error("Playwright Chromium not found, installing (one-time download)...");
  execSync("pnpm exec playwright install chromium", { cwd: REPO_DIR, stdio: "inherit" });
};

const dropScriptCaches = (profile: string) => {
  for (const cache of ["Code Cache", "Extension Scripts", "Extension State"]) {
    rmSync(join(profile, "Default", cache), { recursive: true, force: true });
  }
};

export const resetProfile = () => rmSync(PROFILE_DIR, { recursive: true, force: true });

const seedPreferences = (profile: string) => {
  const dir = join(profile, "Default");
  const file = join(dir, "Preferences");
  mkdirSync(dir, { recursive: true });
  const prefs = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>) : {};
  const newTabPage = (prefs.NewTabPage ?? {}) as Record<string, unknown>;
  newTabPage.FooterVisible = false;
  prefs.NewTabPage = newTabPage;
  writeFileSync(file, JSON.stringify(prefs));
};

export const screenshotPath = (name?: string) => {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(SCREENSHOTS_DIR, `${name ?? "newtab"}-${stamp}.png`);
};

const createTestApiProxy = (page: Page): TestApiProxy =>
  new Proxy({} as TestApiProxy, {
    get:
      (_target, method: string) =>
      (...args: unknown[]) =>
        page.evaluate(
          async ([method, args]) => {
            const api = window.__anoriTestApi;
            if (!api)
              throw new Error("window.__anoriTestApi is missing: is this a development build of the newtab page?");
            const fn = api[method as keyof typeof api] as (...a: unknown[]) => unknown;
            if (typeof fn !== "function") throw new Error(`Test API has no method "${method}"`);
            return await fn(...args);
          },
          [method, args] as const,
        ),
  });

export const launchAnori = async (options: LaunchOptions = {}): Promise<AnoriHarness> => {
  const { headless = true, viewport = { width: 1920, height: 1080 }, colorScheme = "dark" } = options;
  ensureBuilt();
  ensureChromium();
  mkdirSync(PROFILE_DIR, { recursive: true });
  dropScriptCaches(PROFILE_DIR);
  seedPreferences(PROFILE_DIR);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chromium",
    headless,
    viewport,
    colorScheme,
    args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  });

  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 15000 }));
  const extensionId = new URL(worker.url()).host;
  const newTabUrl = `chrome-extension://${extensionId}/pages/newtab/start.html`;

  const pages = new Map<number, Page>();
  let nextPageId = 1;
  const pageIdOf = (page: Page) => [...pages.entries()].find(([, p]) => p === page)?.[0];
  const lastPage = () => [...pages.values()].at(-1);

  const openNewTab = async (options: { pageId?: number } = {}) => {
    const page = await context.newPage();
    const pageId = options.pageId ?? nextPageId;
    nextPageId = Math.max(nextPageId, pageId + 1);
    pages.set(pageId, page);
    page.once("close", () => {
      if (pages.get(pageId) === page) pages.delete(pageId);
    });
    page.on("console", (msg) => {
      const type = msg.type();
      if (type === "error" || type === "warning") console.error(`[page:${type}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => console.error(`[pageerror] ${err.message}`));
    await page.goto(newTabUrl);
    await page.waitForLoadState("networkidle");
    return page;
  };

  const screenshot = async (page: Page, name?: string) => {
    const file = screenshotPath(name);
    await page.screenshot({ path: file });
    return file;
  };

  const currentWorker = () => {
    const running = context.serviceWorkers().at(-1);
    if (!running) throw new Error("the extension has no running service worker");
    return running;
  };

  return {
    context,
    extensionId,
    newTabUrl,
    pages,
    pageIdOf,
    lastPage,
    openNewTab,
    screenshot,
    testApi: createTestApiProxy,
    currentWorker,
    close: () => context.close(),
  };
};
