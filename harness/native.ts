import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROFILE_DIR, STATE_DIR } from "./paths.ts";

const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
const WINDOW_ID_SOURCE = join(HARNESS_DIR, "native/window-id.swift");
const WINDOW_ID_BINARY = join(STATE_DIR, "bin/window-id");

const ensureWindowIdBinary = () => {
  const stale =
    !existsSync(WINDOW_ID_BINARY) || statSync(WINDOW_ID_BINARY).mtimeMs < statSync(WINDOW_ID_SOURCE).mtimeMs;
  if (!stale) return;
  mkdirSync(dirname(WINDOW_ID_BINARY), { recursive: true });
  execFileSync("swiftc", ["-O", WINDOW_ID_SOURCE, "-o", WINDOW_ID_BINARY], { stdio: "inherit" });
};

export const browserPid = (): number => {
  const out = execFileSync("pgrep", ["-f", "--", `--user-data-dir=${PROFILE_DIR}`], { encoding: "utf8" });
  const pids = out.split("\n").map(Number).filter(Boolean);
  const main = pids.find((pid) => {
    const args = execFileSync("ps", ["-o", "args=", "-p", String(pid)], { encoding: "utf8" });
    return !args.includes("--type=");
  });
  if (!main) throw new Error("harness browser process not found (is the harness running headed?)");
  return main;
};

export const captureBrowserWindow = (file: string, options: { shadow?: boolean } = {}) => {
  if (process.platform !== "darwin") throw new Error("native window capture is macOS only");
  ensureWindowIdBinary();
  const windowId = execFileSync(WINDOW_ID_BINARY, [String(browserPid())], { encoding: "utf8" }).trim();
  mkdirSync(dirname(file), { recursive: true });
  execFileSync("screencapture", [`-l${windowId}`, ...(options.shadow ? [] : ["-o"]), "-x", file]);
  return file;
};
