import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validStats,addSession,achievementList,STATS_KEY,gameRecord} from '../public/arcade-model.js';
import {statsOverview,filterAchievements,filterRecords} from '../public/stats-dashboard-model.js';
import {collectSaves,encodeSaveCode,decodeSaveCode} from '../public/save-code.js';
const catalog=['games','junkyard-games'].flatMap((file,i)=>JSON.parse(fs.readFileSync(new URL('../public/'+file+'.json',import.meta.url))).map(g=>({...g,archived:!!i})));
class Storage{constructor(rows=[]){this.rows=new Map(rows)}get length(){return this.rows.size}key(i){return [...this.rows.keys()][i]??null}getItem(k){return this.rows.get(k)??null}setItem(k,v){this.rows.set(k,String(v))}}
const save=(storage,key,v)=>storage.setItem(key,JSON.stringify(v));

test('an empty arcade has no fabricated playtime, achievements or recent history',()=>{
 const storage=new Storage(),overview=statsOverview(storage,null,catalog);
 assert.equal(overview.total,0);assert.equal(overview.launches,0);assert.equal(overview.recent.length,0);assert.equal(overview.genres.length,0);assert.equal(overview.unlocked.length,0);
 assert(overview.achievements.length>=70);assert.equal(new Set(overview.achievements.map(a=>a.id)).size,overview.achievements.length);
 assert(!overview.entries.some(e=>e.game.status==='coming-soon'));assert.equal(overview.entries.length,catalog.length);
});
test('overview totals only real catalog games; sorting, genre shares and Archives use the same tracked values',()=>{
 const stats=validStats(null);stats.games={'square-off':{seconds:1800,launches:4,lastPlayed:20},'ducks-vs-dogs-2':{seconds:600,launches:2,lastPlayed:30},laserline:{seconds:1200,launches:3,lastPlayed:10},'secret-fake':{seconds:999999,launches:900,lastPlayed:40}};
 const overview=statsOverview(new Storage(),stats,catalog);assert.equal(overview.total,3600);assert.equal(overview.launches,9);assert.equal(overview.played.length,3);assert.equal(overview.main.played,2);assert.equal(overview.archives.played,1);assert.equal(overview.ranked[0].game.id,'square-off');assert.equal(overview.recent[0].game.id,'ducks-vs-dogs-2');assert(Math.abs(overview.genres.reduce((s,g)=>s+g.share,0)-1)<1e-9);
 assert.equal(overview.achievements.find(a=>a.id==='arcade-regular').unlocked,true);assert.equal(overview.achievements.find(a=>a.id==='five-worlds').current,3);
});
test('milestone progress uses actual save shapes, excludes starters, and keeps all original achievement IDs',()=>{
 const storage=new Storage();save(storage,'meridian_space_program_v1',{totalScience:425,tech:{start:true,a:true,b:true,bad:'true'},designs:{Alpha:{root:1},Beta:{root:2},Gamma:{root:3}}});save(storage,'ducks-vs-dogs-2-save-v1',{cleared:{'1-1':{clears:1},'1-2':{clears:2},'1-bonus':{clears:1},'fake':{clears:50}},owned:['bread','puddle','bread'],items:{slot6:true,slot7:true}});save(storage,'switchyard-stats-v1',{delivered:33});
 const a=achievementList(storage,validStats(null),catalog);const get=id=>a.find(r=>r.id===id);assert.equal(get('science-1000').current,425);assert.equal(get('meridian-tech').current,2);assert(get('meridian-designs').unlocked);assert.equal(get('flock2-eight').current,2);assert.equal(get('flock2-ten').current,2);assert.equal(get('flock2-slots').current,2);assert.equal(get('switch-hundred').current,33);assert(!get('flock2-all').unlocked);
 for(const id of ['first-launch','five-worlds','arcade-regular','archive-explorer','heart-collector','boss-breaker','still-standing','steady-hands','into-the-deep','professional','beyond-collection','growing-flock','neighborhood-favorite','second-world','star-collector','six-circuits','colony-established'])assert(get(id),'preserved '+id);
});
test('recognized unlocks survive resets and save-password round trips without changing game progress',async()=>{
 const storage=new Storage(),stats=validStats(null);stats.unlocked['boss-breaker']=Date.now()-1000;storage.setItem(STATS_KEY,JSON.stringify(stats));save(storage,'square-off-best',0);const before=new Map(storage.rows);const awards=achievementList(storage,stats,catalog);assert(awards.find(a=>a.id==='boss-breaker').unlocked);assert.equal(awards.find(a=>a.id==='boss-breaker').progress,1);assert.equal(awards.find(a=>a.id==='boss-breaker').at,stats.unlocked['boss-breaker']);assert.deepEqual(storage.rows,before);
 const decoded=await decodeSaveCode(await encodeSaveCode(collectSaves(storage)));const restored=JSON.parse(decoded.entries.find(([k])=>k===STATS_KEY)[1]);assert.equal(restored.unlocked['boss-breaker'],stats.unlocked['boss-breaker']);
});
test('invalid save data cannot crash the dashboard or invent milestone progress',()=>{
 const keys=['meridian_space_program_v1','ducks-vs-dogs-2-save-v1','ducks-vs-dogs-save-v1','rhettsArcade.carSpleef3d','crazysort.v1','rustbound-2-demo-v1','sb.best','parcel-panic-prototype-v1'];
 for(const raw of ['null','true','1','"garbage"','[]','{broken','{"totalScience":"999999","designs":"x","owned":{},"tech":[],"cleared":"x","best":{"fake":"99999"}}']){
  const storage=new Storage(keys.map(k=>[k,raw]));const overview=statsOverview(storage,null,catalog);assert.equal(overview.unlocked.length,0,raw);for(const a of overview.achievements){assert(Number.isFinite(a.progress));assert(a.progress>=0&&a.progress<=1);}
 }
});
test('search and collection filters handle no matches, archive records and achievement state',()=>{
 const storage=new Storage([['square-off-best','5']]),stats=addSession(null,'square-off',0,true),overview=statsOverview(storage,stats,catalog),rows=filterAchievements(overview.achievements,{status:'unlocked',game:'square-off',query:'round'});assert.equal(rows.length,2);assert.equal(filterAchievements(overview.achievements,{query:'never a real achievement xyz'}).length,0);assert(filterAchievements(overview.achievements,{game:'arcade'}).every(a=>a.gameId===null));
 assert(filterRecords(overview.entries,{scope:'archives'}).every(e=>e.game.archived));assert.equal(filterRecords(overview.entries,{query:'Ducks vs. Dogs 2'}).length,1);assert.equal(filterRecords(overview.entries,{query:'no game xyz'}).length,0);assert.equal(filterRecords(overview.entries,{sort:'time'})[0].game.id,'square-off');
 save(storage,'parcel-panic-prototype-v1',{v:1,best:2500,plays:8});assert.equal(gameRecord('parcel-panic',storage).value,'2,500');
});
