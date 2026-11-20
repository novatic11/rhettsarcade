import {HOME_BODY} from './universe.js';
import {BODIES} from './system.js';
import {landingPoint,length,sub} from './world.js';
import {INDUSTRY_TYPES} from './industry.js';

export const STARTER_PROJECTS=Object.freeze([
 {id:'power',title:'Wake up your base',reward:200,detail:'Buy a solar array and connect your Warehouse and Science Processer. Power turns samples into money.'},
 {id:'sample',title:'Pocket a little science',reward:100,detail:'Take a surface sample. Stand still for four seconds while your Field kit records it.'},
 {id:'science',title:'Your first payday',reward:250,detail:'Bring your sample to the Science Processer and process it for credits.'},
 {id:'discovery',title:'Find the fallen probe',reward:300,detail:'Walk or drive to the nearby survey probe. Step outside and scan the artifact for a valuable sample.'},
 {id:'fuel',title:'Make your own propellant',reward:350,detail:'Build a Gas Drill and Refueler. Supply power, pipe the gas, then refill your ship.'}
]);
export const ESSENTIAL_BUILDINGS=new Set(['solar','gaswell','refueler','drill','refinery','warehouse']);
export class StarterPath{
 constructor(raw,existing=false){
  this.status=['pending','active','paused','done','skipped'].includes(raw?.status)?raw.status:existing?'skipped':'pending';
  this.claimed=new Set(Array.isArray(raw?.claimed)?raw.claimed.filter(id=>STARTER_PROJECTS.some(p=>p.id===id)):[]);
  this.fuelStarted=raw?.fuelStarted===true;this.dismissed=raw?.dismissed===true;
 }
 current(){return STARTER_PROJECTS.find(p=>!this.claimed.has(p.id))||null;}
 start(){this.status=this.current()?'active':'done';this.dismissed=false;}
 snapshot(){return {status:this.status,claimed:[...this.claimed],fuelStarted:this.fuelStarted,dismissed:this.dismissed};}
 evaluate(c){
  if(this.status!=='active')return [];
  const samples=[...c.backpack.samples,...c.shipCargo.samples,...Object.values(c.rovers).flatMap(r=>r.cargo.samples)],proof={
   power:c.industry.graph(HOME_BODY).some(g=>g.some(b=>b.type==='solar'&&c.industry.state(HOME_BODY,b).enabled)&&g.some(b=>b.type==='science')&&g.some(b=>b.type==='warehouse')),
   sample:samples.some(s=>s.experiment==='sample')||[...c.claimed].some(k=>k.endsWith('/sample')),
   science:c.processedTotal>0,
   discovery:samples.some(s=>s.body===HOME_BODY&&s.experiment==='artifact')||[...c.claimed].some(k=>k.startsWith(HOME_BODY+'/')&&k.endsWith('/artifact')),
   fuel:c.industry.milestones.refuel>0
  },earned=[];
  for(let p=this.current();p&&proof[p.id];p=this.current()){this.claimed.add(p.id);c.money+=p.reward;if(p.id==='fuel'&&c.progress.tutorial.status==='active')c.progress.tutorial.status='done';earned.push(p);c.events.push(p.title+' complete · +'+p.reward+' credits');}
  if(!this.current())this.status='done';return earned;
 }
}

// Shortcuts create ordinary, validated cables and pipes. They never generate
// power or fuel, and a failed multi-link plan rolls back all its own changes.
function transaction(c,body,action){
 const i=c.industry,before=[...i.connections[body]],serial=i.serial;
 try{const count=action(i);if(!count)return {ok:false,reason:'These buildings are already connected.'};return {ok:true,count,reason:count+' connection'+(count===1?'':'s')+' built. Electricity and materials now flow through the visible lines.'};}
 catch(error){i.connections[body]=before;i.serial=serial;delete i.cache[body];return {ok:false,reason:error.message};}
}
function poweredGroup(i,body,g){return g.some(b=>['solar','solarfarm','wind','geothermal','reactor'].includes(b.type)&&i.state(body,b).enabled);}
function powerTargets(i,body,targets){let count=0;for(const id of targets){const target=i.building(body,id);if(!target)throw Error('Choose an existing building.');const groups=i.graph(body);if(groups.some(g=>g.some(b=>b.id===id)&&poweredGroup(i,body,g)))continue;const candidates=groups.filter(g=>poweredGroup(i,body,g)).flat().filter(b=>b.id!==id).sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));let linked=false;for(const source of candidates){const result=i.connect(body,{building:source.id,port:'power'},{building:id,port:'power'});if(result.ok){linked=true;count++;break;}}if(!linked)throw Error('Place an enabled generator within 80 m, or extend its circuit with another building.');}return count;}
export function connectSuggestedPower(c,body,ids){return transaction(c,body,i=>powerTargets(i,body,ids));}
export function connectSuggestedFuel(c,body,refuelerId){return transaction(c,body,i=>{const fuel=i.building(body,refuelerId);if(fuel?.type!=='refueler')throw Error('Choose a Refueler Station.');const wells=c.bases[body].buildings.filter(b=>b.type==='gaswell').sort((a,b)=>Math.hypot(a.x-fuel.x,a.z-fuel.z)-Math.hypot(b.x-fuel.x,b.z-fuel.z));const well=wells.find(w=>Math.hypot(w.x-fuel.x,w.z-fuel.z)<=80);if(!well)throw Error('Place a Gas Drill within 80 m of the Refueler.');let count=powerTargets(i,body,[well.id,fuel.id]);if(!i.connections[body].some(l=>l.a.building===well.id&&l.b.building===fuel.id&&l.channel==='resource')){const result=i.connect(body,{building:well.id,port:'out'},{building:fuel.id,port:'in'});if(!result.ok)throw Error(result.reason);count++;}return count;});}

export function suggestedPlacement(demo,type){
 const c=demo.campaign,body=demo.body;if(demo.mode==='flight')return null;
 const origin=sub(demo.ship,BODIES[body].position),baseX=origin[0],baseZ=origin[2];
 const candidates=[];for(const r of [19,26,34,44,58,76])for(let j=0;j<24;j++){const a=j*Math.PI/12;candidates.push([baseX+Math.cos(a)*r,baseZ+Math.sin(a)*r]);}
 for(const [x,z]of candidates){const check=c.canPlace(body,type,x,z,demo.ship);if(!check.ok)continue;const point=landingPoint(body,x,z),radius=INDUSTRY_TYPES[type].radius;if(type==='refueler'&&length(sub(point,demo.ship))>25)continue;if(type==='drill'){const vein=c.nearestDeposit(body,point);if(!vein||vein.distance>8.5||vein.remaining<=0)continue;}if(length(sub(point,demo.position))<radius+2.7||c.roverAvailable(body)&&length(sub(point,demo.rovers[body].position))<radius+2.7)continue;return {x,z,point};}return null;
}
