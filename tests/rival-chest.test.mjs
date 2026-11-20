import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';
const source=fs.readFileSync(new URL('../public/games/the-undercroft/index.html',import.meta.url),'utf8');
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const code=part('function clearRoom(){','function hurt(')+part('function shoot(','function enemyFire(')+part('function rivalRewardChest(','function premiumCost(')+part('function openChest(','function showOverlay(');
function run(rival=true){
 const nodes=new Map(),enemy={id:1,type:rival?'boss':'gunner',rival,x:500,y:300,hp:10,maxHp:10,scrapDrop:5};
 const c=vm.createContext({s:{depth:rival?15:5,clear:false,hp:120,maxHp:120,roomHeal:0,scraps:0,scrapMult:1,kills:0,weapon:0,weapons:[0],weaponSlots:1,fireMult:1,damageMult:1,crit:0},player:{x:100,y:100,weaponShots:{},shot:0},enemies:[enemy],hazards:[],chests:[],room:{chestSpots:[480,800]},bullets:[],particles:[],guide:null,save:{best:0},time:0,GROUND:570,LEFT:48,RIGHT:1152,menu:false,dead:false,bag:[],WEAPONS:[{name:'A',rate:2,damage:10,speed:300,mode:'single',tier:0},{name:'B',rate:10,damage:8,speed:500,mode:'single',tier:3},{name:'C',rate:4,damage:12,speed:400,mode:'single',tier:1}],clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),$:(id)=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)},emit(){},sfx(){},updateObjective(){},updateHud(){},persist(){},toast(){},showOverlay(){},hideOverlay(){}});
 vm.runInContext(code,c);return c;
}
test('killing the Rival drops exactly one free slot chest alongside the scheduled room chests',()=>{
 const c=run();c.harmEnemy(c.enemies[0],10);assert(c.s.clear);assert.equal(c.chests.length,3);assert.equal(c.chests.filter(x=>x.rival).length,1);assert.equal(c.chests.filter(x=>x.premium).length,1);
 const reward=c.chests.find(x=>x.rival);assert.equal(reward.premium,false);assert(c.chests.filter(x=>!x.rival).every(x=>Math.abs(x.x-reward.x)>=80));
 c.harmEnemy(c.enemies[0],100);c.clearRoom();assert.equal(c.chests.length,3);
 const normal=run(false);normal.harmEnemy(normal.enemies[0],10);assert.equal(normal.chests.length,1);assert(!normal.chests.some(x=>x.rival));
});
test('opening grants one extra slot without charging scraps or losing the original weapon',()=>{
 const c=run();c.harmEnemy(c.enemies[0],10);const chest=c.chests.find(x=>x.rival),scraps=c.s.scraps;
 c.openChest(chest);assert.equal(c.s.weaponSlots,2);assert.equal(c.s.scraps,scraps);assert.deepEqual(Array.from(c.s.weapons),[0]);assert(chest.opened);
 c.menu=false;c.openChest(chest);assert.equal(c.s.weaponSlots,2);
 c.equipWeapon(1);assert.deepEqual(Array.from(c.s.weapons),[0,1]);c.s.weapon=0;c.equipWeapon(2);assert.deepEqual(Array.from(c.s.weapons),[2,1]);
});
test('both equipped weapons fire at their own rates and retain their projectile properties',()=>{
 const c=run();c.s.weaponSlots=2;c.equipWeapon(1);c.fireEquippedWeapons(.01);assert.equal(c.bullets.length,2);assert.deepEqual(Array.from(c.bullets,b=>b.tier),[0,3]);
 c.fireEquippedWeapons(.05);assert.equal(c.bullets.length,2);c.fireEquippedWeapons(.051);assert.equal(c.bullets.length,3);assert.equal(c.bullets.at(-1).tier,3);
 c.s.weapon=0;assert.equal(c.bullets.at(-1).tier,3);
});
