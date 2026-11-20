import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/games/neon-slip/index.html',import.meta.url),'utf8');
const bossSource=readFileSync(new URL('../public/games/neon-slip/boss.js',import.meta.url),'utf8');
const flightSource=readFileSync(new URL('../public/games/neon-slip/flight-fx.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../public/games/neon-slip/obstacles.js',import.meta.url),'utf8');
function game({reduced=false,profile='standard'}={}){
 const elements=new Map(),noop=()=>{},ctx=new Proxy({},{get:(_,key)=>['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop:noop}):noop,set:()=>true});
 const element=id=>{if(!elements.has(id))elements.set(id,{style:{},classList:{add:noop,remove:noop,toggle:noop},setAttribute:noop,addEventListener:noop,getContext:()=>ctx,getBoundingClientRect:()=>({width:420,height:740}),setPointerCapture:noop});return elements.get(id)};
 const document={getElementById:element,body:element('body'),addEventListener:noop};
 const window={addEventListener:noop};
 const context=vm.createContext({document,window,matchMedia:()=>({matches:reduced}),arcadeSettings:{profile},localStorage:{getItem:()=>null,setItem:noop},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame:noop,setTimeout:noop,console,Uint32Array});
 vm.runInContext(source,context);vm.runInContext(flightSource,context);vm.runInContext(bossSource,context);
 let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 script=script.replace(/\}\)\(\);\s*$/,`globalThis.api={engine:obstacles,bosses,beginBoss,flight,frameClock,draw,start,dash,pause,update,keys,set(v){if('bossDirector'in v)bossDirector=v.bossDirector;if('score'in v)score=v.score;if('invincible'in v)invincible=v.invincible;if('keys'in v)keys=v.keys;if('px'in v)px=v.px;if('target'in v)target=v.target;if('gates'in v)gates=v.gates;if('shield'in v)shield=v.shield;if('dashTime'in v)dashTime=v.dashTime;if('spawn'in v)spawn=v.spawn;if('t'in v)t=v.t;if('pending'in v)pendingWave=v.pending;if('items'in v)items=v.items},state(){return {mode,shield,dashTime,charge,gateCount,score,gates,items,t,px,playerY,trail,particles,boss,bossCount,bossWins,bossDirector}}};})();`);
 vm.runInContext(script,context);return context.api;
}
const engine=game().engine;
const wave=(type,speed=205,seed=1)=>engine.createWave({type,seed,mirror:false,label:engine.specs[type].label,hint:engine.specs[type].hint},speed,210);

test('shuffled decks cover all ten encounters without repeats; first encounter is a gentle warmup',()=>{
 for(let seed=1;seed<=50;seed++){
  const a=engine.createRoute(seed),b=engine.createRoute(seed);let previous='';
  for(let i=0;i<31;i++){const r=a.next();assert.deepEqual(r,b.next());assert.notEqual(r.type,previous);previous=r.type;if(i===0){assert.equal(r.type,'debris');assert.equal(r.warmup,true)}}
  const r=engine.createRoute(seed);r.next();for(let deck=0;deck<4;deck++){const types=new Set();for(let i=0;i<10;i++)types.add(r.next().type);assert.equal(types.size,10)}
 }
});
test('patterns have different spatial and temporal behavior',()=>{
 const debris=wave('debris');assert.equal(engine.parts(debris).length,5);assert.ok(new Set(engine.parts(debris).map(p=>p.y)).size>1);
 const slalom=engine.parts(wave('slalom'));assert.equal(slalom.length,3);assert.ok(slalom.every(p=>p.shape==='rect'&&p.h===140));assert.notEqual(slalom[0].x,slalom[1].x);
 const rotor=wave('rotor'),a=engine.parts(rotor)[0];engine.tick(rotor,.25,0,210);const b=engine.parts(rotor)[0];assert.equal(a.shape,'capsule');assert.notEqual(a.bx,b.bx);assert.notEqual(a.by,b.by);
 const crossfire=wave('crossfire'),x=engine.parts(crossfire)[0].x;engine.tick(crossfire,.5,0,210);assert.notEqual(engine.parts(crossfire)[0].x,x);
});
test('laser tracks, locks, gives 0.8 seconds to evade, fires and expires',()=>{
 const g=wave('hunter');engine.tick(g,.2,0,100);assert.equal(g.targetX,100);assert.equal(engine.parts(g).length,0);
 engine.tick(g,.3,0,120);assert.equal(g.locked,true);assert.equal(g.targetX,120);assert.equal(engine.laserStage(g),'locked');
 engine.tick(g,.7,0,330);assert.equal(g.targetX,120);assert.equal(engine.parts(g).length,0);
 engine.tick(g,.06,0,330);assert.equal(engine.laserStage(g),'firing');assert.ok(engine.sweep([],engine.parts(g),120,628,120,628).hit);assert.ok(!engine.sweep([],engine.parts(g),330,628,330,628).hit);
 engine.tick(g,.55,0,330);assert.equal(engine.parts(g).length,0);engine.tick(g,.3,0,330);assert.equal(engine.done(g),true);
});
test('swept collisions catch small projectiles, barriers, and rotating arms during fast movement',()=>{
 for(const shape of [
  {shape:'circle',x:210,y:500,r:15},
  {shape:'rect',x:195,y:500,w:30,h:10},
  {shape:'capsule',x:180,y:500,bx:240,by:500,r:8}
 ]){const end={...shape,y:720,...(shape.by?{by:720}:{})};assert.ok(engine.sweep([shape],[end],210,628,210,628).hit);assert.ok(!engine.sweep([shape],[end],330,628,330,628).hit)}
});
test('every encounter has a reachable route at 1x and 5x without requiring dash',()=>{
 for(const type of Object.keys(engine.specs))for(const speed of [205,1025])for(let seed=1;seed<=3;seed++){
  const g=wave(type,speed,seed);let reachable=new Set([210]);const positions=Array.from({length:32},(_,i)=>24+i*12);
  for(let frame=0;frame<900&&!engine.done(g);frame++){
   const before=engine.parts(g);engine.tick(g,1/30,speed/30,210);const after=engine.parts(g),next=new Set();
   for(const x of positions){for(const old of reachable){if(Math.abs(x-old)>13.1)continue;if(!engine.sweep(before,after,old,628,x,628).hit){next.add(x);break}}}
   reachable=next;assert.ok(reachable.size,`${type} at ${speed}, seed ${seed}, frame ${frame}`);
  }
  assert.equal(engine.done(g),true);
 }
});
test('each encounter supports lethal hits, shields and dash',()=>{
 for(const type of Object.keys(engine.specs))for(const protection of ['none','shield','dash']){
  const g=game();g.start();const h=wave(type);h.y=628;if(type==='hunter'){h.age=1.3;h.locked=true}
  const p=engine.parts(h)[0],x=p.shape==='capsule'?(p.x+p.bx)/2:p.shape==='rect'?Math.max(30,p.x+30):p.x;
  if(p.shape==='capsule')h.y+=628-(p.y+p.by)/2;
  g.set({gates:[h],spawn:100,px:x,target:x,shield:protection==='shield',dashTime:protection==='dash'?.72:0});g.update(.016);
  assert.equal(g.state().mode,protection==='none'?'over':'playing',`${type} / ${protection}`);
  if(protection==='shield')assert.equal(g.state().shield,false);
  if(protection==='dash')assert.equal(h.broken,true);
 }
});
test('pause freezes encounter time, restart clears hazards; rendering covers every shape and laser stage',()=>{
 const g=game();g.start();const h=wave('hunter');g.set({gates:[h],spawn:100});g.pause();g.update(.5);assert.equal(h.age,0);g.pause();g.update(.2);assert.equal(h.age,.2);g.start();assert.equal(g.state().gates.length,0);
 for(const type of Object.keys(engine.specs)){for(const age of [0,.5,1.3,1.9]){const h=wave(type);h.y=400;h.age=age;g.set({gates:[h]});g.draw();h.broken=true;g.draw()}}
});
test('laser encounters are isolated; other encounters retain reaction space',()=>{
 const g=game();g.start();const h=wave('slalom');h.y=200;h.broken=true;g.set({gates:[h],pending:{type:'hunter',seed:1,label:'LASER'},spawn:0});g.update(.016);assert.equal(g.state().gates.length,1);
 h.passed=true;g.update(.016);g.update(.5);assert.equal(g.state().gates[0].type,'hunter');
 const laser=g.state().gates[0];g.set({pending:{type:'debris',seed:1,label:'DEBRIS'},spawn:0});g.update(.016);assert.equal(g.state().gates[0],laser);assert.equal(g.state().gates.length,1);
});
test('collectibles follow the new choreography and encounter rewards are counted once',()=>{
 const g=game();g.start();const h=wave('debris');h.y=628;h.broken=true;
 g.set({gates:[h],spawn:100,px:210,target:210,items:[{x:210,y:620,offset:0,type:'spark',gate:h,hit:false}]});
 g.update(.016);assert.equal(g.state().items.length,0);assert.ok(g.state().score>=30);
 h.y=10000;g.update(.016);assert.equal(g.state().gateCount,1);const score=g.state().score;g.update(.016);assert.equal(g.state().gateCount,1);assert.ok(g.state().score<score+1);
});

test('proximity mines warn before expanding, expire, and keep stable collision identities',()=>{
 const h=wave('mines');h.y=580;const n=h.nodes[0];engine.tick(h,.01,0,n.x);assert.equal(n.fuse,0);assert.equal(n.lockY,580);assert.equal(engine.parts(h)[0].r,18);engine.tick(h,.65,100,n.x);assert.equal(engine.parts(h)[0].y,628);assert.equal(engine.parts(h)[0].r,18);engine.tick(h,.2,20,n.x);assert.ok(engine.parts(h)[0].r>50);assert.ok(engine.sweep([],engine.parts(h),n.x,628,n.x,628).hit);const before=engine.parts(h);engine.tick(h,.4,20,n.x);assert.ok(!engine.parts(h).some(p=>p.id==='mine0'));assert.ok(!engine.sweep(before,engine.parts(h),n.x,628,n.x,628).hit);
});
test('crusher rewards follow moving openings; wrecking balls rebound within the arena',()=>{
 const h=wave('crusher'),reward=h.rewards[0],a=engine.rewardPosition(h,reward).x;engine.tick(h,.5,0,210);const b=engine.rewardPosition(h,reward).x,parts=engine.parts(h);assert.notEqual(a,b);assert.ok(b>parts[0].x+parts[0].w+30&&b<parts[1].x-30);
 const ball=wave('wrecking');let previous=null,turns=0,lastDirection=0;for(let i=0;i<300;i++){engine.tick(ball,.05,0,210);const x=engine.parts(ball)[0].x;assert.ok(x>=60&&x<=360);if(previous!==null){const direction=Math.sign(x-previous);if(lastDirection&&direction!==lastDirection)turns++;lastDirection=direction}previous=x}assert.ok(turns>=3);
});

test('fixed simulation timing matches at 30, 60 and 144 Hz and bounds stalls',()=>{
 const api=game();for(const fps of [30,60,144]){let simulated=0,calls=0;api.frameClock.reset();for(let i=0;i<=fps*2;i++)api.frameClock.advance(i*1000/fps,dt=>{simulated+=dt;calls++});assert.ok(Math.abs(simulated-2)<1e-8);assert.equal(calls,240)}
 let calls=0;api.frameClock.reset();api.frameClock.advance(0,()=>calls++);api.frameClock.advance(60000,()=>calls++);assert.equal(calls,12);
});
test('visual effects stay bounded, expire, pause, and clear on restart',()=>{
 const api=game();api.start();for(let i=0;i<100;i++){api.flight.event('dash',210,628);api.flight.event('near',210,628)}assert.ok(api.flight.counts.rings<=12);assert.ok(api.flight.counts.labels<=8);api.pause();api.update(.2);assert.equal(api.flight.counts.rings,12);api.pause();api.set({spawn:100,gates:[]});for(let i=0;i<150;i++)api.update(1/120);assert.equal(api.flight.counts.rings,0);assert.equal(api.flight.counts.labels,0);assert.ok(api.state().trail.length<=31);api.flight.event('dash',210,628);api.start();assert.equal(api.flight.counts.rings,0);assert.equal(api.flight.bank,0);
});

test('keyboard steering reverses immediately and gameplay time is consistent across refresh rates',()=>{
 for(const fps of [30,60,144]){const api=game();api.start();api.set({spawn:100});for(let i=0;i<=fps*2;i++)api.frameClock.advance(i*1000/fps,api.update);assert.ok(Math.abs(api.state().t-2)<1e-8);assert.ok(Math.abs(api.state().score-10)<1e-8)}
 const api=game();api.start();api.set({spawn:100,keys:{d:true}});for(let i=0;i<30;i++)api.update(1/120);const x=api.state().px;assert.ok(Math.abs(x-307.5)<1e-8);api.set({keys:{a:true}});api.update(1/120);assert.ok(api.state().px<x);assert.ok(api.flight.bank>0);api.set({keys:{a:true,d:true}});for(let i=0;i<5;i++)api.update(1/120);assert.ok(api.state().px>=24&&api.state().px<=396);
});

test('reduced motion suppresses ship banking and Chromebook effects render without changing gameplay',()=>{
 const api=game({reduced:true,profile:'chromebook'});api.start();api.flight.tick(.1,400);assert.equal(api.flight.bank,0);assert.equal(api.flight.low,true);assert.equal(api.flight.reduced,true);api.dash();api.update(.016);api.draw();assert.equal(api.state().mode,'playing');assert.ok(api.state().dashTime>0);
});

const bossEngine=game().bosses;
test('boss director rolls exactly once per 1000 score, at a strict 25 percent threshold',()=>{
 let calls=0;const rolls=[.249999,.25,.99,0];const d=bossEngine.createDirector(()=>rolls[calls++]);d.observe(999.99);assert.equal(calls,0);d.observe(1000);assert.equal(calls,1);assert.equal(d.pending,1);d.observe(1000);d.observe(1999);assert.equal(calls,1);d.observe(3100);assert.equal(calls,3);assert.equal(d.pending,1);assert.equal(d.take(),true);assert.equal(d.take(),false);d.observe(4000);assert.equal(calls,4);assert.equal(d.pending,1);assert.equal(d.next,5000);
});
test('boss loadouts are seeded, draw four unique modules from eight weapons, and cover every gun',()=>{
 const modules=new Set(),guns=new Set(),layouts=new Set();for(let seed=1;seed<=80;seed++){const a=bossEngine.createFight(seed),b=bossEngine.createFight(seed);assert.equal(a.gun,b.gun);assert.deepEqual(a.modules.map(m=>m.type),b.modules.map(m=>m.type));assert.equal(new Set(a.modules.map(m=>m.type)).size,4);a.modules.forEach(m=>modules.add(m.type));guns.add(a.gun);layouts.add(a.modules.map(m=>m.type).join(','))}assert.equal(modules.size,8);assert.equal(guns.size,3);assert.ok(layouts.size>50);
});
test('boss waits for the current obstacle to clear and stops new normal waves',()=>{
 const api=game();api.start();api.set({score:1000,bossDirector:bossEngine.createDirector(()=>0)});const h=wave('debris');h.y=300;h.broken=true;api.set({gates:[h],spawn:0});api.update(.01);assert.equal(api.state().boss,null);assert.equal(api.state().gates.length,1);h.y=10000;api.update(.01);api.update(.01);assert.ok(api.state().boss);assert.equal(api.state().gates.length,0);assert.equal(api.state().boss.armor,3);assert.equal(api.state().charge,100);for(let i=0;i<100;i++)api.update(1/120);assert.equal(api.state().gates.length,0);assert.equal(api.state().bossCount,1);
});
test('boss arrival is safe, core is shielded until modules are destroyed, and dead modules stop firing',()=>{
 const f=bossEngine.createFight(5),input={x:210,y:628,invulnerable:true};bossEngine.tick(f,1,input);assert.equal(f.stage,'arrival');assert.equal(f.shots.length,0);assert.equal(f.projectiles.length,0);bossEngine.tick(f,1,input);assert.equal(f.stage,'active');const hp=f.core;for(let i=0;i<120;i++)bossEngine.tick(f,1/120,{...input,x:f.x});assert.equal(f.core,hp);
 const m=f.modules[0],p=bossEngine.modulePosition(f,m);f.shots=[{x:p.x,y:p.y+5,life:1,speed:1000,damage:10000}];let events=bossEngine.tick(f,.01,input);assert.equal(m.hp,0);assert.ok(events.some(e=>e.type==='module'));for(let i=0;i<500;i++){events=bossEngine.tick(f,1/120,input);assert.ok(!events.some(e=>e.type==='attack'&&e.weapon===m.type))}
});
test('all three temporary guns can destroy all modules, expose the core, and win different seeded fights',()=>{
 for(const gun of Object.keys(bossEngine.guns))for(let seed=1;seed<=8;seed++){const f=bossEngine.createFight(seed);f.gun=gun;let x=210,destroyed=0,exposed=0,victories=0;for(let frame=0;frame<120*60&&f.stage!=='victory';frame++){const live=f.modules.filter(m=>m.hp>0);const target=live.length?bossEngine.modulePosition(f,live.reduce((a,b)=>Math.abs(a.offset+f.x-x)<Math.abs(b.offset+f.x-x)?a:b)).x:f.x;const previousX=x;x+=Math.max(-390/120,Math.min(390/120,target-x));const events=bossEngine.tick(f,1/120,{x,y:628,previousX,previousY:628,invulnerable:true});destroyed+=events.filter(e=>e.type==='module').length;exposed+=events.filter(e=>e.type==='exposed').length;victories+=events.filter(e=>e.type==='victory').length;}assert.equal(f.stage,'victory',gun+' seed '+seed);assert.equal(destroyed,4);assert.equal(exposed,1);assert.equal(victories,1);assert.equal(f.projectiles.length,0);assert.equal(f.shots.length,0);assert.equal(f.hazards.length,0);}
});
test('boss attacks damage combat hull; dash and shields protect it; pause freezes the fight and restart clears it',()=>{
 for(const defense of ['none','shield','dash']){const api=game();api.start();api.beginBoss();const f=api.state().boss;f.stage='active';f.projectiles=[{id:'test',x:210,y:625,vx:0,vy:160,r:6,age:0,kind:'orb'}];api.set({invincible:0,shield:defense==='shield',dashTime:defense==='dash'?.72:0});api.update(.016);assert.equal(f.armor,defense==='none'?2:3);assert.equal(api.state().mode,'playing');if(defense==='shield')assert.equal(api.state().shield,false);api.pause();const age=f.age;api.update(.2);assert.equal(f.age,age);api.pause();api.start();assert.equal(api.state().boss,null);assert.equal(api.state().bossCount,0);assert.equal(api.state().bossDirector.next,1000);}
});
test('defeating a boss awards rewards once, disarms the gun, and resumes the route safely',()=>{
 const api=game();api.start();api.beginBoss();const f=api.state().boss;f.stage='active';f.modules.forEach(m=>m.hp=0);f.core=1;f.shots=[{x:f.x,y:f.y+10,life:1,speed:1000,damage:10}];api.update(.016);assert.equal(f.stage,'victory');assert.equal(api.state().bossWins,1);const score=api.state().score;assert.ok(score>=400);for(let i=0;i<250;i++)api.update(1/120);assert.equal(api.state().boss,null);assert.equal(api.state().bossWins,1);assert.ok(api.state().score<score+20);assert.equal(api.state().charge,100);assert.equal(api.state().gates.length,0);
});
test('boss renderer covers every module, projectile, attack stage, and reduced-effects profile',()=>{
 const api=game();api.start();api.beginBoss();const f=api.state().boss;f.stage='active';for(const type of Object.keys(bossEngine.weapons)){f.modules[0].type=type;for(const age of [0,.8,1.1,1.5]){f.hazards=[{id:'r',kind:'rail',x:150,y:300,age,color:'#ff88bd'},{id:'m',kind:'mortar',x:270,y:620,age,color:'#b6a1ff'},{id:'f',kind:'fence',x:210,y:400,gap:138,age,color:'#86f2df'}];f.projectiles=['orb','rocket','saw','drone','helix'].map((kind,i)=>({kind,x:80+i*60,y:440,r:8,age,vx:12,vy:140,color:'#aaffee',target:210}));api.draw();}}for(const gun of Object.keys(bossEngine.guns)){f.gun=gun;api.draw()}f.stage='victory';api.draw();
});
test('overlapping boss attack patterns retain an escape route without mandatory dash',()=>{
 const positions=Array.from({length:32},(_,i)=>24+i*12);
 for(let seed=1;seed<=8;seed++){
  const f=bossEngine.createFight(seed);f.stage='active';f.fire=1e9;let reachable=new Set([210]);
  for(let frame=0;frame<720;frame++){
   const before=bossEngine.dangerParts(f);bossEngine.tick(f,1/30,{x:210,y:628,invulnerable:true});const after=bossEngine.dangerParts(f),next=new Set();
   for(const x of positions)for(const old of reachable){if(Math.abs(x-old)>13.1)continue;if(!engine.sweep(before,after,old,628,x,628).hit){next.add(x);break}}
   reachable=next;assert.ok(reachable.size,'Boss seed '+seed+' frame '+frame);
  }
 }
});

test('the third unprotected boss hit ends the run, while disabling a rail module cancels its beam',()=>{
 const api=game();api.start();api.beginBoss();const f=api.state().boss;f.stage='active';f.armor=1;f.projectiles=[{id:'last',x:210,y:625,vx:0,vy:160,r:6,age:0,kind:'orb'}];api.set({invincible:0});api.update(.016);assert.equal(api.state().mode,'over');assert.equal(f.armor,0);
 const fight=bossEngine.createFight(9);fight.stage='active';const m=fight.modules[0];m.type='rail';const p=bossEngine.modulePosition(fight,m);fight.hazards=[{id:'beam',kind:'rail',module:m.id,x:210,y:p.y,age:1.1,color:'#ff88bd'}];assert.ok(bossEngine.dangerParts(fight).some(p=>p.id==='beam'));fight.shots=[{x:p.x,y:p.y+5,life:1,speed:1000,damage:10000}];bossEngine.tick(fight,.01,{x:300,y:628,invulnerable:true});assert.equal(m.hp,0);assert.ok(!bossEngine.dangerParts(fight).some(p=>p.id==='beam'));
});
