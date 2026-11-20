import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {readColony,writeColony} from '../public/games/frontier/save.js';
import {collectSaves,encodeSaveCode,decodeSaveCode,restoreSnapshot,saveGroup} from '../public/save-code.js';
function colony(){return {sol:42,res:{minerals:112,food:82,water:75,alloy:34,science:67},pop:16,tech:['metal'],won:false,log:[{sol:42,text:'Colony continued.'}],tiles:Array.from({length:81},(_,i)=>({q:i%9-4,r:Math.floor(i/9)-4})).filter(t=>Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(t.q+t.r))<=4).map(t=>({...t,terrain:'plain',seen:true,building:t.q===0&&t.r===0?'hq':t.q===1&&t.r===0?'hab':null}))};}
function storage(entries=[]){const values=new Map(entries);return {get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('Frontier persists the whole colony and rejects broken grids or invalid resources',()=>{
 const c=colony();assert.deepEqual(readColony(writeColony(c)),c);
 for(const mutate of [s=>s.res.food=NaN,s=>s.tiles[0]=s.tiles[1],s=>s.tiles.find(t=>t.building==='hq').building=null,s=>s.tech=['orbit'],s=>s.pop=-2]){const bad=structuredClone(c);mutate(bad);assert.equal(readColony(writeColony(bad)),null);}
 assert.equal(readColony('{broken'),null);assert.equal(readColony('{"version":9}'),null);
});
test('all five Archives games travel in the same password snapshot with main games untouched',async()=>{
 const entries=[['trb:index','[{"id":"archived-demo"}]'],['trb:world:archived-demo','{"name":"Saved hallway"}'],['trb:settings','{"volume":0.4}'],['frontier-save-v1',writeColony(colony())],['switchyard-stats-v1','{"best":7400,"tutorial":"done"}'],['switchyard-muted','true'],['stardust-foundry-v1','{"dust":420}'],['squircle-siege-v1','{"version":1,"progress":{"0":{"easy:classic":true}}}'],['square-off-best','123']];
 const from=storage([...entries,['private-token','keep private']]);for(const [key]of entries)assert(saveGroup(key));const decoded=await decodeSaveCode(await encodeSaveCode(collectSaves(from)));assert.equal(decoded.entries.length,entries.length);
 const target=storage([['private-token','local-only']]);let backedUp=false;await restoreSnapshot(target,decoded.entries,async()=>backedUp=true);assert(backedUp);for(const [key,value]of entries)assert.equal(target.getItem(key),value);assert.equal(readColony(target.getItem('frontier-save-v1')).sol,42);assert.equal(target.getItem('private-token'),'local-only');
});
test('leaving a Junkyard game flushes final progress before invoking password autosave',()=>{
 const code=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),a=code.indexOf('function flushGame()'),b=code.indexOf("window.addEventListener('arcade-save-notice'",a);assert(a>=0&&b>a);
 const saves=storage(),events=[],frame={src:true,hasAttribute(){return this.src;},removeAttribute(){this.src=false;},contentWindow:{dispatchEvent(event){events.push(event.type);saves.setItem('frontier-save-v1',writeColony(colony()));}}},nodes={};
 const context={Event,PageTransitionEvent:class extends Event{},document:{title:'Frontier',body:{style:{}}},$:s=>s==='#game-frame'?frame:nodes[s]??=( {} ),render(){},window:{dispatchEvent(event){assert.equal(readColony(saves.getItem('frontier-save-v1')).sol,42);events.push(event.type);}}};vm.createContext(context);vm.runInContext(code.slice(a,b),context);vm.runInContext('stopGame()',context);assert.deepEqual(events,['beforeunload','pagehide','arcade-game-left']);assert.equal(frame.src,false);
});
