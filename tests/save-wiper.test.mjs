import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {SAVE_GROUPS,collectSaves,encodeSaveCode,decodeSaveCode} from '../public/save-code.js';
import {WIPE_GAMES,gameProgress,wipeGameProgress} from '../public/save-wiper.js';
import {installSaveWiper} from '../public/save-wiper-ui.js';
import {handleVault} from '../lib/save-vault.mjs';
class Storage{constructor(entries=[]){this.values=new Map(entries);}get length(){return this.values.size;}key(i){return [...this.values.keys()][i]??null;}getItem(k){return this.values.get(k)??null;}setItem(k,v){this.values.set(k,String(v));}removeItem(k){this.values.delete(k);}}
const entries=()=>SAVE_GROUPS.flatMap(g=>g.keys.map(k=>[k,'data for '+k])).concat([['trb:world:first','world'],['trb:backup:first','world backup'],['trb:world:first:private','not a game key'],['arcade-save-link-v1','connection'],['rhetts-arcade-settings-v1','preferences'],['private-token','secret']]);
test('all 31 games wipe only their progress, high scores and recovery copies after a durable backup',async()=>{
 assert.equal(WIPE_GAMES.length,31);
 for(const game of WIPE_GAMES){const storage=new Storage(entries()),before=new Map(storage.values),target=gameProgress(storage,game.id),keys=new Set(target.map(([k])=>k));let backedUp=false;
  await wipeGameProgress(storage,game.id,async backup=>{assert.deepEqual(backup.entries,target);assert.deepEqual(backup.groups,[game.id]);assert.deepEqual(storage.values,before);backedUp=true;});assert(backedUp);
  for(const [key,value]of before)assert.equal(storage.getItem(key),keys.has(key)?null:value,game.id+': '+key);
 }
 const storage=new Storage(entries());await wipeGameProgress(storage,'the-rooms-between',async()=>{});assert.equal(storage.getItem('trb:world:first'),null);assert.equal(storage.getItem('trb:backup:first'),null);assert.equal(storage.getItem('trb:settings'),'data for trb:settings');assert.equal(storage.getItem('trb:world:first:private'),'not a game key');
});
test('unknown targets and backup failures cannot erase data; a storage error rolls back the selected game',async()=>{
 const storage=new Storage(entries()),before=new Map(storage.values);for(const id of ['library','unknown','__proto__'])await assert.rejects(()=>wipeGameProgress(storage,id,async()=>{}));assert.deepEqual(storage.values,before);
 await assert.rejects(()=>wipeGameProgress(storage,'neon-slip',async()=>{throw Error('backup failed');}));assert.deepEqual(storage.values,before);
 let removals=0;storage.removeItem=k=>{if(++removals===2)throw Error('storage failed');storage.values.delete(k);};await assert.rejects(()=>wipeGameProgress(storage,'neon-slip',async()=>{}),/previous progress was restored/);assert.deepEqual(storage.values,before);
});
class Element{constructor(){this.hidden=false;this.disabled=false;this.value='';this.textContent='';this.children=[];this.handlers={};this.classList={toggle(){}};}addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}async fire(name){for(const fn of this.handlers[name]||[])await fn({preventDefault(){}});}append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;this.value='';}showModal(){this.open=true;}close(){this.open=false;}focus(){}}
function fixture(overrides={}){
 const ids=['wipe-dialog','wipe-game','wipe-message','wipe-review','wipe-confirm','wipe-check','wipe-cancel','wipe-close','save-wiper'],nodes=Object.fromEntries(ids.map(id=>[id,new Element()])),storage=new Storage([['neon-slip-best','321'],['pocket-heist-prototype-v1','{"cleared":6}'],['rhetts-arcade','{"favorites":["neon-slip"]}']]);let backup=0,published=0,changed=0,busy=false;
 nodes['wipe-dialog'].querySelectorAll=()=>['wipe-confirm','wipe-check','wipe-cancel','wipe-close'].map(id=>nodes[id]);
 installSaveWiper({document:{querySelector:s=>nodes[s.slice(1)],createElement:()=>new Element()},storage,getCatalog:()=>[{id:'neon-slip'},{id:'laserline',archived:true}],getLinkId:()=>null,isBusy:()=>busy,finishSave:async()=>true,setSyncBusy:v=>busy=v,withLock:work=>work(),pauseGames(){},keepBackup:async()=>backup++,changed:()=>changed++,publish:async()=>published++,saveFailure:cleared=>cleared?'Password save pending.':'Not connected. Nothing was cleared.',...overrides});
 return {nodes,storage,counts:()=>({backup,published,changed,busy}),async review(){await nodes['save-wiper'].fire('click');nodes['wipe-game'].value='neon-slip';await nodes['wipe-game'].fire('change');await nodes['wipe-check'].fire('click');}};
}
test('opening, selecting, reviewing and cancelling do not wipe; only the explicit confirmation does',async()=>{
 const f=fixture();await f.review();assert.equal(f.storage.getItem('neon-slip-best'),'321');assert(f.nodes['wipe-review'].textContent.includes('Neon Slip'));assert.equal(f.nodes['wipe-confirm'].textContent,'Yes, wipe Neon Slip');await f.nodes['wipe-cancel'].fire('click');assert.equal(f.storage.getItem('neon-slip-best'),'321');assert.equal(f.counts().backup,0);
 await f.review();await f.nodes['wipe-confirm'].fire('click');assert.equal(f.storage.getItem('neon-slip-best'),null);assert.equal(f.storage.getItem('pocket-heist-prototype-v1'),'{"cleared":6}');assert.equal(f.storage.getItem('rhetts-arcade'),'{"favorites":["neon-slip"]}');assert.deepEqual(f.counts(),{backup:1,published:0,changed:1,busy:false});assert(f.nodes['wipe-message'].textContent.includes('start fresh'));
 await f.nodes['wipe-confirm'].fire('click');assert.equal(f.counts().backup,1);
});
test('linked wipes wait for saves, publish the cleared snapshot, and clearly report an unfinished online update',async()=>{
 const blocked=fixture({getLinkId:()=> 'linked',finishSave:async()=>false});await blocked.review();await blocked.nodes['wipe-confirm'].fire('click');assert.equal(blocked.storage.getItem('neon-slip-best'),'321');assert.equal(blocked.counts().backup,0);assert.match(blocked.nodes['wipe-message'].textContent,/Nothing was cleared/);
 const linked=fixture({getLinkId:()=> 'linked'});await linked.review();assert.match(linked.nodes['wipe-review'].textContent,/linked save password/);await linked.nodes['wipe-confirm'].fire('click');assert.equal(linked.counts().published,1);assert.match(linked.nodes['wipe-message'].textContent,/linked password save/);
 const interrupted=fixture({getLinkId:()=> 'linked',publish:async()=>{throw Error('offline');}});await interrupted.review();await interrupted.nodes['wipe-confirm'].fire('click');assert.equal(interrupted.storage.getItem('neon-slip-best'),null);assert.equal(interrupted.storage.getItem('pocket-heist-prototype-v1'),'{"cleared":6}');assert.match(interrupted.nodes['wipe-message'].textContent,/wiped on this browser.*pending/);
});
test('a changed connection aborts before wiping, and repeated confirmation clicks cannot run twice',async()=>{
 let id='first';const changed=fixture({getLinkId:()=>id,finishSave:async()=>{id='other';return true;}});await changed.review();await changed.nodes['wipe-confirm'].fire('click');assert.equal(changed.storage.getItem('neon-slip-best'),'321');assert.match(changed.nodes['wipe-message'].textContent,/connection changed/);
 let release;const gate=new Promise(r=>release=r),once=fixture({keepBackup:()=>gate});await once.review();const first=once.nodes['wipe-confirm'].fire('click');await once.nodes['wipe-confirm'].fire('click');release();await first;assert.equal(once.counts().changed,1);
});
test('password saves reload the selected game as fresh while retaining other games and launcher data',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../drizzle/0000_many_hellcat.sql',import.meta.url),'utf8'));
 const DB={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async run(){return sql.prepare(query).run(...args);}};}};},async batch(queries){for(const query of queries)await query.run();}},env={DB,SAVE_VAULT_PEPPER:'wiper-unit-test'},origin='https://arcade.example';
 async function call(action,data,cookie=''){const response=await handleVault(new Request(origin+'/api/saves/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',origin,cookie},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 try{const storage=new Storage([['rustbound-2-demo-v1','colony'],['rustbound-2-demo-v1-backup','backup'],['rustbound-2-demo-v1-recovery','recovery'],['rustbound-2-settings-v1','graphics'],['neon-slip-best','55'],['rhetts-arcade','favorites'],['rhetts-arcade-stats-v1','stats']]);
  const claimed=await call('claim',{password:'WiperTestPassword',confirmed:true,payload:await encodeSaveCode(collectSaves(storage))});assert.equal(claimed.status,201);
  await wipeGameProgress(storage,'rustbound-2',async()=>{});const payload=await encodeSaveCode(collectSaves(storage)),saved=await call('sync',{id:claimed.data.id,revision:claimed.data.revision,payload},claimed.cookie);assert.equal(saved.status,200);
  const loaded=await call('load',{password:'WiperTestPassword'}),decoded=await decodeSaveCode(loaded.data.payload);assert.deepEqual(decoded.entries,collectSaves(storage));assert(!decoded.entries.some(([k])=>k.startsWith('rustbound-2-demo-v1')));assert(decoded.entries.some(([k,v])=>k==='rustbound-2-settings-v1'&&v==='graphics'));assert(decoded.entries.some(([k,v])=>k==='neon-slip-best'&&v==='55'));
  assert.equal((await call('sync',{id:claimed.data.id,revision:claimed.data.revision,payload:await encodeSaveCode([['rustbound-2-demo-v1','stale']])},claimed.cookie)).status,409);
 }finally{sql.close();}
});
