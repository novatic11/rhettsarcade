import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Demo} from '../public/games/rustbound-2/world.js';
import {ShipPower} from '../public/games/rustbound-2/ship-power.js';

for(const universe of ['helios','solar'])test(universe+': a complete assisted moon landing works at zero electricity',()=>{
 const result=execFileSync(process.execPath,['--input-type=module','-e',`
  import assert from 'node:assert/strict';
  globalThis.location={search:${JSON.stringify(universe==='solar'?'?universe=solar':'')}};
  const {Demo}=await import('./public/games/rustbound-2/world.js');
  const {HOME_MOON}=await import('./public/games/rustbound-2/universe.js');
  const {passTrial}=await import('./tests/rb2-landing-helpers.mjs');
  const d=new Demo();d.electricSun=()=>0;
  assert.equal(d.power.charge,0);assert(d.travelTo(HOME_MOON));
  assert.equal(Demo.restore(d.checkpoint()).guidance.kind,'travel');
  let checks=0;
  for(let i=0;i<20000&&d.mode==='flight';i++){
   d.step(.25);
   assert.equal(d.power.charge,0);
   assert(d.ship.every(Number.isFinite));
   if(d.landing){checks++;passTrial(d.landing.trial);assert(d.resolveLanding(true));assert.equal(d.guidance.stage,'LANDING');}
  }
  assert(checks>0);assert.equal(d.body,HOME_MOON);assert.equal(d.mode,'cockpit');
  assert.equal(d.power.integrity,100);assert(d.fuel>0&&d.fuel<100);
  assert.equal(Demo.restore(d.checkpoint()).body,HOME_MOON);
  console.log('zero-charge moon landing passed');
 `],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:90000});
 assert.match(result,/zero-charge moon landing passed/);
});

test('autopilot adds no electrical demand while science still consumes power and stops when empty',()=>{
 const p=new ShipPower({charge:10});
 p.update(10,{sunlight:0,autopilot:true});
 assert.equal(p.last.demand,.15);assert.equal(p.charge,8.5);
 p.update(1,{sunlight:0,science:true});
 assert.equal(p.last.demand,2.15);assert.equal(p.charge,6.35);
 const d=new Demo();d.electricSun=()=>0;assert(d.enterOrbit());
 d.campaign.job={ship:true};d.updateElectric(1);
 assert.equal(d.campaign.job,null);assert.equal(d.guidance.kind,'orbit');
 assert(d.campaign.events.includes('Ship instrument stopped: battery empty'));
});

test('assisted flight still requires propellant and a working hull',()=>{
 const d=new Demo();d.fuel=0;assert(!d.travelTo('luma'));assert(!d.enterOrbit());
 d.fuel=100;d.power.integrity=0;assert(!d.travelTo('luma'));assert(!d.enterOrbit());
});
