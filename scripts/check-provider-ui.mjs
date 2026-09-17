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
let connected = false, imported = false;
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
    else if (path === "/ai-sessions") data = [
      { provider: "chatgpt", label: "ChatGPT", connected },
      { provider: "veo3", label: "Veo 3", connected: false },
      { provider: "capcut", label: "CapCut", connected: false },
    ];
    else if (path === "/provider-logins") {
      const body = req.postDataJSON();
      { expect(body.provider).toBe("chatgpt"); connected = true; }
      data = { id: "test-attempt", status: "PENDING" };
    } else if (path === "/provider-logins/test-attempt") data = { id: "test-attempt", status: "CONNECTED" };
    else if (path === "/template-import-policy") data = { imageAccept: ".png,.jpg,.webp", maxImageBytes: 10485760, maxStyleImages: 6 };
    else if (path === "/template-builds/content") { expect(req.postDataJSON().sourceVideoUrl).toContain("youtube.com"); data = { id: "11111111-1111-4111-8111-111111111111", content: { title: "Nội dung đã trích xuất", durationSeconds: 120 } }; }
    else if (path.endsWith("/formula")) { expect(req.postDataJSON().customerIdea).toContain("Khám phá"); data = { formula: { name: "Công thức thiên nhiên", coreTheme: "Thiên nhiên" } }; }
    else if (path === "/templates/import") { imported = true; expect(req.postData()).toContain('name="buildId"'); expect(req.postData()).not.toContain('name="chapterCount"'); data = { id: "template", name: "Template kiểm thử", status: "DRAFT", currentVersion: 1, sceneCount: 6, versions: [{ version: 1, children: [], validation: { valid: true, errors: [] } }], input: { name: "Template kiểm thử", domain: "Thiên nhiên", language: "Vietnamese" } }; }
    await route.fulfill({ json: { data }, headers: { "Access-Control-Allow-Origin": "*" } });
  });
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await mockApi(context);
  const page = await context.newPage();
  page.on("pageerror", e => failures.push(e.message));
  await page.goto(app.url + "/#/settings");
  await expect(page.getByRole("heading", { name: "Liên kết AI" })).toBeVisible();
  await expect(page.getByPlaceholder("Dán phiên đăng nhập")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).first().click();
  await expect(page.getByText("Đăng nhập thành công.", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã xác minh", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(out, "settings.png") });
  await page.goto(app.url + "/#/templates");
  await page.getByRole("button", { name: "Thêm template", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator('[name="sceneDurationSeconds"], [name="chapterCount"]')).toHaveCount(0);
  await dialog.locator('[name="name"]').fill("Template kiểm thử");
  await dialog.locator('[name="domain"]').fill("Thiên nhiên");
  await dialog.locator('[name="sourceVideoUrl"]').fill("https://www.youtube.com/watch?v=fixture");
  await dialog.getByRole("button", { name: "Lấy nội dung" }).click();
  await expect(dialog.getByText("Nội dung đã trích xuất", { exact: true })).toBeVisible();
  await dialog.locator('[name="customerIdea"]').fill("Khám phá thiên nhiên bằng câu chuyện dễ hiểu.");
  await dialog.getByRole("button", { name: "Tạo công thức" }).click();
  await expect(dialog.getByText("Công thức thiên nhiên", { exact: true })).toBeVisible();
  await dialog.locator('[name="styleImages"]').setInputFiles({ name: "style.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lkQnWQAAAABJRU5ErkJggg==", "base64") });
  await page.screenshot({ path: resolve(out, "template.png") });
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await dialog.getByRole("button", { name: "Tạo 5 file" }).click();
  await expect.poll(() => imported).toBe(true);
  await expect(page.locator(".template-build-form")).toHaveCount(0);
  await context.close();
  expect(failures).toEqual([]);
  console.log("PASS: isolated UI fixtures — verified login state, three template actions, no removed fields, responsive 390/768/1440. No real provider generation or customer SQL data used.");

} finally {
  await browser.close();
  await Promise.all([app].map(x => new Promise(r => x.server.close(r))));
}




