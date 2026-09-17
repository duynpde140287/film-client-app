import { findpath } from 'nw';
import { cp, mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (process.platform !== 'win32') throw Error('Lệnh này đóng gói bản Windows; chạy trên Windows.');

const executable = await findpath('nwjs');
const releaseRoot = resolve(root, 'release');
const output = resolve(releaseRoot, 'ProjectX');
if (!output.startsWith(releaseRoot + sep)) throw Error('Đường dẫn release không hợp lệ.');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(dirname(executable), output, { recursive: true });
await cp(join(root, 'desktop'), join(output, 'package.nw'), { recursive: true });
await copyFile(executable, join(output, 'ProjectX.exe'));
console.log('Bản Windows: ' + join(output, 'ProjectX.exe') + ' (giữ nguyên các file cạnh exe).');