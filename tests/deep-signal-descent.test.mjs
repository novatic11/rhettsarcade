import test from 'node:test';import assert from 'node:assert/strict';
import {Dive,createSector,navigation,isFree,SPAWN,oxygenDrain,salvageVisibility} from '../public/games/deep-signal/model.js';
const advance=(g,seconds)=>{for(let n=0;n<Math.ceil(seconds/.04);n++)g.update(.04);};
test('procedural screens keep all salvage reachable and away from solid obstacles',()=>{
 for(const seed of [0,1,23,917,4294967295])for(const level of [1,2,3,5,10,25,100,10000]){const s=createSector(seed,level),nav=navigation(s.rocks);assert(s.caches.length>=5);assert(s.hazards.length>=2);assert(isFree(s.rocks,SPAWN.x,SPAWN.y));for(const c of s.caches){assert(isFree(s.rocks,c.x,c.y,29));assert(nav.points.some(p=>p.x===c.x&&p.y===c.y));}assert(s.rocks.length<=22);assert(s.hazards.length<=18);}
 const early=createSector(17,1),deep=createSector(17,12);assert(deep.rocks.length>early.rocks.length);assert(deep.hazards.length>early.hazards.length);assert(new Set(deep.hazards.map(h=>h.kind)).size>=4);assert.notDeepEqual(early.caches,createSector(17,2).caches);
});
test('collecting the final pod automatically descends, refills air and repairs exactly one hull segment',()=>{
 const g=new Dive(7);g.hull=2;g.air=12;for(const c of g.caches){g.x=c.x;g.y=c.y;assert(g.recover());assert(!g.collect(c.id));}assert(g.transition);assert.equal(g.cleared,1);assert.equal(g.level,1);const score=g.score;assert(!g.recover());advance(g,2);assert.equal(g.level,2);assert.equal(g.cleared,1);assert.equal(g.hull,3);assert(g.air>g.maxAir-.3);assert.equal(g.score,score);assert(g.remaining>=5);assert.equal(g.status,'playing');assert.equal(g.events.filter(e=>e==='clear').length,1);
});
test('real steering can collect a complete connected screen without a return trip or cargo limit',()=>{
 const g=new Dive(23);g.sector.hazards=[];
 while(!g.transition){const cache=g.nearest,nav=navigation(g.rocks,g),end=[...nav.points].sort((a,b)=>Math.hypot(a.x-cache.x,a.y-cache.y)-Math.hypot(b.x-cache.x,b.y-cache.y))[0],points=new Map(nav.points.map(p=>[p.id,p])),path=[];let id=end.id;while(id!==null){path.unshift(points.get(id));id=nav.prev.get(id);}for(const p of path){for(let i=0;i<350&&Math.hypot(g.x-p.x,g.y-p.y)>11&&!g.transition;i++){const dx=p.x-g.x-g.vx*.2,dy=p.y-g.y-g.vy*.2;g.update(.03,{left:dx< -3,right:dx>3,up:dy< -3,down:dy>3});assert.equal(g.status,'playing');}if(g.transition||g.caches[cache.id].taken)break;}if(!g.caches[cache.id].taken)g.recover();assert(g.caches[cache.id].taken);}
 assert.equal(g.total,g.caches.length);assert.equal(g.cleared,1);assert(g.air>0);assert(g.hull>0);
});
test('the descent has no final victory screen and remains bounded after many generated sectors',()=>{
 const g=new Dive(99);for(let screen=1;screen<=60;screen++){assert.equal(g.level,screen);for(const c of g.caches){g.x=c.x;g.y=c.y;g.recover();}advance(g,1.84);assert.equal(g.status,'playing');assert.equal(g.cleared,screen);assert(g.hazards.length<=18);assert(g.particles.length<=160);}assert.equal(g.level,61);assert(g.score>40000);
});
test('damage protection, mines, sonar cooldown and air depletion have real consequences',()=>{
 const g=new Dive(15);g.invulnerable=0;assert(g.hit());assert(!g.hit());assert.equal(g.hull,4);assert(g.ping());assert(!g.ping());g.sector.hazards=[];g.air=.01;g.update(.04);assert.equal(g.status,'lost');assert.equal(g.checkpoint(),null);const time=g.time;advance(g,2);assert.equal(g.time,time);
 const mine=new Dive(1);mine.invulnerable=0;mine.x=400;mine.y=90;mine.sector.rocks=[];mine.sector.hazards=[{id:0,kind:'mine',x:400,y:90,r:13,alive:true,mode:'patrol',clock:0,alert:0}];advance(mine,1.1);assert.equal(mine.hull,4);assert.equal(mine.hazards[0].mode,'burst');
});
test('a saved dive retains its screen, collected salvage, score and health; a cleared screen resumes below',()=>{
 const g=new Dive(78);const c=g.caches[0];g.x=c.x;g.y=c.y;g.recover();g.hull=3;g.air=33;const raw=JSON.parse(JSON.stringify(g.checkpoint())),r=Dive.restore(raw);assert(r);assert.equal(r.level,1);assert.equal(r.total,1);assert.equal(r.score,g.score);assert.equal(r.hull,3);assert.equal(r.air,33);assert(r.caches[0].taken);assert.equal(r.remaining,g.remaining);for(const c of g.caches){g.x=c.x;g.y=c.y;g.recover();}const next=Dive.restore(g.checkpoint());assert.equal(next.level,2);assert.equal(next.cleared,1);assert.equal(next.hull,4);assert.equal(next.recovered,0);assert.equal(Dive.restore({v:2,level:Infinity}),null);assert.equal(Dive.restore({...raw,hull:0}),null);
});
test('oxygen increases by 10% per descent, caps at 1.25× drain, and pods always restore 1.5 real seconds',()=>{
 assert.equal(oxygenDrain(1),1);assert.equal(oxygenDrain(2),1.1);assert(Math.abs(oxygenDrain(3)-1.21)<1e-12);assert.equal(oxygenDrain(9),1.25);assert.equal(oxygenDrain(1e9),1.25);
 for(const level of [1,2,3,9,100,1e9]){const g=new Dive(23);g.level=level;g.sector=createSector(g.seed,level);g.sector.hazards=[];g.air=30*g.drainRate;const before=g.airSeconds;advance(g,1);assert(Math.abs(g.airSeconds-(before-1))<1e-9);const c=g.caches[0];g.collect(c.id);assert(Math.abs(g.airSeconds-(before+.5))<1e-9);const resumed=Dive.restore(g.checkpoint());assert.equal(resumed.drainRate,g.drainRate);assert.equal(resumed.maxAir,90);assert.equal(resumed.airSeconds,g.airSeconds);}
 const g=new Dive(78);g.level=100;g.sector=createSector(g.seed,100);g.air=.1;for(const c of g.caches)g.collect(c.id);const saved=Dive.restore(g.checkpoint());assert.equal(saved.airSeconds,72);assert.equal(saved.maxAir,90);advance(g,1.8);assert.equal(g.airSeconds,72);
});
test('deep oxygen budgets permit full salvage routes with actual steering at the maximum drain',()=>{
 for(const seed of [0,1,7,23,78,99,917,4294967295])for(const level of [9,25,100]){
  const g=new Dive(seed);g.level=level;g.sector=createSector(seed,level);g.sector.hazards=[];g.invulnerable=1e6;let frames=0;
  while(!g.transition){assert(frames<10000,'route must make progress');const cache=g.nearest,nav=navigation(g.rocks,g),end=[...nav.points].sort((a,b)=>Math.hypot(a.x-cache.x,a.y-cache.y)-Math.hypot(b.x-cache.x,b.y-cache.y))[0],points=new Map(nav.points.map(p=>[p.id,p])),path=[];let id=end.id;while(id!==null){path.unshift(points.get(id));id=nav.prev.get(id);}for(const p of path){for(let i=0;i<350&&Math.hypot(g.x-p.x,g.y-p.y)>11&&!g.transition;i++){const dx=p.x-g.x-g.vx*.2,dy=p.y-g.y-g.vy*.2;g.update(.03,{left:dx< -3,right:dx>3,up:dy< -3,down:dy>3});frames++;assert.equal(g.status,'playing',`seed ${seed}, sector ${level} must have enough oxygen`);}if(g.transition||g.caches[cache.id].taken)break;}if(!g.caches[cache.id].taken)g.recover();assert(g.caches[cache.id].taken);
  }
  assert(g.airSeconds>10,`seed ${seed}, sector ${level} should leave a useful oxygen margin`);
 }
});
test('distant sonar echoes hold for half a second, fade out, and can be revealed by another ping',()=>{
 const g=new Dive(15);g.sector.hazards=[];g.sector.rocks=[];const c=g.caches[0];c.x=g.x+400;c.y=g.y;
 assert.equal(salvageVisibility(c,g),0);assert(g.ping());advance(g,.88);assert.equal(salvageVisibility(c,g),0);advance(g,.12);assert.equal(salvageVisibility(c,g),.85);const detected=c.echoAt;advance(g,.4);assert.equal(c.echoAt,detected);assert.equal(salvageVisibility(c,g),.85);advance(g,.24);const fading=salvageVisibility(c,g);assert(fading>0&&fading<.85);advance(g,.3);assert.equal(salvageVisibility(c,g),0);advance(g,1.2);assert(g.ping());advance(g,1);assert.equal(salvageVisibility(c,g),.85);
 const raw=g.checkpoint(),resumed=Dive.restore({...raw,seen:[c.id]});assert(!('seen' in raw));assert.equal(salvageVisibility(resumed.caches[c.id],{...resumed,x:0,y:0}),0);g.x=c.x-100;assert.equal(salvageVisibility(c,g),1);c.taken=true;assert.equal(salvageVisibility(c,g),0);
});
