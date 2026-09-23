import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { findpath } from 'nw';

const root = fileURLToPath(new URL('../', import.meta.url));
const appPath = join(root, 'desktop');
const entry = join(appPath, 'app', 'index.html');
const dev = process.argv.includes('--dev');
const buildOnStart = dev || process.argv.includes('--build') || process.env.PROJECTX_BUILD_ON_START === '1';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function buildBundle(watch = false) {
  const { build } = await import('vite');
  return build({ root, build: { watch: watch ? {} : null } });
}

let watcher;
if (buildOnStart) {
  try {
    await buildBundle(false);
    if (dev) {
      watcher = await buildBundle(true);
      console.log('Đã cập nhật bundle. Nhấn Ctrl+R trong app để tải lại.');
    }
  } catch (e) {
    console.error('Build frontend thất bại: ' + e.message);
    process.exit(1);
  }
} else if (!(await exists(entry))) {
  console.log('Chưa có bundle desktop/app, đang build lần đầu...');
  try {
    await buildBundle(false);
  } catch (e) {
    console.error('Không build được bundle desktop: ' + e.message);
    process.exit(1);
  }
}

const executable = process.env.NW_EXECUTABLE || (await findpath('nwjs'));
await access(executable);

const args = [appPath];
if (process.env.NW_USER_DATA_DIR) args.push('--user-data-dir=' + process.env.NW_USER_DATA_DIR);
if (process.env.NW_DEBUG_PORT) {
  const port = Number(process.env.NW_DEBUG_PORT);
  if (Number.isInteger(port) && port >= 1024 && port <= 65535) {
    args.push('--remote-debugging-address=127.0.0.1', '--remote-debugging-port=' + port);
  }
}

const childEnv = { ...process.env };
delete childEnv.NODE_OPTIONS;

console.log('ProjectX desktop: Đang mở cửa sổ NW.js...');
const child = spawn(executable, args, { cwd: appPath, stdio: 'inherit', windowsHide: false, env: childEnv });

let stopping = false;
async function cleanup(code = 0) {
  if (stopping) return;
  stopping = true;
  if (watcher) await watcher.close().catch(() => {});
  if (child.exitCode === null) child.kill();
  process.exit(code);
}

child.on('error', (e) => {
  console.error('Không mở được NW.js: ' + e.message);
  void cleanup(1);
});
child.on('exit', (code) => void cleanup(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void cleanup(0));
await new Promise((resolve) => child.on('close', resolve));
