import {PARTS} from './blueprints.js';
import {electricSpec} from './ship-power.js';
export const createAdminState=()=>({electricity:false,fuel:false,hull:false});
export function refillAdminFuel(d){
 if(d.vehicle){for(const p of d.vehicle.blueprint.parts)if(!d.vehicle.removed.has(p.id)&&PARTS[p.type].fuel)d.vehicle.fuel[p.id]=PARTS[p.type].fuel;d.fuel=d.vehicle.stats().fuelPercent;}else d.fuel=100;
}
export function applyAdminOverrides(d){
 const flags=d.adminSession;if(!flags)return;const wasUnlimited=d.power.unlimited;d.power.unlimited=flags.electricity===true;d.power.invulnerable=flags.hull===true;
 if(d.power.unlimited)d.power.charge=electricSpec(d.vehicle,d.campaign.progress.has('power'),true).capacity;
 else if(wasUnlimited)d.power.charge=Math.min(d.power.charge,electricSpec(d.vehicle,d.campaign.progress.has('power')).capacity);
 if(flags.fuel)refillAdminFuel(d);if(flags.hull)d.power.integrity=100;
}
// A and D keep their ordinary movement behavior. Only the distinctive ADM...
// prefix suppresses map/inventory shortcuts, and no text field is intercepted.
export class AdminSequence{
 constructor(){this.buffer='';this.last=0;}
 push(event,now,editable=false){
  if(editable||event.ctrlKey||event.metaKey||event.altKey||event.isComposing){this.buffer='';return {open:false,suppress:false};}
  if(event.repeat)return {open:false,suppress:false};
  if(now-this.last>1800)this.buffer='';this.last=now;
  const key=String(event.key||'').toLowerCase();if(!/^[a-z]$/.test(key)){if(key!=='shift')this.buffer='';return {open:false,suppress:false};}
  const candidate=this.buffer+key;this.buffer='admin'.startsWith(candidate)?candidate:key==='a'?'a':'';
  const open=this.buffer==='admin',suppress=this.buffer.length>=3;if(open)this.buffer='';return {open,suppress};
 }
}
