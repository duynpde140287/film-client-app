import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, "test-results/provider-flow");
await mkdir(out, { recursive: true });
async function serve(directory) {
  const server = createServer(async (req, res) => {
    try {
      let name = resolve(directory, "." + new URL(req.url, "http://local").pathname);
      if (name !== directory && !name.startsWith(directory + sep)) { res.writeHead(403).end(); return; }
      if (!extname(name)) name = resolve(directory, "index.html");
      const bytes = await readFile(name);
      res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" })[extname(name)] || "application/octet-stream");
      res.end(bytes);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  return { server, url: "http://127.0.0.1:" + server.address().port };
}
const app = await serve(resolve(root, "desktop/app"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const user = { id: "test-user", name: "Kiểm thử", is_admin: 0, username: "test", email: "test@example.com", enabled: true, activeFrom: "2026-01-01T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z", tokenVersion: 0, licenseStatus: "ACTIVE" };
const failures = [];
let googleConnected = false;
async function mockApi(context) {
  await context.addInitScript(({ user }) => {
    sessionStorage.setItem("projectx.creator.session", JSON.stringify({ token: "isolated-ui-fixture", refreshToken: "fixture", user: { ...user } }));
  }, { user });
  await context.route("**/api/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace(/^\/api/, "");
    let data = [];
    if (req.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } }); return; }
    if (path === "/auth/me") data = { ...user };
    else if (path === "/provider-sessions/onimivoice") data = { available: true, status: "READY" };
    else if (path === "/ai-sessions" || path === "/ai-sessions/check") data = [
      { provider: "gemini", label: "Gemini", connected: googleConnected, status: googleConnected ? "CONNECTED" : "DISCONNECTED" },
      { provider: "veo3", label: "Veo 3 (Google)", connected: googleConnected, status: googleConnected ? "CONNECTED" : "DISCONNECTED" },
      { provider: "notebooklm", label: "NotebookLM (Google)", connected: googleConnected, status: googleConnected ? "CONNECTED" : "DISCONNECTED" },
      { provider: "chatgpt", label: "ChatGPT", connected: false, status: "DISCONNECTED" },
      { provider: "onimivoice", label: "OmniVoice", connected: false, status: "DISCONNECTED" },
      { provider: "capcut", label: "CapCut", connected: false, status: "DISCONNECTED" },
    ];
    else if (path === "/provider-logins") {
      const body = req.postDataJSON();
      { expect(body.provider).toBe("gemini"); googleConnected = true; }
      data = { id: "test-attempt", status: "PENDING" };
    } else if (path === "/provider-logins/test-attempt") data = { id: "test-attempt", status: "CONNECTED" };
    await route.fulfill({ json: { data }, headers: { "Access-Control-Allow-Origin": "*" } });
  });
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await mockApi(context);
  const page = await context.newPage();
  page.on("pageerror", e => failures.push(e.message));
  await page.goto(app.url + "/#/settings");
  await expect(page.getByRole("heading", { name: "Tài khoản AI trên trình duyệt" })).toBeVisible();
  await expect(page.getByPlaceholder("Dán phiên đăng nhập")).toHaveCount(0);
  await expect(page.getByText("remote-debugging")).toHaveCount(0);
  await expect(page.getByText("Google", { exact: true })).toBeVisible();
  await expect(page.getByText("Gemini", { exact: true })).toBeVisible();
  await expect(page.getByText("Veo 3", { exact: true })).toBeVisible();
  await expect(page.getByText("NotebookLM", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toHaveCount(3);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Mở tài khoản", exact: true }).first()).toBeVisible();
  await expect(page.getByText("Đã đăng nhập", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: resolve(out, "settings.png") });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await context.close();
  expect(failures).toEqual([]);
  console.log("PASS: isolated provider UI fixture — verified Google account group, no pasted session fields, no remote-debugging help text, and responsive 390/768/1440. No real provider generation or customer SQL data used.");

} finally {
  await browser.close();
  await Promise.all([app].map(x => new Promise(r => x.server.close(r))));
}




