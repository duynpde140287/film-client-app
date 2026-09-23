import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { preview } from 'vite';
import { fileURLToPath } from 'node:url';

const out = new URL('../test-results/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
await mkdir(out, { recursive: true });
const server = process.env.UI_TEST_URL ? null : await preview({ root: fileURLToPath(new URL('../', import.meta.url)), preview: { host: '127.0.0.1', port: 0 } });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const user = { id: 'template-ui-test', username: 'fixture', name: 'Fixture', is_admin: 0, enabled: true, licenseStatus: 'ACTIVE', expiresAt: '2099-01-01' };
const source = { status: 'EXTRACTED', title: 'Lịch sử Huế', content: 'Nội dung kiểm thử giao diện, không phải đầu ra AI thật.', durationSeconds: 300, keyTopics: ['Huế'] };
const children = Array.from({ length: 5 }, (_, index) => ({ step: index + 1, name: `CHILD_${index + 1}.md`, content: '# Fixture child', hash: 'fixture' }));
const prepared = { payload: JSON.stringify({ fixture: true }), signature: 'a'.repeat(64), children };
const input = { name: 'Lịch sử Huế', domain: 'History', language: 'Vietnamese', durationSeconds: 300, style: 'Royal', requirements: 'Fixture content' };
const template = { id: 'fixture-template', name: input.name, input, status: 'DRAFT', currentVersion: 1,
  versions: [{ version: 1, published: false, children, input, formula: {}, config: { SCENE_COUNT: 60 }, validation: { valid: true, errors: [] } }] };
const jobs = new Map();
let gpt = false, commits = 0, permitCompletion = false, uploaded = false;
await context.route('**/api/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname.replace(/^\/api/, '');
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  let data = [];
  if (path === '/auth/login') data = { token: 'fixture-token', refreshToken: 'fixture-refresh', user };
  if (path === '/auth/me') data = user;
  if (path === '/ai-sessions') data = [
    { provider: 'gemini', connected: true, status: 'CONNECTED' },
    { provider: 'chatgpt', connected: gpt, status: gpt ? 'CONNECTED' : 'DISCONNECTED' },
  ];
  if (path === '/template-import-policy') data = { imageAccept: '.png', maxImageBytes: 10485760, maxStyleImages: 6 };
  if (request.method() === 'POST' && path.startsWith('/template-builds/jobs/')) {
    const stage = path.endsWith('content') ? 1 : path.endsWith('formula') ? 2 : 3;
    if (stage === 1) assert.equal(request.postDataJSON().sourceVideoUrl, 'https://www.youtube.com/watch?v=CrU-QIvPn0E');
    if (stage === 2) {
      assert.equal(JSON.parse(request.postDataJSON().step1Text).content, source.content);
      assert.equal(request.postDataJSON().customerIdea, 'Kể theo góc nhìn của vua chúa');
    }
    if (stage === 3) {
      const body = request.postDataBuffer();
      assert.ok(body.includes(Buffer.from('name="styleImages"')));
      assert.ok(body.includes(Buffer.from('formulaOutputJson')));
      uploaded = true;
    }
    data = { id: randomUUID(), stage, createdAt: Date.now(), status: 'RUNNING' };
    jobs.set(data.id, { ...data, result: stage === 1 ? { content: source } : stage === 2 ? { formula: '# Royal viewpoint\n\nFixture formula content.' } : prepared });
  } else if (path.startsWith('/template-builds/jobs/')) {
    const job = jobs.get(path.split('/').at(-1));
    data = { ...job, status: permitCompletion ? 'DONE' : 'RUNNING' };
  }
  if (path === '/template-builds/commit') { commits++; assert.equal(request.postDataJSON().signature, prepared.signature); data = template; }
  if (path === '/templates') data = commits ? [template] : [];
  await route.fulfill({ json: { data }, headers });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(process.env.UI_TEST_URL || server.resolvedUrls.local[0]);
  await page.locator('input[name="username"]').fill('fixture');
  await page.locator('input[name="password"]').fill('FixtureOnly123!');
  await page.locator('button[type="submit"], button.login-submit').click();
  await page.getByRole('button', { name: 'Thêm template', exact: true }).click();
  await page.locator('input[name="name"]').fill('Lịch sử Huế');
  await page.locator('input[name="sourceVideoUrl"]').fill('https://www.youtube.com/watch?v=CrU-QIvPn0E');
  await expect(page.getByRole('button', { name: 'Lấy nội dung', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Tạo công thức', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Lấy nội dung', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('template_build_draft:template-ui-test'))?.pending?.stage)).toBe(1);
  assert.equal(commits, 0);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('template_build_draft:template-ui-test'))).toBe(null);
  permitCompletion = true;
  await page.getByRole('button', { name: 'Thêm template', exact: true }).click();
  await page.locator('input[name="name"]').fill('Lịch sử Huế');
  await page.locator('input[name="sourceVideoUrl"]').fill('https://www.youtube.com/watch?v=CrU-QIvPn0E');
  await page.getByRole('button', { name: 'Lấy nội dung', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('template_build_draft:template-ui-test'))?.build?.content?.title)).toBe('Lịch sử Huế');
  await expect(page.getByRole('button', { name: 'Tạo công thức', exact: true })).toBeDisabled();
  gpt = true;
  await page.evaluate(() => window.dispatchEvent(new Event('ai-status-change')));
  await page.locator('textarea[name="customerIdea"]').fill('Kể theo góc nhìn của vua chúa');
  await expect(page.getByRole('button', { name: 'Tạo công thức', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Tạo công thức', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('template_build_draft:template-ui-test'))?.build?.formula)).toContain('Royal viewpoint');
  await expect(page.getByRole('button', { name: 'Tạo 5 file', exact: true })).toBeDisabled();
  await page.locator('input[name="styleImages"]').setInputFiles(process.env.TEST_STYLE_IMAGE || 'C:/Users/thaon/AppData/Local/Temp/codex-clipboard-22e4b61a-30f1-4732-bdc3-76cae521b62a.png');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('template_build_draft:template-ui-test'))?.styleImages?.length)).toBe(1);
  await page.getByRole('button', { name: 'Tạo 5 file', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dựng template', exact: true })).toBeEnabled();
  assert.equal(uploaded, true);
  assert.equal(commits, 0);
  await page.screenshot({ path: join(out, 'template-draft-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.modal').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: join(out, 'template-draft-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: 'Dựng template', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('template_build_draft:template-ui-test'))).toBe(null);
  assert.equal(commits, 1);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm template', exact: true }).click();
  await page.locator('input[name="name"]').fill('Nháp sẽ bị xóa');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('template_build_draft:template-ui-test'))?.name)).toBe('Nháp sẽ bị xóa');
  await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('template_build_draft:template-ui-test'))).toBe(null);
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.evaluate(() => localStorage.setItem('template_build_draft:template-ui-test', JSON.stringify({ name: 'Nháp sót sau khi tắt cưỡng bức' })));
  await page.reload();
  assert.equal(await page.evaluate(() => localStorage.getItem('template_build_draft:template-ui-test')), null);
  assert.deepEqual(errors, []);
  console.log('PASS UI fixture: AI gating, previous steps, close/app-exit/startup clear localStorage, explicit commit only, five files prepared before commit. No live AI/DB calls.');
} finally { await browser.close(); await new Promise(resolve => server ? server.httpServer.close(resolve) : resolve()); }
