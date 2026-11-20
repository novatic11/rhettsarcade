import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Demo,groundPoint} from '../public/games/rustbound-2/world.js';
import {FlightVehicle,starterBlueprint,PARTS} from '../public/games/rustbound-2/blueprints.js';
import {readSettings} from '../public/games/rustbound-2/release-state.js';

test('new and migrated expeditions recommend assists, while opting out survives saves',()=>{
 assert.equal(readSettings().explorerAssist,true);
 assert.equal(readSettings({explorerAssist:false}).explorerAssist,false);
 const d=new Demo();assert(d.explorerAssist);assert.equal(d.power.charge,0);
 const old=d.checkpoint();delete old.explorerAssist;assert(Demo.restore(old).explorerAssist);
 d.explorerAssist=false;assert.equal(Demo.restore(d.checkpoint()).explorerAssist,false);
});

test('a missed landing check remains recoverable with fuel and cargo intact',()=>{
 const d=new Demo();d.mode='flight';d.ship=groundPoint('cinder',[0,1,0],150);d.position=[...d.ship];d.fuel=35;d.power.charge=0;d.electricSun=()=>0;
 d.campaign.shipCargo.ore.crystal=4;d.beginLanding('cinder',[0,1,0]);
 assert(d.resolveLanding(false));assert.equal(d.fuel,35);assert.equal(d.power.integrity,100);assert.equal(d.guidance.stage,'LANDING');
 for(let i=0;i<1000&&d.mode==='flight';i++)d.step(.1);
 assert.equal(d.mode,'cockpit');assert.equal(d.power.integrity,100);assert(d.fuel>0);assert.equal(d.campaign.shipCargo.ore.crystal,4);
});

test('repeated hard impacts preserve propellant, and free recovery repairs damage without a wait',()=>{
 const d=new Demo();const money=d.campaign.money;d.campaign.backpack.samples=[{id:'kept',body:'cinder',value:60}];
 for(let i=0;i<12;i++){
  d.ship=groundPoint('cinder',[0,1,0],.2);d.position=[...d.ship];d.mode='flight';d.velocity=[0,i%2?-8:-100,0];d.throttle=0;d.landingPermit={body:'cinder'};
  const fuel=d.fuel;d.step(.02);assert.equal(d.mode,'cockpit');assert(d.events.includes('rough-landing'));assert(d.fuel>fuel-.1);assert(d.power.integrity>=25);
 }
 const colonies=JSON.stringify(d.campaign.bases);for(let i=0;i<3;i++){d.loseAllFuel();d.power.integrity=1;assert(d.rescue().ok);assert.equal(d.fuel,40);assert.equal(d.power.integrity,100);assert(d.rescueStatus().ok);}
 assert.equal(d.campaign.money,money);assert.equal(JSON.stringify(d.campaign.bases),colonies);assert.equal(d.campaign.backpack.samples[0].id,'kept');assert(Demo.restore(d.checkpoint()).rescueStatus().ok);
});

test('recovery supplies real active tanks and safely cancels a pending landing',()=>{
 const d=new Demo(),bp=starterBlueprint();bp.parts.push({id:'boost',type:'booster',parent:'fuel',node:'radial',angle:1,stage:0});d.vehicle=new FlightVehicle(bp);
 d.vehicle.removed.add('boost');for(const k of Object.keys(d.vehicle.fuel))d.vehicle.fuel[k]=0;d.fuel=0;d.mode='flight';d.beginLanding('cinder',[0,1,0]);
 assert(d.rescue().ok);assert.equal(d.landing,null);assert.equal(d.guidance,null);assert.equal(d.mode,'cockpit');
 for(const part of d.vehicle.blueprint.parts)if(PARTS[part.type].fuel)assert.equal(d.vehicle.fuel[part.id],d.vehicle.removed.has(part.id)?0:PARTS[part.type].fuel*.4);
 assert(d.launch());
});

test('full challenge retains its crash penalty, fee and rescue cooldown',()=>{
 const d=new Demo();d.explorerAssist=false;d.mode='flight';d.beginLanding('cinder',[0,1,0]);assert.equal(d.resolveLanding(false),false);
 assert.equal(d.fuel,0);assert.equal(d.power.integrity,30);const money=d.campaign.money;assert(d.rescue().ok);assert.equal(d.campaign.money,money-150);assert.equal(d.fuel,20);assert(!d.rescueStatus().ok);
 const restored=Demo.restore(d.checkpoint());assert(!restored.explorerAssist);assert(!restored.rescueStatus().ok);
});

test('the Solar expedition gets the same forgiving landings and instant recovery',()=>{
 const result=execFileSync(process.execPath,['--input-type=module','-e',`
  import assert from 'node:assert/strict';globalThis.location={search:'?universe=solar'};
  const {Demo}=await import('./public/games/rustbound-2/world.js');const d=new Demo();assert.equal(d.body,'earth');d.mode='flight';d.beginLanding('moon',[0,1,0]);assert(d.resolveLanding(false));assert.equal(d.guidance.id,'moon');assert(d.fuel>0);d.loseAllFuel();assert(d.rescue().ok);assert.equal(d.fuel,40);assert(d.rescueStatus().ok);assert.equal(Demo.restore(d.checkpoint()).checkpoint().universe,'solar');console.log('ok');
 `],{cwd:new URL('..',import.meta.url),encoding:'utf8'});assert.match(result,/ok/);
});
