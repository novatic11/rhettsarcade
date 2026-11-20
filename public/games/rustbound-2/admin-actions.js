import {electricSpec} from './ship-power.js';
import {BODIES,GRAVITY_IDS,LANDABLE_IDS} from './system.js';
import {landingPoint,groundPoint,unit,sub,length} from './world.js';
import {RESEARCH} from './frontier.js';
import {applyAdminOverrides,refillAdminFuel} from './admin-state.js';
export function setAdminOverride(d,key,enabled){if(!['electricity','fuel','hull'].includes(key)||typeof enabled!=='boolean')return false;if(key==='hull'&&enabled)cancelRepair(d);d.adminSession[key]=enabled;applyAdminOverrides(d);return true;}
function cancelRepair(d){if(!d.repair)return;if(d.repair.payment==='alloy')d.campaign.backpack.ore.alloy+=2;else if(d.repair.payment==='credits')d.campaign.money+=40;d.repair=null;}
export function adminSupplies(d,action){
 if(action==='refill'){cancelRepair(d);refillAdminFuel(d);d.power.integrity=100;d.power.charge=electricSpec(d.vehicle,d.campaign.progress.has('power'),d.power.unlimited).capacity;applyAdminOverrides(d);return {ok:true,reason:'Ship repaired, charged and refueled.'};}
 if(action==='credits'){d.campaign.money=Math.min(1e9,d.campaign.money+10000);return {ok:true,reason:'Added 10,000 credits.'};}
 if(action==='research'){for(const r of RESEARCH)d.campaign.progress.research.add(r.id);return {ok:true,reason:'All research and its ship parts unlocked.'};}
 return {ok:false,reason:'Choose a supply action.'};
}
export function adminTeleport(d,id,arrival='surface'){
 const b=BODIES[id];if(!GRAVITY_IDS.includes(id)||!['surface','orbit'].includes(arrival))return {ok:false,reason:'Choose a planet or moon.'};
 if(arrival==='surface'&&!b.landable)return {ok:false,reason:'This giant has no solid surface. Teleport to orbit or choose a moon.'};
 cancelRepair(d);
 const oldRover=d.rovers[d.body];if(oldRover){oldRover.velocity=[0,0,0];oldRover.speed=0;}
 d.docking=null;d.landing=null;d.landingPermit=null;d.cancelGuidance();d.campaign.industry.refueling=null;if(d.campaign.job?.kind==='experiment')d.campaign.job=null;
 const landable=b.landable?id:LANDABLE_IDS.filter(key=>BODIES[key].system===b.system).sort((a,c)=>length(sub(BODIES[a].position,b.position))-length(sub(BODIES[c].position,b.position)))[0];
 d.body=landable;d.target=landable;d.targetNormal=null;d.jumpHeight=d.vertical=d.walkSpeed=d.odometer=d.landingImpact=0;d.walking=d.mining=false;d.gimbal=[0,0];d.events=[];
 if(arrival==='surface'){d.ship=landingPoint(id);d.mode='cockpit';d.velocity=[0,0,0];d.normal=d.direction=d.aim=unit(sub(d.ship,b.position));d.campaign.progress.landed.add(id);if(!d.visited.includes(id))d.visited.push(id);}
 else{const ringEdge=b.rings?.outer||(id==='brontes'?2.22:1),r=b.radius*Math.max(1,ringEdge)+1800;d.ship=groundPoint(id,[0,1,0],r-b.radius);d.mode='flight';d.normal=[0,1,0];d.direction=d.aim=[1,0,0];d.velocity=[Math.sqrt(b.mu/r),0,0];}
 d.position=[...d.ship];d.campaign.progress.systems=[...new Set([...d.campaign.progress.systems,b.system])];applyAdminOverrides(d);
 return {ok:true,reason:'Teleported to '+b.name+(arrival==='orbit'?' orbit.':'.')};
}
