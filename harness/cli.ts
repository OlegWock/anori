import { existsSync, mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import { resolve } from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "node:url";
import { type AnoriHarness, ensureBuilt, launchAnori, resetProfile } from "./launch.ts";
import { CONTROL_SOCKET, STATE_DIR } from "./paths.ts";
import { reloadExtension } from "./reload.ts";
import { buildOnce, watchBuild } from "./watch.ts";

const USAGE = `pnpm harness [--headed] [--no-watch] [--fresh]

Builds the development bundle into dist/harness, launches headless Chromium with it, then reads one JSON
command per line from stdin (or from the control socket via \`pnpm harness:send '<json>'\`) and prints one
JSON result per line. With the watcher on, every source change rebuilds and reloads the extension.

Commands (pageId defaults to the most recently opened page):
  {"cmd":"open"}                                        open the new tab page -> {"pageId":n}
  {"cmd":"pages"}                                       list open pages
  {"cmd":"close","pageId":n}
  {"cmd":"eval","pageId":n,"code":"document.title"}     run code inside the page (page.evaluate)
  {"cmd":"run","pageId":n,"code":"await page.getByRole('button',{name:'Edit folder'}).click(); return page.url()"}
                                                        run Playwright code in the harness process; in scope:
                                                        page, api (test API proxy), harness, context
  {"cmd":"api","pageId":n,"method":"getState","args":[]} call window.__anoriTestApi.<method>(...args)
  {"cmd":"script","file":"harness/scratch/x.ts"}        import the file and call its exported run(harness)
  {"cmd":"screenshot","pageId":n,"name":"after-edit"}   -> .harness/screenshots/<name>-<time>.png
  {"cmd":"reload"}                                      reload the extension from disk and reload its pages
  {"cmd":"reset"}                                       close the browser, wipe the profile, relaunch
  {"cmd":"quit"}
`;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const headed = argv.includes("--headed");
const watch = !argv.includes("--no-watch");
if (argv.includes("--fresh")) resetProfile();

const out = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Command = Record<string, unknown> & { cmd?: string };

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

const main = async () => {
  mkdirSync(STATE_DIR, { recursive: true });

  let stopWatching = () => {};
  let reloadNow = async () => {};
  if (watch) {
    const watcher = watchBuild((result) => {
      out({ kind: result.ok ? "built" : "build-failed", summary: result.summary });
      if (result.ok) void reloadNow();
    });
    stopWatching = watcher.stop;
    const first = await watcher.firstBuild;
    if (!first.ok) {
      out({ kind: "build-failed", summary: first.summary });
      stopWatching();
      process.exit(1);
    }
    out({ kind: "built", summary: first.summary });
  } else {
    try {
      ensureBuilt();
    } catch {
      await buildOnce();
    }
  }

  let harness = await launchAnori({ headless: !headed });
  const pageFor = (command: Command) => {
    const page = command.pageId === undefined ? harness.lastPage() : harness.pages.get(Number(command.pageId));
    if (!page) {
      throw new Error(
        command.pageId === undefined
          ? 'no page is open: send {"cmd":"open"} first'
          : `no page ${String(command.pageId)}`,
      );
    }
    return page;
  };

  let reloading = Promise.resolve();
  reloadNow = () => {
    reloading = reloading
      .then(async () => {
        const { pageIds } = await reloadExtension(harness);
        out({ kind: "reloaded", pageIds });
      })
      .catch((error) => {
        out({ kind: "reload-failed", error: errorMessage(error) });
      });
    return reloading;
  };

  out({ kind: "ready", extensionId: harness.extensionId, newTabUrl: harness.newTabUrl, watch, headed });

  let closing = false;
  const shutdown = async (code = 0) => {
    if (closing) return;
    closing = true;
    control.close();
    rmSync(CONTROL_SOCKET, { force: true });
    stopWatching();
    await harness.close();
    process.exit(code);
  };

  const run = async (command: Command): Promise<unknown> => {
    switch (command.cmd) {
      case "open": {
        const page = await harness.openNewTab();
        return { pageId: harness.pageIdOf(page) };
      }
      case "pages":
        return { pages: [...harness.pages.entries()].map(([pageId, page]) => ({ pageId, url: page.url() })) };
      case "close": {
        const page = pageFor(command);
        await page.close();
        return { closed: true };
      }
      case "eval": {
        const page = pageFor(command);
        return { result: await page.evaluate(String(command.code)) };
      }
      case "run": {
        const page = pageFor(command);
        const fn = new AsyncFunction("page", "api", "harness", "context", String(command.code));
        return { result: await fn(page, harness.testApi(page), harness, harness.context) };
      }
      case "api": {
        const page = pageFor(command);
        const method = String(command.method) as keyof ReturnType<typeof harness.testApi>;
        const args = Array.isArray(command.args) ? command.args : [];
        const api = harness.testApi(page) as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
        return { result: await api[method](...args) };
      }
      case "script": {
        const file = resolve(process.cwd(), String(command.file));
        if (!existsSync(file)) throw new Error(`no such file: ${file}`);
        const mod = (await import(`${pathToFileURL(file).href}?t=${Date.now()}`)) as {
          run?: (harness: AnoriHarness) => Promise<unknown>;
        };
        if (typeof mod.run !== "function") throw new Error(`${file} must export run(harness)`);
        return { result: (await mod.run(harness)) ?? null };
      }
      case "screenshot": {
        const page = pageFor(command);
        const file = await harness.screenshot(page, command.name === undefined ? undefined : String(command.name));
        return { screenshot: file };
      }
      case "reload":
        await reloadNow();
        return { reloaded: true };
      case "reset": {
        await harness.close();
        resetProfile();
        harness = await launchAnori({ headless: !headed });
        return { reset: true, extensionId: harness.extensionId };
      }
      case "quit":
        return null;
      default:
        throw new Error(`unknown command ${String(command.cmd)}\n${USAGE}`);
    }
  };

  const handle = async (line: string, reply: (value: unknown) => void) => {
    if (!line.trim()) return;
    let command: Command;
    try {
      command = JSON.parse(line) as Command;
    } catch {
      reply({ error: "not json" });
      return;
    }
    try {
      const result = await run(command);
      if (command.cmd === "quit") {
        reply({ quit: true });
        await shutdown();
        return;
      }
      reply(result);
    } catch (error) {
      reply({ error: errorMessage(error) });
    }
  };

  rmSync(CONTROL_SOCKET, { force: true });
  const control = net.createServer((socket) => {
    readline.createInterface({ input: socket }).on("line", (line) => {
      void handle(line, (value) => socket.write(`${JSON.stringify(value)}\n`));
    });
  });
  control.on("error", (error) => {
    out({ kind: "error", error: `control socket: ${errorMessage(error)} (is another harness running?)` });
    void shutdown(1);
  });
  control.listen(CONTROL_SOCKET);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void shutdown());
  }

  const rl = readline.createInterface({ input: process.stdin });
  for await (const line of rl) await handle(line, out);
  if (process.stdin.isTTY) await shutdown();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
