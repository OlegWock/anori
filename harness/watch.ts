import { type ChildProcess, spawn } from "node:child_process";
import readline from "node:readline";
import { HARNESS_OUT_DIR_NAME, REPO_DIR } from "./paths.ts";

export type BuildResult = { ok: true; summary: string } | { ok: false; summary: string };

export type Watcher = {
  firstBuild: Promise<BuildResult>;
  stop: () => void;
};

const BUILD_ARGS = ["exec", "rspack", "build", "--mode", "development", "--env", `outDir=${HARNESS_OUT_DIR_NAME}`];

export const buildOnce = () =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("pnpm", BUILD_ARGS, { cwd: REPO_DIR, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build failed with exit code ${code}`))));
  });

export const watchBuild = (onBuild: (result: BuildResult) => void): Watcher => {
  const child: ChildProcess = spawn("pnpm", [...BUILD_ARGS, "--watch"], {
    cwd: REPO_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let settleFirst: (result: BuildResult) => void = () => undefined;
  const firstBuild = new Promise<BuildResult>((resolve) => {
    settleFirst = resolve;
  });
  let count = 0;
  let errorLines: string[] = [];

  const report = (result: BuildResult) => {
    count += 1;
    if (count === 1) settleFirst(result);
    else onBuild(result);
  };

  const onLine = (line: string) => {
    const match = line.match(/Rspack compiled (successfully|with \d+ errors?)[^\n]*/);
    if (!match) {
      if (/ERROR|error\s*[×✖]|TS\d{4}:/.test(line)) errorLines.push(line.trim());
      return;
    }
    const ok = match[1] === "successfully";
    const summary = ok ? match[0] : `${match[0]}\n${errorLines.join("\n")}`;
    errorLines = [];
    report({ ok, summary });
  };

  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    readline.createInterface({ input: stream }).on("line", onLine);
  }
  child.on("exit", (code) => {
    if (count === 0) settleFirst({ ok: false, summary: `rspack exited with code ${code} before the first build` });
  });

  return { firstBuild, stop: () => child.kill() };
};
