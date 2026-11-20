import {PARTS} from './blueprints.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function electricSpec(vehicle,improved=false,unlimited=false){let capacity=480,generation=14;if(vehicle){const parts=vehicle.layout.filter(p=>!vehicle.removed.has(p.id));capacity=parts.reduce((n,p)=>n+(PARTS[p.type].battery||0),0);generation=parts.reduce((n,p)=>n+(PARTS[p.type].generation||0),0);}return {capacity:unlimited?Math.max(480,capacity*(improved?1.5:1)):capacity*(improved?1.5:1),generation};}
export class ShipPower{
 constructor(raw={}){this.charge=Number.isFinite(raw?.charge)?Math.max(0,raw.charge):480;this.integrity=Number.isFinite(raw?.integrity)?clamp(raw.integrity,0,100):100;this.last={capacity:480,generation:0,demand:0};}
 update(dt,{vehicle=null,improved=false,sunlight=1,science=false}={}){const spec=electricSpec(vehicle,improved,this.unlimited),generation=spec.generation*clamp(sunlight,0,1),demand=.15+(science?2:0);if(this.unlimited){this.charge=spec.capacity;this.last={...spec,generation,demand};return true;}this.charge=clamp(this.charge,0,spec.capacity);const supply=this.charge+generation*dt,need=demand*dt,online=supply+1e-8>=need;this.charge=clamp(supply-need,0,spec.capacity);this.last={...spec,generation,demand};return online;}
 spend(amount){if(!Number.isFinite(amount)||amount<0||!this.unlimited&&this.charge<amount)return false;if(this.unlimited)return true;this.charge-=amount;return true;}
 damage(amount){if(this.invulnerable)return;this.integrity=clamp(this.integrity-Math.max(0,amount),0,100);}
 snapshot(){return {charge:this.charge,integrity:this.integrity};}
}
