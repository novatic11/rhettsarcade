import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {Dive,createSector} from '../public/games/deep-signal/model.js';
import {encodeSaveCode,decodeSaveCode} from '../public/save-code.js';
import {handleVault} from '../lib/save-vault.mjs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),json=f=>JSON.parse(read(f));
const quote='Dive deeper and deeper to discover new artifacts with mysterious creatures along the way.';

test('Deep Signal releases once in the main collection with the exact quote and NEW GAME metadata',()=>{
 const main=json('public/games.json'),g=main.find(g=>g.id==='deep-signal');assert(g);assert.equal(new Set(main.map(g=>g.id)).size,main.length);assert.equal(main.filter(g=>g.id==='deep-signal').length,1);assert.equal(g.status,'released');assert.equal(g.choiceQuote,quote);assert.equal(g.url,'games/deep-signal/');assert.equal(g.releasedAt,g.updatedAt);assert(Date.parse(g.updatedAt)>=Date.parse(g.releasedAt));assert(fs.existsSync(new URL('../public/'+g.cover,import.meta.url)));assert.match(g.buildSha256,/^[a-f0-9]{64}$/);
 for(const file of ['public/junkyard-games.json','public/secret-games.json'])assert(!json(file).some(g=>g.id==='deep-signal'));assert(!json('game-sources.json').find(g=>g.id==='deep-signal').collection);const html=read('public/games/deep-signal/index.html');assert(!/ADMIN BUILD|Admin games|prototype/i.test(html));assert(html.includes('Game library'));assert(!html.includes('tutorial'));assert(read('public/games/deep-signal/game.js').includes("const KEY='deep-signal-prototype-v1'"));
});

test('the released game and quote rotate once per cycle on quarter-hour boundaries, excluding Archives',()=>{
 const games=json('public/games.json'),source=read('public/app.js'),nodes=new Map(),node=k=>{if(!nodes.has(k))nodes.set(k,{style:{setProperty(){}},classList:{toggle(){}},replaceChildren(){},setAttribute(){},removeAttribute(){}});return nodes.get(k);};
 const ctx={games,FEATURE_INTERVAL:900000,arcadeTints:{},$:node,document:{createTextNode:s=>s},element:()=>({}),save(){},Date};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function renderFeatured('),source.indexOf('function syncFeatured(')),ctx);
 let appearances=0;for(let i=0;i<games.length*2;i++){vm.runInContext('renderFeatured('+i+'*FEATURE_INTERVAL)',ctx);const href=node('.feature-actions .primary').href;assert.equal(href,'?play='+games[i%games.length].id);if(href==='?play=deep-signal'){appearances++;assert.equal(node('.choice-quote').textContent,'“'+quote+'”');}vm.runInContext('renderFeatured('+i+'*FEATURE_INTERVAL+899999)',ctx);assert.equal(node('.feature-actions .primary').href,href);}assert.equal(appearances,2);for(const g of json('public/junkyard-games.json'))assert(!games.some(main=>main.id===g.id));
});

test('deep hunters stay slower than the submarine and eels retain a readable warning before dashing',()=>{
 let earlySpeed;
 for(const level of [1,20,10000,1e9]){const g=new Dive(23);g.level=level;g.sector=createSector(g.seed,level);g.sector.rocks=[];g.x=800;g.y=90;g.vx=120;const hunter={kind:'hunter',alive:true,x:400,y:90,homeX:400,homeY:90,r:17,angle:0,clock:0,alert:5,phase:0};g.sector.hazards=[hunter];g.update(.05,{right:true});const speed=(hunter.x-400)/.05;assert(speed<100);assert(g.vx>speed);if(level===1)earlySpeed=speed;else assert(speed>earlySpeed);
  const eel={kind:'eel',alive:true,x:400,y:90,homeX:400,homeY:90,r:17,angle:0,clock:0,alert:0,phase:0,mode:'warn',cooldown:.9};g.sector.hazards=[eel];for(let i=0;i<20;i++)g.update(.04);assert.equal(eel.mode,'warn');for(let i=0;i<5;i++)g.update(.04);assert.equal(eel.mode,'dash');
 }
});

test('an in-progress deep dive survives the actual password save, exit sync and reconnect flow',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec(read('drizzle/0000_many_hellcat.sql'));const DB={prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async run(){return sql.prepare(query).run(...args);}};}};},async batch(queries){for(const query of queries)await query.run();}},env={DB,SAVE_VAULT_PEPPER:'deep-release-test-only'},origin='https://arcade.example';
 async function call(action,data,cookie=''){const response=await handleVault(new Request(origin+'/api/saves/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',origin,cookie},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 try{const g=new Dive(78);g.level=8;g.sector=createSector(g.seed,8);g.cleared=7;for(const c of g.caches.slice(0,3))g.collect(c.id);g.air=48;g.hull=3;const snapshot=()=>JSON.stringify({best:9876,bestDepth:g.level,plays:3,muted:true,musicMuted:false,run:g.checkpoint()}),key='deep-signal-prototype-v1',makePayload=()=>encodeSaveCode([[key,snapshot()],['neon-slip-best','321']]);
  const first=await call('claim',{password:'DeepSignalRelease',confirmed:true,payload:await makePayload()});assert.equal(first.status,201);assert(first.cookie);g.collect(g.caches[3].id);g.air=39;const finalPayload=await makePayload(),sync=await call('sync',{id:first.data.id,revision:first.data.revision,payload:finalPayload},first.cookie);assert.equal(sync.status,200);
  const loaded=await call('load',{password:'DeepSignalRelease'});assert.equal(loaded.status,200);assert.equal(loaded.data.payload,finalPayload);const decoded=await decodeSaveCode(loaded.data.payload),saved=JSON.parse(decoded.entries.find(([k])=>k===key)[1]),restored=Dive.restore(saved.run);assert(restored);assert.equal(restored.level,8);assert.equal(restored.recovered,4);assert.equal(restored.air,39);assert.equal(restored.hull,3);assert.equal(restored.score,g.score);assert.equal(saved.best,9876);assert.equal(saved.muted,true);assert.equal(saved.musicMuted,false);assert.equal(decoded.entries.find(([k])=>k==='neon-slip-best')[1],'321');const connected=await call('connect',{password:'DeepSignalRelease',revision:loaded.data.revision,confirmed:true});assert.equal(connected.status,200);assert(connected.cookie);
 }finally{sql.close();}
});
