import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {SAVE_GROUPS,collectSaves,encodeSaveCode,decodeSaveCode,restoreSaves} from '../public/save-code.js';
import {wipeGameProgress} from '../public/save-wiper.js';
import {gameRecord} from '../public/arcade-model.js';
import {gameBuildFingerprint} from '../scripts/sync-games.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/games/car-spleef-3d/index.html');
class Storage{constructor(entries=[]){this.values=new Map(entries);}get length(){return this.values.size;}key(i){return [...this.values.keys()][i]??null;}getItem(k){return this.values.get(k)??null;}setItem(k,v){this.values.set(k,String(v));}removeItem(k){this.values.delete(k);}}
function load(storage){const source=html.slice(html.indexOf("const SAVE_KEY="),html.indexOf('/* =========================================================\n   Maps:'));const context=vm.createContext({localStorage:storage});vm.runInContext(source+'\nthis.result=save;this.persist=persist;',context);return context;}
test('new main-library game follows Car Spleef with the exact supplied quote and a validated local build',()=>{
 const games=JSON.parse(read('public/games.json')),index=games.findIndex(g=>g.id==='car-spleef'),game=games[index+1];
 assert.equal(game.id,'car-spleef-3d');assert.equal(game.title,'Car Spleef 3D');assert.equal(game.choiceQuote,'A spin on the original Car Spleef where the entire game is 3D, and some new features are added.');
 assert.equal(game.url,'games/car-spleef-3d/');assert.equal(game.releasedAt,game.updatedAt);
 assert.equal(game.buildSha256,gameBuildFingerprint(new URL('../public/games/car-spleef-3d/',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')));
 assert(html.includes('src="vendor/three.min.js"'));assert(!html.includes('src="https://'));assert(read('public/games/car-spleef-3d/vendor/THREE-LICENSE.txt').includes('MIT'));
 assert.equal(SAVE_GROUPS.find(g=>g.id===game.id).keys[0],'rhettsArcade.carSpleef3d');
});
test('existing 3D progress migrates preferences without touching original Car Spleef or unknown fields',()=>{
 const data={wins:7,played:12,mapWins:{Classic:3},view:'first',difficulty:'hard',muted:true,quality:'low',mapIndex:4,futureField:{keep:42}},storage=new Storage([['rhettsArcade.carSpleef3d',JSON.stringify(data)],['car-spleef-stats-v1','original']]);
 const context=load(storage);context.persist();const saved=JSON.parse(storage.getItem('rhettsArcade.carSpleef3d'));
 for(const [key,value]of Object.entries(data))assert.deepEqual(saved[key],value);
 assert.equal(storage.getItem('car-spleef-stats-v1'),'original');const prefs=JSON.parse(storage.getItem('car-spleef-3d-settings-v1'));assert.equal(prefs.view,'first');assert.equal(prefs.muted,true);assert(!('wins'in prefs));
 assert.equal(gameRecord('car-spleef-3d',storage).value,'7');
});
test('3D progress round-trips through portable saves and wiping preserves controls and original game progress',async()=>{
 const storage=new Storage([['rhettsArcade.carSpleef3d',JSON.stringify({wins:5,played:8,view:'first',difficulty:'hard',muted:true,mapWins:{0:2}})],['car-spleef-stats-v1','{"wins":9}']]);load(storage).persist();
 const encoded=await encodeSaveCode(collectSaves(storage,['car-spleef-3d'])),decoded=await decodeSaveCode(encoded),other=new Storage();await restoreSaves(other,decoded,async()=>{});assert.equal(gameRecord('car-spleef-3d',other).value,'5');
 let backup;await wipeGameProgress(storage,'car-spleef-3d',async b=>backup=b);assert.equal(backup.entries.length,1);assert.equal(storage.getItem('rhettsArcade.carSpleef3d'),null);assert.equal(storage.getItem('car-spleef-stats-v1'),'{"wins":9}');
 const next=load(storage);assert.equal(next.result.wins,0);assert.equal(next.result.played,0);assert.equal(next.result.view,'first');assert.equal(next.result.difficulty,'hard');assert.equal(next.result.muted,true);
});
