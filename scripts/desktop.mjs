import { createServer } from "vite";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findpath } from "nw";
const root = fileURLToPath(new URL("../", import.meta.url));
let server;
let reuse = false;
try {
  const response = await fetch("http://127.0.0.1:5173", {
    signal: AbortSignal.timeout(1500),
  });
  reuse = (await response.text()).includes("<title>StoryFlow Studio</title>");
} catch {}
if (!reuse) {
  server = await createServer({
    root,
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
  });
  await server.listen();
}
const executable = await findpath("nwjs");
const child = spawn(
  executable,
  [fileURLToPath(new URL("../desktop", import.meta.url))],
  { stdio: "inherit", windowsHide: true },
);
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  await server?.close();
  process.exit(code);
};
child.on("error", (error) => {
  console.error(error.message);
  void stop(1);
});
child.on("exit", (code) => void stop(code ?? 0));
process.on("SIGINT", () => {
  child.kill();
  void stop();
});
console.log("StoryFlow NW.js desktop started.");
