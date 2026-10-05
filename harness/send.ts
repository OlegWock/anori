import net from "node:net";
import readline from "node:readline";
import { CONTROL_SOCKET } from "./paths.ts";

const command = process.argv[2];
if (!command) {
  console.error(`usage: pnpm harness:send '{"cmd":"open"}'`);
  process.exit(1);
}

const socket = net.createConnection(CONTROL_SOCKET);

socket.on("error", (error: NodeJS.ErrnoException) => {
  const missing = error.code === "ENOENT" || error.code === "ECONNREFUSED";
  console.error(missing ? "no harness is running (start one with `pnpm harness`)" : String(error));
  process.exit(1);
});

socket.on("connect", () => socket.write(`${command}\n`));

readline.createInterface({ input: socket }).once("line", (line) => {
  console.info(line);
  socket.end();
  process.exit(0);
});
