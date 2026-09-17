import { chromium, expect } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import { ensureSdk, sdkExecutable } from './setup-sdk.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(root,'test-results');
await mkdir(out,{recursive:true});
await ensureSdk();
const profile=await mkdtemp(join(out,'nw-client-smoke-'));
const portProbe=createServer();
await new Promise(r=>portProbe.listen(0,'127.0.0.1',r));
const port=portProbe.address().port;
await new Promise(r=>portProbe.close(r));
const env={...process.env}; delete env.NODE_OPTIONS;
const child=spawn(sdkExecutable,[join(root,'desktop'),'--user-data-dir='+profile,'--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port],{cwd:root,env,windowsHide:false,stdio:['ignore','pipe','pipe']});
let logs='',browser;
child.stdout.on('data',b=>logs=(logs+b).slice(-10000));
child.stderr.on('data',b=>logs=(logs+b).slice(-10000));
const errors=[];
try {
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null)throw Error('NW.js exited: '+logs);
    try {browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);break;}catch{}
    await delay(200);
  }
  if(!browser)throw Error('NW.js debug endpoint unavailable: '+logs);
  const context=browser.contexts()[0];
  const user={id:'native-test',username:'fixture',name:'Native test',is_admin:0,enabled:true,activeFrom:'2020-01-01',expiresAt:'2099-01-01',licenseStatus:'ACTIVE'};
  await context.route('**/api/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname.replace(/^\/api/,'');
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
    let data=[];
    if(path==='/auth/login')data={token:'isolated-native-fixture',refreshToken:'fixture',user};
    if(path==='/auth/me')data=user;
    if(path.startsWith('/provider-sessions/'))data={available:false,status:'MISSING_SESSION'};
    if(path==='/ai-sessions')data=[{provider:'chatgpt',label:'ChatGPT',connected:false},{provider:'veo3',label:'Veo 3',connected:false}];
    if(path==='/template-import-policy')data={imageAccept:'.png,.jpg,.webp',maxImageBytes:10485760,maxStyleImages:6};
    await route.fulfill({json:{data},headers:{'Access-Control-Allow-Origin':'*'}});
  });
  let page;
  for(let i=0;i<100;i++) {
    page=context.pages().find(p=>p.url().startsWith('chrome-extension://projectx-studio'));
    if(page)break;
    await delay(100);
  }
  if(!page)throw Error('Desktop page not found');
  page.on('pageerror',error=>errors.push(error.message));
  await page.reload();
  await expect(page.getByPlaceholder('Nhập tài khoản của bạn')).toBeVisible();
  expect(await page.evaluate(()=>typeof window.require)).toBe('undefined');
  expect(new URL(page.url()).protocol).toBe('chrome-extension:');
  const passwordBox=await page.locator('input[name="password"]').boundingBox();
  const loginBox=await page.locator('button[type="submit"],button.login-submit').boundingBox();
  expect(loginBox.y-(passwordBox.y+passwordBox.height)).toBeGreaterThanOrEqual(8);
  await page.locator('input[name="username"]').fill('fixture');
  await page.locator('input[name="password"]').fill('FixtureOnly123!');
  await page.locator('button[type="submit"],button.login-submit').click();
  await expect(page.getByRole('heading',{name:'Template cá nhân'})).toBeVisible();
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  await page.screenshot({path:join(out,'client-native.png')});
  // A manipulated local session must return to login even before any API call.
  await page.evaluate(()=>{
    const key='projectx.creator.session';
    const session=JSON.parse(sessionStorage.getItem(key));
    session.user.is_admin=1; sessionStorage.setItem(key,JSON.stringify(session));
  });
  await page.reload();
  await expect(page.getByPlaceholder('Nhập tài khoản của bạn')).toBeVisible();
  await delay(1500);
  expect(child.exitCode).toBe(null);
  expect(errors).toEqual([]);
  await writeFile(join(out,'client-native-report.json'),JSON.stringify({passed:true,fixture:true,checks:['NW.js native window','node disabled in renderer','login spacing','customer session only','no admin menu','window remains open'],checkedAt:new Date().toISOString()},null,2));
  console.log('PASS: NW.js native window, login layout, numeric is_admin client guard, no admin menu, no renderer errors. Isolated API fixture; no customer DB modified.');
} finally {
  await browser?.close().catch(()=>{});
  if(child.exitCode===null) {
    if(process.platform==='win32')spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
    else child.kill();
  }
  if(!profile.startsWith(out+sep+'nw-client-smoke-'))throw Error('Unsafe fixture cleanup');
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:300});
}
