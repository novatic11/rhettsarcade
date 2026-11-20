import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';
const source=fs.readFileSync(new URL('../public/games/the-undercroft/index.html',import.meta.url),'utf8');
const scripts=[...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
function setup(){const window={};const context=vm.createContext({window});vm.runInContext(scripts.find(x=>x.includes('window.UndercroftCombat=')),context);vm.runInContext(scripts.find(x=>x.includes('window.UndercroftRooms=')),context);return window;}
function enemy(type){return{id:0,type,x:800,y:551,startX:800,baseY:551,r:18,hp:110,maxHp:110,platform:null,timer:2,tele:0,slow:0,burn:0,walk:1,hit:0,fireScale:1,projectileScale:1,moveRange:55};}
function environment(e){const events={shots:0,hazards:[],announcements:[]};const env={player:{x:350,y:550,vx:100,vy:0,r:19},enemies:[e],points:[{x:400,y:180},{x:780,y:160},{x:640,y:400}],platforms:[{x:580,y:410,w:130}],bullets:[],depth:12,fire(foe){events.shots++;foe.timer=foe.arsenal[foe.armIndex].cooldown;foe.armIndex=(foe.armIndex+1)%foe.arsenal.length;},emit(){},hazard(h){events.hazards.push(h)},announce(s){events.announcements.push(s)}};return{env,events};}
test('ten new types unlock progressively; seeded chambers keep the solo Rival and fifth-room bosses',()=>{
 const w=setup(),types=w.UndercroftCombat.TYPES;assert.equal(types.length,10);assert.equal(new Set(types.map(x=>x.id)).size,10);
 const seen=new Set();for(let depth=2;depth<=25;depth++)for(let seed=1;seed<=35;seed++){const room=w.UndercroftRooms.generate(depth,seed);for(const e of room.enemies){assert(Number.isFinite(e.hp)&&e.hp>0);assert(e.x>=63&&e.x<=1137);assert(e.y<=569);if(types.some(t=>t.id===e.type)){seen.add(e.type);assert(depth>=types.find(t=>t.id===e.type).depth);}}
   if(depth===15){assert.equal(room.enemies.length,1);assert(room.enemies[0].rival);}else if(depth%5===0){assert(room.enemies.some(e=>e.type==='boss'));assert(room.enemies.find(e=>e.type==='boss').arsenal.length>=2);}
 }
 assert.equal(seen.size,10);assert.equal(w.UndercroftRooms.generate(1,1,true).enemies.length,0);
});
test('every creature attacks, stays finite, and has a distinct usable behavior',()=>{
 const ai=setup().UndercroftCombat;
 for(const type of ai.TYPES){const e=enemy(type.id);ai.configure(e);const {env,events}=environment(e);const initialX=e.x;
   const ally={id:2,type:'gunner',x:700,y:550,r:18,hp:10,maxHp:100};env.enemies.push(ally);
   for(let n=0;n<1000;n++){ai.update(e,.016,env);assert(Number.isFinite(e.x)&&Number.isFinite(e.y));assert(e.x>=63&&e.x<=1137);assert(e.y>=65&&e.y<=569);assert(e.tele>=0&&e.tele<=1);}
   if(['mortar','trapper','leaper'].includes(type.id)){assert(events.hazards.length>0,type.id);assert(events.hazards.every(h=>h.fuse>=.4&&h.r>=40&&h.damage>0));}
   else if(type.id==='skitter')assert.notEqual(e.x,initialX);
   else if(type.id==='medic')assert(ally.hp>10);
   else assert(events.shots>0,type.id);
 }
});
test('boss chooses a weapon for range, changes phase, preserves immobile bodies, and exposes recovery',()=>{
 const ai=setup().UndercroftCombat,e={...enemy('boss'),build:'huge / immobile',moveRange:0,maxHp:1000,hp:1000,arsenal:[{mode:'spread',speed:250,cooldown:2.5,warning:.8},{mode:'bolt',speed:490,cooldown:2.5,warning:.8}],armIndex:0};
 assert.equal(ai.chooseArm(e,{x:600,y:e.y}),0);assert.equal(ai.chooseArm(e,{x:200,y:e.y}),1);
 const {env,events}=environment(e);for(let n=0;n<200;n++)ai.update(e,.016,env);assert.equal(e.x,800);assert(events.shots>0);assert.equal(e.phase,1);
 e.hp=400;ai.update(e,.016,env);assert.equal(e.phase,2);assert.equal(events.announcements.length,1);
 e.timer=.01;e.tele=.8;ai.update(e,.016,env);assert.equal(e.intent,'Recovering');assert(e.tactics.recovery>0);assert(e.timer>=1.45);
 const small={...enemy('boss'),build:'small / fast',moveRange:155,arsenal:e.arsenal,armIndex:0};const smallEnv=environment(small).env;smallEnv.player.x=1000;const start=small.x;for(let n=0;n<50;n++)ai.update(small,.016,smallEnv);assert.notEqual(small.x,start);
});
test('oracle shows its destination and commits its aim after blinking before firing',()=>{
 const ai=setup().UndercroftCombat,e=enemy('oracle');ai.configure(e);const {env,events}=environment(e);e.timer=.84;ai.update(e,.016,env);assert(e.tactics.blink);assert.equal(e.x,800);assert.equal(events.shots,0);
 for(let n=0;n<30;n++)ai.update(e,.016,env);assert(e.tactics.blinked);assert.equal(events.shots,0);const aim=e.aim;env.player.x+=250;ai.update(e,.016,env);assert.equal(e.aim,aim);
 for(let n=0;n<40;n++)ai.update(e,.016,env);assert.equal(events.shots,1);
});
