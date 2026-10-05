import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STATE_DIR = join(REPO_DIR, ".harness");
export const PROFILE_DIR = join(STATE_DIR, "profile");
export const SCREENSHOTS_DIR = join(STATE_DIR, "screenshots");
export const CONTROL_SOCKET = join(STATE_DIR, "control.sock");
export const HARNESS_OUT_DIR_NAME = "harness";
export const EXT_DIR = join(REPO_DIR, "dist", HARNESS_OUT_DIR_NAME);
