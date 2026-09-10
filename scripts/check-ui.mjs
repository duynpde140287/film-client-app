import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const backend = process.env.E2E_BACKEND_DIR || resolve(root, "../backend");
const out = join(root, "test-results");
await mkdir(out, { recursive: true });
const storage = await mkdtemp(join(out, "database-"));
const password = randomBytes(24).toString("hex");
const apiUrl = "http://127.0.0.1:3102/api",
  webUrl = "http://127.0.0.1:5175";
const server = spawn(process.execPath, ["dist/main.js"], {
  cwd: backend,
  env: {
    ...process.env,
    PORT: "3102",
    HOST: "127.0.0.1",
    DB_TYPE: "sqljs",
    STORAGE_DIR: storage,
    PROVIDER_MODE: "demo",
    SEED_DEMO: "true",
    ADMIN_EMAIL: "admin@ui.test",
    ADMIN_PASSWORD: password,
    DEMO_USER_EMAIL: "creator@ui.test",
    DEMO_USER_PASSWORD: password,
    JWT_SECRET: randomBytes(32).toString("hex"),
    CORS_ORIGINS: webUrl,
  },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (b) => (logs += b));
server.stderr.on("data", (b) => (logs += b));
let vite, browser;
const errors = [];
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Page overflows horizontally",
  );
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(apiUrl + "/health")).ok) break;
    } catch {}
    if (i === 99) throw Error("API startup failed: " + logs);
    await delay(100);
  }
  vite = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, webUrl).pathname;
      const name = pathname.startsWith("/assets/")
        ? pathname.slice(1)
        : "index.html";
      const body = await readFile(join(root, "dist", name));
      res.setHeader(
        "Content-Type",
        name.endsWith(".js")
          ? "application/javascript"
          : name.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((r) => vite.listen(5175, "127.0.0.1", r));
  browser = await chromium.launch({
    channel:
      process.env.BROWSER_CHANNEL ||
      (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.route("http://127.0.0.1:3000/api/**", (route) =>
    route.continue({
      url: route.request().url().replace("http://127.0.0.1:3000/api", apiUrl),
    }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(webUrl);
  await page.getByLabel("Email", { exact: true }).fill("creator@ui.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Vào Studio" }).click();
  await page
    .getByRole("heading", { name: "Hôm nay, bạn muốn kể điều gì?" })
    .waitFor();
  await page.getByText("Vòng tuần hoàn của nước", { exact: true }).waitFor();
  await noOverflow(page);
  await page.screenshot({
    path: join(out, "desktop-overview.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Template Studio", exact: true })
    .click();
  await page.getByRole("button", { name: "Tạo template", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tên template", { exact: true }).fill("Khoa học UI");
  await dialog.getByLabel("Chủ đề / lĩnh vực").fill("Giáo dục");
  await dialog
    .getByLabel("Yêu cầu nội dung", { exact: true })
    .fill("Giải thích một ý tưởng khoa học bằng ví dụ dễ hiểu.");
  await dialog.getByLabel("Phong cách hình ảnh").fill("Minh họa đơn giản");
  await dialog.getByLabel("Tổng thời lượng (giây)").fill("4");
  await dialog.getByLabel("Mỗi cảnh (giây)").fill("2");
  await dialog
    .getByRole("button", { name: "Dựng template", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xuất bản template", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Step 5", exact: true }).click();
  await page
    .getByText("CHILD_STEP_5_IMAGE_VIDEO_PROMPTS_SYSTEM.txt", { exact: true })
    .waitFor();
  await page.screenshot({
    path: join(out, "template-child-preview.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Xuất bản template", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("link", { name: "Dự án của tôi", exact: true }).click();
  await page.getByRole("button", { name: "Tạo dự án", exact: true }).click();
  await page
    .getByLabel("Tên dự án", { exact: true })
    .fill("Vòng tuần hoàn — kiểm thử UI");
  await page
    .getByLabel("Template", { exact: true })
    .selectOption({ label: "Khoa học UI" });
  await page
    .getByLabel("Nội dung hoặc ý tưởng đầu vào", { exact: true })
    .fill(
      "Nước bốc hơi thành mây, ngưng tụ rồi trở lại mặt đất qua những cơn mưa.",
    );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo dự án", exact: true })
    .click();
  await page.getByRole("button", { name: "Chạy tự động", exact: true }).click();
  await page
    .getByRole("button", { name: "QC & Xuất bản", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Tải xuống", exact: true })
    .waitFor({ timeout: 120000 });
  await page.screenshot({
    path: join(out, "desktop-export.png"),
    fullPage: true,
  });
  assert.ok(
    await page.locator("video").evaluate((el) => el.readyState > 0),
    "Export video metadata did not load",
  );
  await page.getByRole("button", { name: /Voice/ }).click();
  await page.locator("audio").first().waitFor();
  await page
    .getByRole("button", { name: "Tạo lại", exact: true })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã xếp hàng cảnh 1" })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({
    path: join(out, "mobile-voice.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.getByRole("link", { name: "Tổng quan", exact: true }).click();
  await page
    .getByRole("heading", { name: "Hôm nay, bạn muốn kể điều gì?" })
    .waitFor();
  await noOverflow(page);
  await page.screenshot({
    path: join(out, "mobile-overview.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto(webUrl + "/admin");
  await page.getByLabel("Email", { exact: true }).fill("admin@ui.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Vào trang quản trị" }).click();
  await page
    .getByRole("heading", { name: "Khách hàng", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page.getByLabel("Tên khách hàng").fill("Khách UI");
  await page.getByLabel("Email", { exact: true }).fill("customer@ui.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  await page.getByText("customer@ui.test", { exact: true }).waitFor();
  await page
    .getByRole("row")
    .filter({ hasText: "customer@ui.test" })
    .getByRole("button", { name: "Quản lý" })
    .click();
  await page.getByRole("button", { name: "Gia hạn", exact: true }).click();
  await page.getByRole("button", { name: "Khóa", exact: true }).click();
  await page.getByRole("button", { name: "Mở lại", exact: true }).waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.screenshot({
    path: join(out, "admin-customers.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Hỗ trợ template", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Khoa học UI", exact: true })
    .waitFor();
  assert.deepEqual(errors, [], "Browser runtime errors");
  await writeFile(
    join(out, "report.json"),
    JSON.stringify(
      {
        passed: true,
        checkedAt: new Date().toISOString(),
        screenshots: [
          "desktop-overview.png",
          "template-child-preview.png",
          "desktop-export.png",
          "mobile-voice.png",
          "mobile-overview.png",
          "admin-customers.png",
        ],
        checks: [
          "creator login",
          "template build and five-child preview",
          "publish",
          "project creation",
          "full automation",
          "MP4 preview",
          "single scene retry",
          "mobile navigation and overflow",
          "admin login",
          "customer creation/extend/disable",
          "admin template support",
        ],
        browserErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "UI PASS: desktop, mobile, template/project creation, automation, MP4 preview, retry and admin management.",
  );
} finally {
  await browser?.close();
  if (vite) await new Promise((r) => vite.close(r));
  server.kill();
  await delay(200);
}
