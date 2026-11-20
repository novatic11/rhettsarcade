import test from 'node:test';import assert from 'node:assert/strict';
import {Demo,BODIES,landingPoint,groundPoint,unit,sub,length} from '../public/games/rustbound-2/world.js';
import {Campaign,discoveriesFor,BUILDINGS} from '../public/games/rustbound-2/expedition.js';
import {starterBlueprint} from '../public/games/rustbound-2/blueprints.js';
import {StarterPath,STARTER_PROJECTS,ESSENTIAL_BUILDINGS,connectSuggestedPower,connectSuggestedFuel,suggestedPlacement} from '../public/games/rustbound-2/starter-path.js';
const place=(d,type)=>{const s=suggestedPlacement(d,type);assert(s,'valid '+type+' suggestion');const result=d.campaign.place(d.body,type,s.x,s.z,0,d.ship);assert(result.ok,result.reason);return result.building;};
const tick=(d,n)=>{for(let i=0;i<n*10;i++)d.step(.1);};
const power=d=>{const c=d.campaign;place(d,'solar');const r=connectSuggestedPower(c,'cinder',c.bases.cinder.buildings.filter(b=>['warehouse','science'].includes(b.type)).map(b=>b.id));assert(r.ok,r.reason);};

test('new expeditions and ship rollouts start empty, charge from actual sunlight and retain saved electricity',()=>{
 const d=new Demo();assert.equal(d.power.charge,0);assert(!d.travelTo('luma'));assert(!d.enterOrbit());
 const empty=Demo.restore(d.checkpoint());assert.equal(empty.power.charge,0);
 const sunlight=d.electricSun();assert(sunlight>0);d.step(.5);assert(Math.abs(d.power.charge-(14*sunlight-.15)*.5)<1e-6);
 tick(d,4);assert(d.power.charge>=15);assert.equal(Demo.restore(d.checkpoint()).power.charge,d.power.charge);
 assert(d.deployBlueprint(starterBlueprint()).ok);assert.equal(d.power.charge,0);assert(!d.enterOrbit());
 d.electricSun=()=>0;tick(d,2);assert.equal(d.power.charge,0);
 d.electricSun=()=>1;tick(d,2);assert(Math.abs(d.power.charge-23.7)<1e-6);assert(d.enterOrbit());
 const saved=Demo.restore(d.checkpoint());assert.equal(saved.power.charge,d.power.charge);assert(saved.guidance);
});
test('opening is optional, restores old saves quietly and never repeats claimed rewards',()=>{
 const d=new Demo(),c=d.campaign;assert.equal(c.firstSteps.status,'pending');power(d);tick(d,1);assert.equal(c.money,2925);c.firstSteps.start();tick(d,1);assert.equal(c.money,3125);assert.deepEqual([...c.firstSteps.claimed],['power']);const copy=Demo.restore(d.checkpoint());tick(copy,1);assert.equal(copy.campaign.money,3125);copy.campaign.firstSteps.start();tick(copy,1);assert.equal(copy.campaign.money,3125);
 const old=c.snapshot();delete old.firstSteps;const restored=new Campaign(old);assert.equal(restored.firstSteps.status,'skipped');assert.equal(restored.money,c.money);assert.equal(ESSENTIAL_BUILDINGS.size,6);assert(ESSENTIAL_BUILDINGS.has('solar'));const bad=new StarterPath({status:'bad',claimed:['bad','power','power']},true);assert.equal(bad.status,'skipped');assert.equal(bad.claimed.size,1);
});
test('a complete first expedition earns its five bonuses from real power, science and propellant',()=>{
 const d=new Demo(),c=d.campaign;c.firstSteps.start();power(d);tick(d,.1);assert.equal(c.firstSteps.current().id,'sample');assert(c.startExperiment('sample','cinder',d.position).ok);tick(d,5);assert.equal(c.firstSteps.current().id,'science');const science=c.bases.cinder.buildings.find(b=>b.type==='science');d.normal=unit(sub(landingPoint('cinder',science.x+5,science.z),BODIES.cinder.position));d.position=groundPoint('cinder',d.normal);assert(c.process('cinder',{processor:science.id}).ok);tick(d,6);assert.equal(c.processedTotal,1);assert.equal(c.firstSteps.current().id,'discovery');assert.equal(c.money,3565);
 const probe=discoveriesFor('cinder').find(p=>p.type==='probe');d.normal=unit(sub(probe.position,BODIES.cinder.position));d.position=groundPoint('cinder',d.normal);assert(c.startExperiment('artifact','cinder',d.position).ok);tick(d,8);assert.equal(c.firstSteps.current().id,'fuel');const well=place(d,'gaswell'),fuel=place(d,'refueler');assert(connectSuggestedFuel(c,'cinder',fuel.id).ok);tick(d,3);const state=c.industry.state('cinder',fuel);assert(state.output.fuel>0);const before=state.output.fuel;d.fuel=98;c.industry.refueling={body:'cinder',id:fuel.id};tick(d,1);assert(d.fuel>98);assert(state.output.fuel<before+5);assert.equal(c.firstSteps.status,'done');assert.equal(c.firstSteps.claimed.size,5);assert.equal(c.money,4040);assert.equal(c.progress.questActive,false);const again=Demo.restore(d.checkpoint());tick(again,1);assert.equal(again.campaign.money,4040);
});
test('suggested placement uses normal prices, clear terrain, actors and working drill/refueler range',()=>{
 const d=new Demo();for(const type of ESSENTIAL_BUILDINGS){const spot=suggestedPlacement(d,type);assert(spot,type);assert(d.campaign.canPlace('cinder',type,spot.x,spot.z,d.ship).ok);assert(length(sub(spot.point,d.position))>BUILDINGS[type].radius+2.7);if(type==='drill')assert(d.campaign.nearestDeposit('cinder',spot.point).distance<9);if(type==='refueler')assert(length(sub(spot.point,d.ship))<=25);}
 const cash=d.campaign.money;place(d,'solar');assert.equal(d.campaign.money,cash-75);d.campaign.money=0;assert.equal(suggestedPlacement(d,'refueler'),null);d.mode='flight';assert.equal(suggestedPlacement(d,'solar'),null);
});
test('connection assistance cannot invent electricity, duplicate lines, consume resources or leave partial failed networks',()=>{
 const d=new Demo(),c=d.campaign,warehouse=c.bases.cinder.buildings.find(b=>b.type==='warehouse'),science=c.bases.cinder.buildings.find(b=>b.type==='science'),cash=c.money;
 assert(!connectSuggestedPower(c,'cinder',[science.id]).ok);assert.equal(c.industry.connections.cinder.length,0);const solar=place(d,'solar');assert(connectSuggestedPower(c,'cinder',[warehouse.id,science.id]).ok);const count=c.industry.connections.cinder.length;assert(!connectSuggestedPower(c,'cinder',[science.id]).ok);assert.equal(c.industry.connections.cinder.length,count);assert.equal(c.money,cash-75);
 const before=structuredClone(c.industry.connections.cinder),serial=c.industry.serial;const b={id:'far',type:'warehouse',x:1000,z:0};c.bases.cinder.buildings.push(b);c.industry.state('cinder',b);assert(!connectSuggestedPower(c,'cinder',[c.bases.cinder.buildings.find(x=>x.type==='hangar').id,'far']).ok);assert.deepEqual(c.industry.connections.cinder,before);assert.equal(c.industry.serial,serial);assert.equal(c.power('cinder').nodes[solar.id].connected,true);
});
test('experiment cards and actual recording share research, context, capacity and repeat rules without side effects',()=>{
 const d=new Demo(),c=d.campaign,key=c.experimentAvailability('sample','cinder',d.position);assert(key.ok);assert.equal(key.value,90);assert.equal(c.job,null);assert.equal(c.money,3000);assert(!c.experimentAvailability('magnetic','cinder',d.position).ok);assert(!c.experimentAvailability('artifact','cinder',d.position).ok);assert(c.startExperiment('sample','cinder',d.position).ok);assert(!c.experimentAvailability('sample','cinder',d.position).ok);tick(d,5);assert(!c.experimentAvailability('sample','cinder',d.position).ok);assert(!c.startExperiment('sample','cinder',d.position).ok);assert.equal(c.backpack.samples[0].value,key.value);assert(!c.experimentAvailability('atmosphere','luma',landingPoint('luma')).ok);
});
