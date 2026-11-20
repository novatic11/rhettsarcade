import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const revision=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public/arcade-settings-bridge.js'))).digest('hex').slice(0,12);
function replace(source,from,to,label){if(!source.includes(from))throw Error('Arcade settings adapter needs review: '+label);return source.replaceAll(from,to);}
export function decorateGameFile(relative,source){
 const name=relative.replaceAll('\\','/');
 const gamePage=/^games\/([a-z0-9-]+)\/index\.html$/.exec(name);
 if(gamePage){
  let scripts='';
  if(!source.includes('src="/arcade-settings-bridge.js'))scripts+='<script src="/arcade-settings-bridge.js?v='+revision()+'"></script>';
  if(!source.includes('src="/presence.js'))scripts+='<script src="/presence.js?v=2" data-game="'+gamePage[1]+'" defer></script>';
  return source.replace(/<head\b[^>]*>/i,match=>match+scripts);
 }
 if(name==='games/rustbound-2/game.js'){
  source=replace(source,'QUALITY[settings.quality]',"QUALITY[globalThis.arcadeSettings?.profile==='chromebook'?'performance':settings.quality]",name);
  source=replace(source,"settings.quality==='high'?2:0",'quality===QUALITY.high?2:0',name);
  return replace(source,'canvas,antialias:true,logarithmicDepthBuffer:true',"canvas,antialias:globalThis.arcadeSettings?.profile!=='chromebook',logarithmicDepthBuffer:true",name);
 }
 if(name==='games/rustbound-2/device-picker.js')return replace(source,'export async function chooseLaunchDevice(settings,{storage,force=false}={}){',"export async function chooseLaunchDevice(settings,{storage,force=false}={}){\n if(globalThis.arcadeSettings?.profile==='chromebook'&&!force){document.getElementById('device-picker').hidden=true;document.body.classList.remove('choosing-device');return settings;}",name);
 if(name==='games/the-rooms-between/src/render.js'){
  source=replace(source,'constructor(canvas,settings){',"constructor(canvas,settings){settings=globalThis.arcadeEffectiveSettings?.('the-rooms-between',settings)||settings;",name);
  source=replace(source,'apply(settings){',"apply(settings){settings=globalThis.arcadeEffectiveSettings?.('the-rooms-between',settings)||settings;",name);
  return replace(source,"{canvas,antialias:true,powerPreference:'high-performance'}","{canvas,antialias:globalThis.arcadeSettings?.profile!=='chromebook',powerPreference:'high-performance'}",name);
 }
 return source;
}
export function prepareArcadeBuild(){
 const entries=fs.readdirSync(path.join(root,'public/games'),{withFileTypes:true}).filter(e=>e.isDirectory());let count=0;
 for(const entry of entries){const relative='games/'+entry.name+'/index.html',file=path.join(root,'dist/client',relative);if(!fs.existsSync(file))continue;fs.writeFileSync(file,decorateGameFile(relative,fs.readFileSync(file,'utf8')));count++;}
 for(const relative of ['games/rustbound-2/game.js','games/rustbound-2/device-picker.js','games/the-rooms-between/src/render.js']){const file=path.join(root,'dist/client',relative);fs.writeFileSync(file,decorateGameFile(relative,fs.readFileSync(file,'utf8')));}
 console.log('Arcade shared settings prepared for '+count+' built-in games.');
}
