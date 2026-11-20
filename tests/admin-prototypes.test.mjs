import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {EchoPuzzle,LEVELS} from '../public/games/afterimage/model.js';
import {Kitchen,STATIONS} from '../public/games/midnight-kitchen/model.js';
import {saveGroup,encodeSaveCode,decodeSaveCode} from '../public/save-code.js';
const tick=(g,seconds)=>{for(let t=0;t<seconds;t+=.04)g.update(.04);};
function route(g,target){const queue=[[g.x,g.y]],seen=new Set([g.x+','+g.y]),prev=new Map();while(queue.length){const a=queue.shift();if(a[0]===target[0]&&a[1]===target[1]){const path=[];let p=a;while(prev.has(p.join(','))){path.unshift(p);p=prev.get(p.join(','));}return path;}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const b=[a[0]+dx,a[1]+dy],key=b.join(',');if(!seen.has(key)&&g.passable(...b)){seen.add(key);prev.set(key,a);queue.push(b);}}}assert.fail('No legal route in '+g.map.name+' to '+target);}
const walk=(g,target,record=false)=>{for(const [x,y]of route(g,target)){assert(g.move(x-g.x,y-g.y));if(record)tick(g,.16);}};
test('all six echo rooms are actually solvable using at most two recorded copies',()=>{
 const g=new EchoPuzzle();for(let index=0;index<LEVELS.length;index++){assert.equal(g.level,index);for(const [x,y,id]of g.map.pads){assert(g.toggleRecord());walk(g,[x,y],true);tick(g,.4);assert(g.toggleRecord());tick(g,8.5);assert(g.open(id.toLowerCase()),id+' must be held by a replayed recording');assert(g.echoes.length<=2);}for(const key of g.map.keys)walk(g,key);walk(g,g.map.exit);assert.equal(g.completed,index+1);}assert.equal(g.status,'won');
});
test('echoes cannot collect shards, full slots reject extra recordings, and clearing keeps earned shards',()=>{
 const g=new EchoPuzzle();const key=g.map.keys[0];g.map={...g.map,keys:[[g.x+1,g.y]]};assert(g.toggleRecord());assert(g.move(1,0));tick(g,.4);assert.equal(g.collected.size,0);assert(g.toggleRecord());tick(g,1);assert.equal(g.collected.size,0);assert(g.move(1,0));assert.equal(g.collected.size,1);g.clear();assert.equal(g.collected.size,1);assert.equal(g.echoes.length,0);assert(!g.recording);assert.deepEqual([g.x,g.y],g.map.start);for(let i=0;i<2;i++){assert(g.toggleRecord());tick(g,.4);assert(g.toggleRecord());}assert.equal(g.echoes.length,2);assert(!g.toggleRecord());g.x=12;g.y=6;g.clear();assert.deepEqual([g.x,g.y],g.map.start);assert.equal(g.collected.size,1);
});
function use(g,id){assert(g.walkTo(id));for(let i=0;i<800&&g.target;i++)g.update(.04);assert(!g.target,'Chef must reach '+id);assert(g.status==='playing');}
test('the chef can walk to stations, cook all three recipes and get paid from real matching orders',()=>{
 const g=new Kitchen();use(g,'bread');use(g,'cheese');use(g,'griddle');assert.equal(g.inventory.length,0);tick(g,3.2);use(g,'griddle');assert(g.inventory.includes('toast'));use(g,'serve');assert.equal(g.served,1);assert(g.money>=50);
 use(g,'tomato');use(g,'board');tick(g,1.9);use(g,'board');use(g,'pot');tick(g,3.5);use(g,'pot');use(g,'serve');assert.equal(g.served,2);
 use(g,'tomato');use(g,'board');tick(g,1.9);use(g,'board');use(g,'lettuce');use(g,'board');tick(g,1.9);use(g,'board');use(g,'plate');assert(g.inventory.includes('salad'));use(g,'serve');assert.equal(g.served,3);assert(g.money>=150);assert.equal(g.inventory.length,0);tick(g,121);assert.equal(g.status,'finished');
});
test('kitchen recipes conserve ingredients, full hands retain output, and burned food cannot be sold',()=>{
 const g=new Kitchen(),station=id=>{const s=STATIONS.find(s=>s.id===id);g.x=s.px;g.y=s.py;};g.inventory=['bread'];station('griddle');assert(!g.use());assert.deepEqual(g.inventory,['bread']);g.inventory.push('cheese');assert(g.use());assert(!g.use());tick(g,3.2);g.inventory=['tomato','lettuce'];assert(!g.use());assert(g.jobs.griddle.ready);g.inventory=[];tick(g,13);assert.equal(g.jobs.griddle.product,'burnt');assert(g.use());assert.deepEqual(g.inventory,['burnt']);station('serve');assert(!g.use());assert.equal(g.money,0);assert.deepEqual(g.inventory,['burnt']);station('trash');assert(g.use());assert.equal(g.inventory.length,0);
});
test('released and archived prototypes retain their collections and all three retain password saves',async()=>{
 const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));const secret=read('public/secret-games.json'),main=read('public/games.json'),archive=read('public/junkyard-games.json'),sources=read('game-sources.json');const ids=['deep-signal','afterimage','midnight-kitchen'];for(const id of ids){const released=id==='deep-signal';assert(!secret.some(g=>g.id===id));assert.equal(main.some(g=>g.id===id),released);assert.equal(archive.some(g=>g.id===id),!released);assert(sources.some(s=>s.id===id&&(released?!s.collection:s.collection==='junkyard')));assert.equal(saveGroup(id+'-prototype-v1').id,id);}const entries=ids.map(id=>[id+'-prototype-v1',JSON.stringify({best:123})]);assert.deepEqual((await decodeSaveCode(await encodeSaveCode(entries))).entries,entries);
});
