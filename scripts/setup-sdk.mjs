import { get } from "nw";
import { access, readFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const version=JSON.parse(await readFile(join(root,"node_modules/nw/package.json"),"utf8")).version;
const platform={win32:"win",darwin:"osx",linux:"linux"}[process.platform];
const cacheDir=resolve(root,"test-results/nw-sdk");
const runtime=join(cacheDir,`nwjs-sdk-v${version}-${platform}-${process.arch}`);
if(!runtime.startsWith(cacheDir+"/") && !runtime.startsWith(cacheDir+"\\"))throw Error("Invalid SDK path");
export const sdkExecutable=join(runtime,process.platform==="win32"?"nw.exe":process.platform==="darwin"?"nwjs.app/Contents/MacOS/nwjs":"nw");
export async function ensureSdk(){
 try{await access(sdkExecutable);return;}catch{}
 await mkdir(cacheDir,{recursive:true});
 console.log("Preparing official NW.js SDK for desktop tests...");
 try { await get({version,flavor:"sdk",platform,arch:process.arch,cacheDir,cache:true,downloadUrl:"https://dl.nwjs.io",ffmpeg:false,nativeAddon:false}); }
 catch(error) {
  // Installer verifies the archive before creating this optional convenience symlink.
  if(error.code !== "EPERM" || error.syscall !== "symlink") throw error;
  await access(sdkExecutable);
 }
}
