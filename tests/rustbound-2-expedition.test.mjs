import test from 'node:test';
import assert from 'node:assert/strict';
import {Demo,landingPoint,groundPoint,nearestBody,unit,length,sub,BODIES} from '../public/games/rustbound-2/world.js';
import {Campaign as BaseCampaign,cargoMass,depositsFor,sampleValue,daylight} from '../public/games/rustbound-2/expedition.js';
import {powerStarter} from './rb2-fixtures.mjs';
class Campaign extends BaseCampaign{constructor(raw){super(raw);if(!raw)powerStarter(this);}}
import {PARTS,starterBlueprint,BlueprintEditor,assemblyLayout,FlightVehicle,sanitizeBlueprint} from '../public/games/rustbound-2/blueprints.js';
import {Rover} from '../public/games/rustbound-2/rover.js';
import {SHIP_PRESETS,presetBlueprint} from '../public/games/rustbound-2/ship-presets.js';
import {buildingFrame,foundationModel} from '../public/games/rustbound-2/building-placement.js';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
const point=landingPoint('cinder',6,13),advance=(c,n,{position=point,body='cinder',mode='foot',...extra}={})=>{for(let t=0;t<n;t+=.1)c.update(.1,{body,position,mode,...extra});};
test('mineral extraction conserves the seam, respects backpack capacity, and survives saves',()=>{
 const c=new Campaign(),d=depositsFor('cinder')[0];for(let i=0;i<40;i++)c.mine('cinder',d.position,1);assert.equal(cargoMass(c.backpack),24);assert.equal(c.depleted[d.id],24);assert.equal(c.mine('cinder',d.position,1).ok,false);const restored=new Campaign(c.snapshot());assert.deepEqual(restored.backpack,c.backpack);assert.equal(restored.depleted[d.id],24);assert.equal(c.mine('cinder',point,1).ok,false);
});
test('cargo transfers preserve ore and physical samples, with distinct container limits',()=>{
 const c=new Campaign();c.backpack.ore.iron=22;c.backpack.samples.push({id:'s',value:90,title:'x',body:'cinder',experiment:'sample',key:'k'});assert.equal(c.transfer('cinder','backpack','rover'),24);assert.equal(cargoMass(c.backpack),0);assert.equal(c.rovers.cinder.cargo.samples[0].id,'s');c.shipCapacity=10;assert.equal(c.transfer('cinder','rover','ship'),10);assert.equal(cargoMass(c.shipCargo),10);assert.equal(cargoMass(c.rovers.cinder.cargo),14);c.unload('cinder',{rover:true,ship:true});assert.equal(c.bases.cinder.ore.iron,22);assert.equal(c.rovers.cinder.cargo.samples.length,1);
});
test('experiments record unique locations, require working instruments, and reward harder destinations',()=>{
 const c=new Campaign();assert(c.startExperiment('sample','cinder',point).ok);advance(c,5);assert.equal(c.backpack.samples.length,1);assert.equal(c.money,3000);assert.equal(c.startExperiment('sample','cinder',point).ok,false);assert.equal(c.startExperiment('spectrometer','cinder',point,{altitude:900,ship:true}).ok,false);assert(c.startExperiment('spectrometer','cinder',[0,3000,0],{altitude:1400,ship:true,modules:['spectrometer']}).ok);advance(c,8,{position:[0,3000,0],mode:'flight'});assert.equal(c.shipCargo.samples.length,1);assert(sampleValue('plon',{difficulty:3.5},'artifact')>sampleValue('cinder',{difficulty:1},'sample')*10);assert.equal(c.startExperiment('artifact','cinder',point).ok,false);assert.equal(c.startExperiment('seismic','cinder',point,{ship:true}).ok,false);
});
test('handheld research interrupts on movement, boarding, or a full sample container',()=>{
 for(const mode of ['rover','cockpit']){const c=new Campaign();assert(c.startExperiment('sample','cinder',point).ok);advance(c,5,{mode});assert.equal(c.backpack.samples.length,0);assert.equal(c.job,null);}
 const c=new Campaign();c.startExperiment('sample','cinder',point);advance(c,5,{position:landingPoint('cinder',80,70)});assert.equal(c.backpack.samples.length,0);c.shipCapacity=1;assert.equal(c.startExperiment('spectrometer','cinder',[0,3000,0],{altitude:1400,ship:true,modules:['spectrometer']}).ok,false);
});
test('Science Processer takes custody, resumes after reload, and pays exactly once',()=>{
 const c=new Campaign();c.startExperiment('sample','cinder',point);advance(c,5);const value=c.backpack.samples[0].value;c.transfer('cinder','backpack','rover');assert(c.process('cinder',{rover:true}).ok);assert.equal(c.rovers.cinder.cargo.samples.length,0);advance(c,2);const restored=new Campaign(c.snapshot());assert(restored.job);advance(restored,10);assert.equal(restored.money,3000+value);assert.equal(restored.processedTotal,1);assert.equal(restored.process('cinder',{rover:true}).ok,false);advance(restored,10);assert.equal(restored.money,3000+value);assert.equal(restored.snapshot().processing,null);
});
test('rover payload changes acceleration and its depleted battery prevents propulsion',()=>{
 const a=new Rover('cinder'),b=new Rover('cinder'),empty=new Rover('cinder');for(let i=0;i<30;i++){a.step(1/60,{forward:1,payload:0,battery:100},[500,1600,0]);b.step(1/60,{forward:1,payload:140,battery:100},[500,1600,0]);empty.step(1/60,{forward:1,battery:0},[500,1600,0]);}assert(a.speed>b.speed);assert(empty.speed<.01);
});
test('rocket editor inserts stack hardware, avoids occupied radial slots and supports undo/redo',()=>{
 const e=new BlueprintEditor(),id=e.add('separator','fuel','bottom')[0];assert.equal(e.design.parts.find(p=>p.id==='main').parent,id);const pair=e.add('atmosphere','bay','radial',2);const layout=assemblyLayout(e.design),a=layout.find(p=>p.id===pair[0]),b=layout.find(p=>p.id===pair[1]);assert(Math.abs(a.x+b.x)<1e-8);assert(Math.abs(a.z+b.z)<1e-8);assert(Math.abs(a.z)>0.2);e.configure(pair[0],{rotate:Math.PI/12,stage:1});assert.equal(e.design.parts.find(p=>p.id===pair[1]).stage,1);e.remove(pair[0]);assert(!e.design.parts.some(p=>pair.includes(p.id)));assert(e.undo());assert(e.design.parts.some(p=>p.id===pair[1]));assert(e.redo());assert(!e.design.parts.some(p=>pair.includes(p.id)));assert.throws(()=>e.remove('core'));
});
test('invalid cyclic or disconnected blueprints fall back safely',()=>{
 for(const raw of [null,{parts:[]},{parts:[{id:'bad',type:'capsule',parent:'bad'}]},{parts:[{id:'a',type:'capsule',parent:null},{id:'b',type:'tank',parent:'missing'}]}])assert.deepEqual(sanitizeBlueprint(raw),starterBlueprint());
});
const staged=()=>({name:'Two stages',parts:[{id:'c',type:'capsule',parent:null,node:'root',stage:0},{id:'t',type:'tank',parent:'c',node:'bottom',stage:0},{id:'e',type:'engine',parent:'t',node:'bottom',stage:1},{id:'cut',type:'separator',parent:'e',node:'bottom',stage:1},{id:'t2',type:'longTank',parent:'cut',node:'bottom',stage:0},{id:'e2',type:'engine',parent:'t2',node:'bottom',stage:0}]});
test('custom rocket fuel, payload mass and staging change actual flight performance',()=>{
 const v=new FlightVehicle(staged()),start=v.stats();assert(start.thrust>0);v.consume(10,1);assert(v.stats().fuelMass<start.fuelMass);v.payload=120;assert(v.stats().mass>start.mass);assert(v.stats().acceleration<start.acceleration);assert(v.activateNext());assert(v.removed.has('t2'));assert(v.removed.has('e2'));assert(!v.removed.has('e'));assert(v.stats().thrust>0);assert(v.stats().mass<start.mass);assert.equal(v.activateNext(),false);assert(v.stats().deltaV>0);assert.equal(new FlightVehicle(v.blueprint,v.snapshot()).stage,1);
});
test('deployed rockets fly under mass-dependent thrust, retain instruments, and restore the whole expedition',()=>{
 const d=new Demo();assert(d.deployBlueprint(starterBlueprint()).ok);assert(d.scienceModules().includes('spectrometer'));assert(d.launch());for(let i=0;i<180;i++)d.step(1/60,{boost:true});assert.equal(d.mode,'flight');assert(nearestBody(d.ship).altitude>20);assert(d.vehicle.stats().fuelPercent<100);d.campaign.money=789;d.campaign.backpack.ore.crystal=2;const saved=JSON.parse(JSON.stringify(d.checkpoint())),r=Demo.restore(saved);assert.equal(r.mode,'flight');assert.deepEqual(r.ship,d.ship);assert.deepEqual(r.velocity,d.velocity);assert.equal(r.campaign.money,789);assert.equal(r.campaign.backpack.ore.crystal,2);assert.deepEqual(r.vehicle.fuel,d.vehicle.fuel);assert.equal(r.throttle,0);assert(r.ship.every(Number.isFinite));
});
test('new science models and assemblies contain finite geometry without flat overlay decals',async()=>{
 const {partModel,builtShipModel}=await import('../public/games/rustbound-2/ship-models.js');for(const type of Object.keys(PARTS)){const model=partModel(type);model.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});}const model=builtShipModel(assemblyLayout(starterBlueprint()));model.update(.016,{burn:1,gimbal:[.2,-.2],time:1});model.root.traverse(o=>assert(o.position.toArray().every(Number.isFinite)));model.dispose();model.dispose();
});
test('all five independent presets launch immediately, and staged Explorer separates into a working upper stage',()=>{
 assert.equal(SHIP_PRESETS.length,5);assert.equal(new Set(SHIP_PRESETS.map(p=>p.name)).size,5);
 for(const preset of SHIP_PRESETS){const bp=presetBlueprint(preset.id);assert.deepEqual(sanitizeBlueprint(bp),bp);const d=new Demo();assert(d.deployBlueprint(bp).ok,preset.name);assert(d.launch());for(let i=0;i<360;i++)d.step(1/60,{boost:true});assert.equal(d.mode,'flight',preset.name);assert(nearestBody(d.ship).altitude>15,preset.name);assert(d.fuel<100);const again=presetBlueprint(preset.id);bp.name='Edited';assert.notEqual(again.name,bp.name);}
 const d=new Demo();d.deployBlueprint(presetBlueprint('explorer'));d.launch();for(let i=0;i<180;i++)d.step(1/60,{boost:true});const mass=d.vehicle.stats().mass,velocity=[...d.velocity];assert(d.activateStage());assert(d.vehicle.removed.has('lower'));assert(d.vehicle.removed.has('main'));assert(d.vehicle.stats().mass<mass);assert(d.vehicle.stats().thrust>0);assert.deepEqual(d.velocity,velocity);assert.equal(d.vehicle.stage,1);assert.equal(Demo.restore(d.checkpoint()).vehicle.stage,1);
});
test('deleting a stack part removes its descendants and supports undo and redo',()=>{
 const e=new BlueprintEditor(presetBlueprint('surveyor')),before=JSON.parse(JSON.stringify(e.design));e.remove('fuel');assert(!e.design.parts.some(p=>['fuel','main','leg0','seismic','air'].includes(p.id)));assert(e.design.parts.some(p=>p.id==='core'));assert(e.undo());assert.deepEqual(e.design,before);assert(e.redo());assert(!e.design.parts.some(p=>p.id==='fuel'));
});
test('terrain-aligned buildings tilt gently, place every footing on the actual ground, and remain finite',()=>{
 let tilted=0,extended=0;for(const body of ['cinder','luma','ferrum','ember','plon'])for(const [x,z] of [[0,0],[70,45],[-105,98],[82,-112],[115,103]])for(const type of ['solar','science','hangar']){const frame=buildingFrame(body,x,z,.7,type),up=new T.Vector3(...unit(sub(frame.position.toArray(),BODIES[body].position)));assert(frame.position.toArray().every(Number.isFinite));assert(frame.quaternion.toArray().every(Number.isFinite));assert(frame.normal.angleTo(up)<16*Math.PI/180+.003);if(frame.normal.angleTo(up)>.01)tilted++;for(const support of frame.supports){const foot=support.bottom.clone().applyQuaternion(frame.quaternion).add(frame.position),n=unit(sub(foot.toArray(),BODIES[body].position));assert(Math.abs(length(sub(foot.toArray(),BODIES[body].position))-length(sub(groundPoint(body,n),BODIES[body].position)))<1e-5);assert(support.bottom.y<.001);if(support.top.distanceTo(support.bottom)>.25)extended++;}const foundation=foundationModel(frame);foundation.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});}assert(tilted>10);assert(extended>10);
});
