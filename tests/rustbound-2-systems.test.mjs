import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {BODIES,BODY_IDS,LANDABLE_IDS,SYSTEMS,systemAt,systemBodies,systemSurvey,orbitPath} from '../public/games/rustbound-2/system.js';
import {OUTER_WORLDS} from '../public/games/rustbound-2/system-expansion.js';
import {Demo,groundPoint,landingPoint,nearestBody,length,sub,gravity,terrainHeight,unit} from '../public/games/rustbound-2/world.js';
import {Campaign,depositsFor,discoveriesFor,MINERALS,DAY_LENGTH} from '../public/games/rustbound-2/expedition.js';
import {atlasRows,bodySummary,stellarAtlasCards} from '../public/games/rustbound-2/system-atlas.js';
import {FOOTSTEP_PROFILES} from '../public/games/rustbound-2/footstep-profiles.js';
import {WORMHOLES,wormholePoint,ENTRY_RANGE} from '../public/games/rustbound-2/wormholes.js';
import {chargeShip} from './rb2-fixtures.mjs';
const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/rb2-original-bodies.json',import.meta.url)));
test('the five outer systems each have fourteen authored destinations, giants, moons and outer dwarfs',()=>{
 assert.equal(OUTER_WORLDS.length,40);assert.equal(BODY_IDS.length,88);assert.equal(LANDABLE_IDS.length,71);
 for(const id of Object.keys(SYSTEMS).filter(id=>id!=='helios')){const s=systemSurvey(id);assert.equal(s.bodies,14);assert.equal(s.giants,2);assert.equal(s.landable,12);assert(s.moons>=6&&s.dwarfs>=2);assert(SYSTEMS[id].highlight.length>45);const giant=systemBodies(id).map(key=>BODIES[key]).filter(b=>b.giant);assert(giant.some(b=>b.category==='ice-giant'));assert(giant.some(b=>b.rings));assert(new Set(giant.map(b=>JSON.stringify(b.giantStyle))).size===2);}
});
test('existing body positions, gravity, radii, parentage, IDs and solar-day lengths remain compatible',()=>{
 for(const [id,before]of Object.entries(legacy.bodies))for(const [key,value]of Object.entries(before))assert.deepEqual(BODIES[id][key],value,id+' '+key);
 assert.deepEqual(LANDABLE_IDS.slice(0,legacy.landable.length),legacy.landable);
 legacy.landable.forEach((id,i)=>assert.equal(DAY_LENGTH[id],(480+i*37)*2.5));
 const d=Demo.restore({v:3,body:'dusk',mode:'foot',normal:[0,1,0],campaign:{v:2,industry:{v:2,states:{dusk:{'kept-store':{stock:{ice:17}}}}},starterBasePolicy:1,money:5432,bases:{dusk:{ore:{ice:17},buildings:[{id:'kept-drill',type:'drill',x:24,z:18,yaw:0,paid:125},{id:'kept-store',type:'warehouse',x:-20,z:-10,yaw:0,paid:90}]}},progress:{landed:['dusk'],flags:[{id:'flag-3',body:'dusk',normal:[0,1,0],name:'Old colony'}]}}});
 assert.equal(d.body,'dusk');assert.equal(d.campaign.money,5432);assert.equal(d.campaign.bases.dusk.buildings[0].id,'kept-drill');assert.equal(d.campaign.bases.dusk.ore.ice,17);assert.equal(d.campaign.progress.flags[0].name,'Old colony');assert(d.campaign.progress.landed.has('dusk'));const restored=Demo.restore(d.checkpoint()).campaign;assert.equal(restored.money,d.campaign.money);assert.deepEqual(restored.bases.dusk,d.campaign.bases.dusk);assert.deepEqual(restored.industry.states.dusk,d.campaign.industry.states.dusk);assert.deepEqual(restored.progress.snapshot(),d.campaign.progress.snapshot());
});
test('every orbit has safe parent clearance, every body remains inside its own system, and no bodies overlap',()=>{
 for(const id of BODY_IDS){const b=BODIES[id];assert(b.position.every(Number.isFinite));assert.equal(systemAt(b.position),b.system);if(!b.parent)continue;const parent=BODIES[b.parent],r=length(sub(b.position,parent.position));assert(r>parent.radius+b.radius+5000,id+' clears parent');assert(length(sub(b.position,BODIES[SYSTEMS[b.system].star].position))+b.radius<SYSTEMS[b.system].extent,id+' fits system');
  if(parent.giant&&b.system!=='helios')assert(b.orbitRadius>parent.radius*(parent.rings?.outer||1)+b.radius+5000,id+' clears rings');
  if(b.orbit){const ranges=orbitPath(b,256).map(p=>length(sub(p,parent.position)));assert(Math.abs(Math.min(...ranges)-b.orbit.semiMajorAxis*(1-b.orbit.eccentricity))<1e-6);assert(Math.abs(Math.max(...ranges)-b.orbit.semiMajorAxis*(1+b.orbit.eccentricity))<1e-6);}
 }
 for(let i=0;i<BODY_IDS.length;i++)for(let j=0;j<i;j++){const a=BODIES[BODY_IDS[i]],b=BODIES[BODY_IDS[j]];assert(length(sub(a.position,b.position))>a.radius+b.radius+2000,a.id+' / '+b.id);}
 for(const g of WORMHOLES){const p=wormholePoint(g,120);assert.equal(systemAt(p),g.system);for(const id of systemBodies(g.system)){const b=BODIES[id];assert(length(sub(p,b.position))>b.radius+ENTRY_RANGE,g.id+' clears '+id);}}
});
test('every new solid world has safe terrain, real mining and science sites, its own footsteps, and an empty colony',()=>{
 const campaign=new Campaign();
 for(const spec of OUTER_WORLDS){const b=BODIES[spec.id];if(!b.landable){assert(!campaign.bases[b.id]);continue;}assert.equal(campaign.bases[b.id].buildings.length,0);assert(!campaign.roverAvailable(b.id));assert(FOOTSTEP_PROFILES[b.id]);assert.equal(nearestBody(groundPoint(b.id,[0,1,0],5)).body.id,b.id);assert(gravity(groundPoint(b.id,[0,1,0],5)).every(Number.isFinite));
  for(const n of [[0,1,0],unit([.2,.9,.1]),unit([-.6,.1,.8])])assert(Math.abs(terrainHeight(b.id,n)-b.radius)<65);
  const deposits=depositsFor(b.id),sites=discoveriesFor(b.id);assert.equal(deposits.length,9);assert.equal(sites.length,6);assert.equal(new Set(deposits.map(d=>d.id)).size,9);assert.equal(new Set(sites.map(d=>d.id)).size,6);assert(deposits.every(d=>MINERALS[d.mineral]&&d.amount>0&&d.position.every(Number.isFinite)));assert(sites.some(s=>s.difficulty>=4.8));
  assert(campaign.mine(b.id,deposits[0].position,1).ok);campaign.backpack.ore[deposits[0].mineral]=0;
 }
 const seen=Array.from({length:400},(_,i)=>'survey-'+i);assert.equal(new Campaign({discovered:seen}).discovered.size,400);
});
test('the atlas includes gas giants and nested moons once, and makes every survey destination navigable',()=>{
 for(const id of Object.keys(SYSTEMS)){const rows=atlasRows(id);assert.equal(rows.length,systemSurvey(id).bodies);assert.equal(new Set(rows.map(r=>r.body.id)).size,rows.length);for(const {body:b,depth}of rows){assert(bodySummary(b.id).includes(b.role));if(b.category==='moon')assert(depth>0);}}
 const html=stellarAtlasCards({landed:new Set(['dusk'])});for(const b of Object.values(BODIES).filter(b=>!b.star))assert(html.includes('data-world-map="'+b.id+'"'));assert(html.includes('Dusk ✓'));assert(!html.includes('undefined'));
});
test('guided landing works on all thirty new surfaces and giants reject a landing command',()=>{
 for(const spec of OUTER_WORLDS){const b=BODIES[spec.id],d=new Demo();chargeShip(d);if(b.giant){const fuel=d.fuel;assert(!d.travelTo(b.id));assert.equal(d.fuel,fuel);continue;}
  d.body=b.id;d.target=b.id;d.mode='flight';d.ship=groundPoint(b.id,[0,1,0],3000);d.position=[...d.ship];d.direction=[0,-1,0];d.velocity=[0,0,0];d.electricSun=()=>1;assert(d.travelTo(b.id),b.id);
  for(let i=0;i<6000&&d.mode==='flight';i++){d.step(.25);if(d.landing){d.landing.trial.done=true;d.landing.trial.success=true;assert(d.resolveLanding(true));}assert(d.ship.every(Number.isFinite));}
  assert.equal(d.mode,'cockpit',b.id+' touchdown');assert.equal(d.body,b.id);assert.equal(d.power.integrity,100);assert(d.fuel>0);assert.equal(Demo.restore(d.checkpoint()).body,b.id);
 }
});
