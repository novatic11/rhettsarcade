import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const html=fs.readFileSync(new URL('../public/games/rustbound/index.html',import.meta.url),'utf8');
const rules=html.slice(html.indexOf('    const EMERGENCY_COOLDOWN_MS'),html.indexOf('    const lander ='));
const action=html.slice(html.indexOf('    function useEmergencyTank()'),html.indexOf("    emergencyButton.addEventListener('click', useEmergencyTank)"));
function harness(capacity=100){
 let now=1_800_000_000_000,saves=0;
 const c=vm.createContext({Date:{now:()=>now},credits:100,lander:{stock:{gas:0},emergencyReadyAt:now+300000},SHIP_FUEL_CAPACITY:capacity,SHIP_UNLOCK_FUEL:40,ascent:null,refreshShop(){},updateReadouts(){},updateEmergencyTank(){},saveGame(){saves++},animateSpaceFlight(){},toast(){}});
 vm.runInContext(rules+action,c);
 return {c,wait(ms){now+=ms},saves:()=>saves};
}
test('new ships wait five real minutes; claims pay once and restart the full cooldown',()=>{
 const h=harness(),{c}=h;
 c.useEmergencyTank();assert.equal(c.credits,100);assert.equal(c.lander.stock.gas,0);
 h.wait(299999);c.useEmergencyTank();assert.equal(c.credits,100);
 h.wait(1);c.useEmergencyTank();assert.equal(c.credits,600);assert.equal(c.lander.stock.gas,40);assert.equal(c.emergencySeconds(c.lander),300);assert.equal(h.saves(),1);
 c.useEmergencyTank();assert.equal(c.credits,600);
 h.wait(300000);c.useEmergencyTank();assert.equal(c.credits,1100);assert.equal(h.saves(),2);
});
test('fuel respects smaller capacities, preserves fuller tanks, and also pays for tankless ships',()=>{
 for(const [cap,current,expected] of [[30,0,30],[100,80,80],[100,0,40],[0,0,0]]){
  const h=harness(cap);h.c.lander.stock.gas=current;h.wait(300000);h.c.useEmergencyTank();assert.equal(h.c.lander.stock.gas,expected);assert.equal(h.c.credits,600);
 }
});
test('orbit, launch and docked ships receive the refill in their authoritative flight fuel',()=>{
 for(const ascent of [{flight:{fuel:0}},{time:6,launchFuel:12},{time:16,flight:{fuel:0},stationDock:{phase:'docked'}}]){
  const h=harness();h.c.ascent=ascent;h.wait(300000);h.c.useEmergencyTank();
  assert.equal(h.c.lander.stock.gas,40);
  if(ascent.flight)assert.equal(ascent.flight.fuel,40);else assert.equal(ascent.launchFuel-Math.min(ascent.time,12)*2,40);
 }
 const h=harness();h.wait(300000);h.c.ascent={death:{}};h.c.useEmergencyTank();assert.equal(h.c.credits,100);
});
test('saved and parked vessel deadlines survive reload; old saves get a five-minute timer',()=>{
 const h=harness();h.wait(120000);
 const parked=JSON.parse(JSON.stringify(h.c.lander));assert.equal(h.c.emergencySeconds(parked),180);
 h.wait(180000);assert.equal(h.c.emergencySeconds(parked),0);
 const old={stock:{gas:20}};assert.equal(h.c.emergencySeconds(old),300);
 old.emergencyReadyAt=Infinity;assert.equal(h.c.emergencySeconds(old),300);
 h.c.timeWarp=25;assert.equal(h.c.emergencySeconds(old),300);
});
