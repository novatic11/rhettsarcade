import {World,BIOMES,SIZE,CELL,rng,hashText} from './world.js';
import {ENTITY_TYPES} from './entities.js';
import {surfaceAt} from './footsteps.js';
export const ITEMS={water:{name:'Almond water',description:'A sealed bottle. Restores thirst and a little composure.',stack:4},food:{name:'Ration bar',description:'Unremarkable. You are grateful for that. Restores hunger.',stack:4},battery:{name:'Battery pack',description:'Restores the flashlight to full charge.',stack:3},medkit:{name:'Medical dressing',description:'Treats injuries. Restores 45 health.',stack:2},glow:{name:'Glow stick',description:'Leave a quiet light behind. Lasts for the rest of this journey.',stack:5},chalk:{name:'Chalk',description:'Mark the floor with an arrow pointing where you face.',stack:12},tool:{name:'Utility key',description:'A universal service key. Opens locked supply cabinets.',stack:3},note:{name:'Field note',description:'A fragment of somebody else’s journey.',stack:1}};
export const NOTES=[
 'The lights were still on when I woke up. I have not found a switch.',
 'I left an arrow at every turn. Eventually I found an arrow pointing back at me.',
 'The footsteps stopped when I stopped. The second time, they didn’t.',
 'There is water beyond the concrete halls. I filled three bottles. I left two behind.',
 'Don’t run unless you have somewhere to go. Something down here listens.',
 'The room with the green lamp is safe enough. Leave supplies for whoever comes next.',
 'I found the hotel again. The room numbers were different. I think.',
 'The maintenance key fits the grey cabinets. Check the shelves before moving on.',
 'It stood across the reservoir for an hour. I did not look away first.',
 'I heard the machinery stop. It was the silence that frightened me.',
 'The ceiling above the stairs is higher than the building should be.',
 'If you are reading this, please leave the chalk. I am still trying to get back.'
];
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
export function freshState(name,seed,difficulty){return {version:1,id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:name||'Untitled journey',seed:String(seed),difficulty,position:{x:34,z:34,y:0},yaw:Math.PI*.2,pitch:0,stats:{health:100,stamina:100,hunger:100,thirst:100,stress:0,battery:100,oxygen:100},inventory:[{type:'water',count:2},{type:'food',count:2},{type:'battery',count:1},{type:'chalk',count:6},{type:'glow',count:2}],changes:{},journal:[],discovered:[0],structures:[],landmarks:[],entities:[],director:{next:300+Math.random()*600,event:70+Math.random()*120,quiet:0},elapsed:0,distance:0,deepest:0,collected:0,encounters:0,flashlight:false,dead:false,savedAt:null};}
export class Game {
 constructor(state){this.state=state;this.world=new World(state.seed,state.difficulty,state.changes);state.randomState??=hashText(state.seed)+Math.floor(state.elapsed);this.random=()=>{state.randomState=(Math.imul(state.randomState,1664525)+1013904223)>>>0;return state.randomState/4294967296;};this.notifications=[];this.events=[];this.vy=Number.isFinite(state.verticalVelocity)?state.verticalVelocity:0;this.crouched=!!state.hiding?.id;this.hidden=state.hiding?.id||null;this.hiddenSeen=!!state.hiding?.seen;this.steps=0;this.lastStep=0;this.noise=0;this.safe=false;this.grounded=true;this.attackCooldown=0;this.lastDiscovery='';this.previousBiome=this.world.biomeAt(state.position.x,state.position.z).index;this.autoSave=0;this.beat=0;this.sprintLatched=false;this.crouchLatched=false;this.hideSpot=null;this.restoreLocker();}
 notify(text){this.notifications.push(text);}
 addItem(type,count=1){const inv=this.state.inventory,def=ITEMS[type];if(!def)return false;const existing=inv.find(i=>i.type===type&&i.count<def.stack);const space=(existing?def.stack-existing.count:0)+(12-inv.length)*def.stack;if(space<count)return false;while(count>0){let a=inv.find(i=>i.type===type&&i.count<def.stack);if(!a){a={type,count:0};inv.push(a);}const n=Math.min(count,def.stack-a.count);a.count+=n;count-=n;}return true;}
 removeItem(index,count=1){const a=this.state.inventory[index];if(!a||a.count<count)return false;a.count-=count;if(!a.count)this.state.inventory.splice(index,1);return true;}
 consume(index){const item=this.state.inventory[index];if(!item)return;const {type}=item,s=this.state.stats,p=this.state.position;
  if(type==='water'){s.thirst=clamp(s.thirst+48);s.stress=clamp(s.stress-12);}else if(type==='food')s.hunger=clamp(s.hunger+42);else if(type==='battery')s.battery=100;else if(type==='medkit')s.health=clamp(s.health+45);else if(type==='chalk'||type==='glow'){if(this.hidden){this.notify('Step out before leaving a marker.');return;}const c=this.world.chunk(Math.floor(p.x/SIZE),Math.floor(p.z/SIZE));this.world.delta(c.key).markers.push({id:`marker:${this.state.elapsed}:${this.random()}`,type,x:p.x,z:p.z,y:this.world.ground(p.x,p.z).height+.012,yaw:this.state.yaw});this.events.push({type:'marker',chunk:c.key});}else if(type==='tool'){this.notify('Use a utility key at a locked supply cabinet.');return;}else return;
  this.removeItem(index);this.notify(type==='chalk'?'You leave an arrow.':type==='glow'?'A little light, left behind.':`${ITEMS[type].name} used.`);
 }
 nearby(){const p=this.state.position,result=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=this.world.chunk(Math.floor(p.x/SIZE)+dx,Math.floor(p.z/SIZE)+dz),delta=this.state.changes[c.key];for(const item of c.items)if(!delta?.taken?.includes(item.id))result.push({...item,kind:'item',chunk:c.key,label:ITEMS[item.type].name});for(const d of c.doors)result.push({...d,kind:'door',chunk:c.key,label:`${this.world.isDoorOpen(d,c)?'Close':'Open'} room ${d.number}`});for(const a of c.props)if(a.kind==='locker'||a.storage||a.kind==='generator'||a.kind==='cot'||a.kind==='lift')result.push({...a,z:a.kind==='lift'?a.z+1.3:a.z,chunk:c.key,label:a.storage?'Supply chest':a.kind==='locker'?'Hide in locker':a.kind==='cot'?'Rest here':a.kind==='lift'?'Service elevator':'Locked supply cabinet'});}
  return result.filter(a=>Math.hypot(a.x-p.x,a.z-p.z)<2.8&&this.world.open((p.x+a.x)/2,(p.z+a.z)/2)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
 }
 target(){if(this.hidden)return {kind:'leave',label:'Leave hiding place'};const p=this.state.position,y=this.state.yaw;return this.nearby().find(a=>{const d=Math.hypot(a.x-p.x,a.z-p.z);return d<1.15||((a.x-p.x)*-Math.sin(y)+(a.z-p.z)*-Math.cos(y))/d>.30;});}
 interact(){const a=this.target();if(!a)return null;const p=this.state.position,delta=a.chunk?this.world.delta(a.chunk):null;
  if(a.kind==='leave'){const spot=this.hideSpot,id=this.hidden;if(spot){const exits=[spot.exit,{x:spot.x,z:spot.z+spot.d/2+.68},{x:spot.x+.35,z:spot.z+spot.d/2+.68},{x:spot.x-.35,z:spot.z+spot.d/2+.68}],exit=exits.find(q=>this.world.canStand(q.x,q.z));if(!exit){this.notify('The way out is blocked.');return null;}this.state.position={x:exit.x,z:exit.z,y:this.world.ground(exit.x,exit.z).height};this.state.yaw=spot.yaw;this.state.pitch=spot.pitch;this.state.flashlight=spot.flashlight;}this.hidden=null;this.hideSpot=null;this.hiddenSeen=false;this.crouched=false;this.vy=0;this.grounded=true;this.events.push({type:'locker',id,entering:false});this.notify('You step out quietly.');return a;}
  if(a.kind==='item'){if(a.type==='note'){const note=NOTES[a.note??0];if(!this.state.journal.includes(note))this.state.journal.push(note);this.events.push({type:'note',text:note});}else if(!this.addItem(a.type)){this.notify('Your bag is full.');return null;}delta.taken.push(a.id);this.state.collected++;this.events.push({type:'remove',id:a.id,chunk:a.chunk});this.noise=3;this.notify(a.type==='note'?'Field note added to journal.':`${ITEMS[a.type].name} collected.`);}
  else if(a.kind==='door'){const c=this.world.chunk(...a.chunk.split(',').map(Number));const closing=this.world.isDoorOpen(a,c);if(closing&&Math.abs(p.x-a.x)<.6&&Math.abs(p.z-a.z)<2.1){this.notify('Step clear of the doorway first.');return null;}delta.doors[a.id]=!closing;this.noise=15;this.events.push({type:'door',id:a.id,chunk:a.chunk});}
  else if(a.kind==='locker'){if(p.z<a.z-.1){this.notify('Use the door at the front of the locker.');return null;}this.hiddenSeen=this.state.entities.some(e=>{const def=ENTITY_TYPES[e.type]||ENTITY_TYPES.wanderer,d=Math.hypot(e.x-p.x,e.z-p.z),facing=d<4||((p.x-e.x)*-Math.sin(e.yaw)+(p.z-e.z)*-Math.cos(e.yaw))/d>-.05;return e.active!==false&&!e.dormant&&def.role!=='watcher'&&facing&&d<def.vision*(this.state.flashlight?1.3:this.crouched?.67:1)*this.world.difficulty.perception&&this.world.lineOfSight(e.x,e.z,p.x,p.z);});this.hideSpot={id:a.id,x:a.x,z:a.z,y:this.world.ground(a.x,a.z,false).height+.05,w:a.w,d:a.d,h:a.h,exit:{...p},yaw:this.state.yaw,pitch:this.state.pitch,flashlight:this.state.flashlight};this.hidden=a.id;this.setInsideLocker();this.events.push({type:'locker',id:a.id,entering:true});this.notify('Inside the locker. Listen through the vents.');}
  else if(a.storage)return {...a,kind:'storage'};else if(a.kind==='lift')return a;
  else if(a.kind==='cot'){if(this.state.entities.some(e=>e.mode==='chase'&&Math.hypot(e.x-p.x,e.z-p.z)<45)){this.notify('You cannot rest with something this close.');return null;}this.state.stats.health=clamp(this.state.stats.health+25);this.state.stats.stress=clamp(this.state.stats.stress-45);this.state.stats.stamina=100;this.state.stats.hunger=clamp(this.state.stats.hunger-4);this.state.stats.thirst=clamp(this.state.stats.thirst-6);this.state.elapsed+=60;this.notify('You rest for a minute.');}
  else if(a.kind==='generator'){if(delta.doors[a.id]){this.notify('The cabinet is empty.');return null;}const i=this.state.inventory.findIndex(a=>a.type==='tool');if(i<0){this.notify('A utility key might fit.');return null;}if(!this.addItem('battery',1)){this.notify('Make space in your bag first.');return null;}this.removeItem(this.state.inventory.findIndex(a=>a.type==='tool'));delta.doors[a.id]=true;this.noise=22;this.notify('You open the cabinet and find a battery.');}
  return a;
 }
 store(chunk,type,direction){const storage=this.world.delta(chunk).storage;if(direction==='deposit'){const i=this.state.inventory.findIndex(a=>a.type===type);if(i<0)return;this.removeItem(i);storage[type]=(storage[type]||0)+1;}else if(storage[type]>0){if(!this.addItem(type)){this.notify('Your bag is full.');return;}storage[type]--;if(!storage[type])delete storage[type];}}
 travel(lift,index){const stop=lift.stops[index];if(!stop||index===lift.index)return false;const x=stop.cx*SIZE+34,z=stop.cz*SIZE+34;if(!this.world.canStand(x,z))return false;const old=this.state.position;this.state.distance+=Math.hypot(x-old.x,z-old.z);this.state.position={x,z,y:this.world.ground(x,z).height};this.state.yaw=0;this.state.pitch=0;this.vy=0;this.hidden=null;this.state.elapsed+=3;this.state.deepest=Math.max(this.state.deepest,Math.hypot(x-34,z-34));this.previousBiome=this.world.biomeAt(x,z).index;this.world.delta(`${stop.cx},${stop.cz}`).doors[`${lift.id}:visited`]=true;this.notify('The doors open onto somewhere else.');return true;}
 move(dx,dz){const p=this.state.position,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));for(let i=0;i<n;i++){const can=(x,z)=>this.world.canStand(x,z,.27,p.y)&&this.world.ground(x,z).height<=Math.max(p.y,this.world.ground(p.x,p.z).height)+.38;if(can(p.x+dx/n,p.z))p.x+=dx/n;if(can(p.x,p.z+dz/n))p.z+=dz/n;}}
 update(dt,input={}){
  if(this.state.dead)return;dt=Math.min(dt,.06);const s=this.state,p=s.position,v=s.stats,d=this.world.difficulty;s.elapsed+=dt;this.attackCooldown=Math.max(0,this.attackCooldown-dt);this.noise=Math.max(0,this.noise-dt*12);
  this.crouched=!!input.crouch&&!this.hidden;let sprint=!!input.sprint&&v.stamina>2&&!this.crouched&&!this.hidden;
  const oldx=p.x,oldz=p.z,ground=this.hidden&&this.hideSpot?{height:this.hideSpot.y,water:false}:this.world.ground(p.x,p.z);let speed=(this.crouched?1.6:sprint?5.8:3.05)*(ground.water?.7:1);
  if(!this.hidden){let mx=(input.right?1:0)-(input.left?1:0),mz=(input.back?1:0)-(input.forward?1:0),len=Math.hypot(mx,mz);if(len){mx/=len;mz/=len;this.move((mx*Math.cos(s.yaw)+mz*Math.sin(s.yaw))*speed*dt,(-mx*Math.sin(s.yaw)+mz*Math.cos(s.yaw))*speed*dt);}}
  const distance=Math.hypot(p.x-oldx,p.z-oldz);s.distance+=distance;s.deepest=Math.max(s.deepest,Math.hypot(p.x-34,p.z-34));this.steps+=distance;
  if(distance>.001){this.noise=Math.max(this.noise,this.crouched?1:sprint?24:7);if(this.steps-this.lastStep>(sprint?1.9:1.5)){this.lastStep=this.steps;this.events.push({type:'step',surface:surfaceAt(this.world,p.x,p.z,p.y),sprint,crouch:this.crouched});}}
  v.stamina=clamp(v.stamina+dt*(sprint&&distance>.001?-16:11));
  const nextGround=this.hidden&&this.hideSpot?ground:this.world.ground(p.x,p.z);if(input.jump&&this.grounded&&!this.hidden&&!this.crouched){this.vy=4.2;this.grounded=false;this.noise=14;}
  if(!this.grounded||p.y>nextGround.height+.04){this.vy-=dt*11;p.y+=this.vy*dt;const ceiling=this.world.ceiling(p.x,p.z)-(this.crouched?1.02:1.67)-.12;if(p.y>ceiling){p.y=ceiling;this.vy=Math.min(0,this.vy);}this.grounded=false;if(p.y<=nextGround.height){p.y=nextGround.height;this.grounded=true;this.events.push({type:'land',force:Math.abs(this.vy),surface:surfaceAt(this.world,p.x,p.z,p.y)});this.vy=0;}}
  else {p.y=nextGround.height;this.vy=0;this.grounded=true;}
  v.hunger=clamp(v.hunger-dt*.017*d.drain);v.thirst=clamp(v.thirst-dt*(sprint?.04:.027)*d.drain);if(!v.hunger||!v.thirst)v.health=clamp(v.health-dt*.23*d.drain);
  if(s.flashlight&&v.battery>0)v.battery=clamp(v.battery-dt*.033);if(!v.battery)s.flashlight=false;
  v.oxygen=clamp(v.oxygen+dt*(nextGround.water&&p.y+(this.crouched?1.02:1.67)<.12&&!this.hidden?-5:18));if(!v.oxygen)v.health=clamp(v.health-dt*4);
  const c=this.world.chunk(Math.floor(p.x/SIZE),Math.floor(p.z/SIZE));this.safe=!!c.landmark?.safe&&Math.hypot(p.x-c.landmark.x,p.z-c.landmark.z)<14;
  const biome=this.world.biomeAt(p.x,p.z).index;if(!s.discovered.includes(biome)){s.discovered.push(biome);this.events.push({type:'discovery'});}this.previousBiome=biome;
  if(c.structure&&!s.structures.includes(c.structure.id)){s.structures.push(c.structure.id);this.notify(`Discovered: ${c.structure.name}.`);}
  if(c.landmark&&Math.hypot(p.x-c.landmark.x,p.z-c.landmark.z)<12&&!s.landmarks.includes(c.landmark.id)){s.landmarks.push(c.landmark.id);if(c.landmark.safe)this.notify('A shelter. Someone has been here before.');}
  s.timeSinceSafety=this.safe?0:(s.timeSinceSafety||0)+dt;const threat=s.entities.some(e=>e.active!==false&&Math.hypot(e.x-p.x,e.z-p.z)<24);v.stress=clamp(v.stress+dt*(this.safe?-.45:threat?.65:BIOMES[biome].brightness<.4&&!s.flashlight?.035:s.timeSinceSafety>1200?.012:-.018));
  this.tickDirector(dt);this.beat+=dt;if(this.beat>.16){this.updateAI(this.beat);this.beat=0;}
  if(!v.health){s.dead=true;this.hidden=null;this.events.push({type:'death'});}
 }
 tickDirector(dt){const s=this.state,d=s.director;s.director.quiet+=dt;d.next-=dt;d.event-=dt;
  if(d.event<0){d.event=80+this.random()*220;const type=this.random()<.0009?'impossible':this.random()<.28?'power':this.random()<.22?'silence':'distant';this.events.push({type,duration:type==='power'?7+this.random()*12:9,x:s.position.x+(this.random()-.5)*35,z:s.position.z+(this.random()-.5)*35});}
  if(d.next>0||s.entities.filter(e=>e.active!==false).length>=2)return;
  d.next=(300+this.random()*900)*this.world.difficulty.encounter;
  if(this.safe||s.stats.stress>85||s.stats.health<20||this.random()<.32)return;
  const p=s.position;let location=null;
  for(let i=0;i<35;i++){const angle=this.random()*Math.PI*2,distance=65+this.random()*40,x=Math.floor((p.x+Math.sin(angle)*distance)/CELL)*CELL+2,z=Math.floor((p.z+Math.cos(angle)*distance)/CELL)*CELL+2;const dot=((x-p.x)*-Math.sin(s.yaw)+(z-p.z)*-Math.cos(s.yaw))/distance;
   if(this.world.canStand(x,z,.35)&&(dot<-.2||!this.world.lineOfSight(x,z,p.x,p.z))){location={x,z};break;}}
  if(!location)return;const b=this.world.biomeAt(location.x,location.z).index,eligible=Object.entries(ENTITY_TYPES).filter(([id,t])=>t.biomes.includes(b)||id==='wanderer'),total=eligible.reduce((n,[id,t])=>n+t.weight,0);let roll=this.random()*total,type='wanderer';for(const [id,t] of eligible){roll-=t.weight;if(roll<=0){type=id;break;}}s.entities.push({id:`entity:${s.elapsed}`,type,...location,mode:'wander',yaw:0,memory:0,target:null,path:[],pathTimer:0,attack:0,age:0,counted:false,active:true,rng:Math.floor(this.random()*4294967296)});d.quiet=0;
 }
 updateAI(deltaTime){const s=this.state,p=s.position,world=this.world,mult=world.difficulty;for(const e of s.entities){let dt=deltaTime;const def=ENTITY_TYPES[e.type]||ENTITY_TYPES.wanderer,role=def.role;e.age+=dt;if(e.dormant){e.active=false;continue;}const distance=Math.hypot(e.x-p.x,e.z-p.z);e.active=distance<180;if(!e.active)continue;
   if(distance>110){e.pathTimer+=dt;if(e.pathTimer<3)continue;dt=3;e.pathTimer=0;}
   const perceived=this.hidden&&this.hiddenSeen&&this.hideSpot?{x:this.hideSpot.x,z:this.hideSpot.z+this.hideSpot.d/2+.4}:p,los=distance<45*mult.perception&&world.lineOfSight(e.x,e.z,perceived.x,perceived.z),facing=distance<4||((perceived.x-e.x)*-Math.sin(e.yaw)+(perceived.z-e.z)*-Math.cos(e.yaw))/distance>-.05;
   const sees=los&&facing&&distance<(def.vision*(s.flashlight?1.3:this.crouched?.67:1)*mult.perception)&&(!this.hidden||this.hiddenSeen);
   const hears=distance<this.noise*def.hearing*mult.perception&&!this.hidden;
   const observed=los&&((e.x-p.x)*-Math.sin(s.yaw)+(e.z-p.z)*-Math.cos(s.yaw))/Math.max(1,distance)>.78;
   if(los&&distance<40&&!e.counted){e.counted=true;s.encounters++;}
   if(def.update?.(this,e,dt,{sees,hears,observed,los,distance}))continue;
   if(role==='watcher'){if(observed){e.mode='watch';e.memory+=dt;if(e.memory>18&&distance>18){e.active=false;e.dormant=true;e.mode='vanished';continue;}}else if(los&&distance<35){e.target={x:perceived.x,z:perceived.z};e.mode='approach';}else e.mode='wander';if(distance<def.range&&!observed&&los&&(!this.hidden||this.hiddenSeen)){vDamage(s,dt*def.damage*mult.damage);e.mode='chase';}}
   else if(role==='stalker'){if(sees||hears){e.target={x:perceived.x,z:perceived.z};e.memory=80;e.mode=distance<7?'chase':distance<20?'watch':'follow';}else{e.memory=Math.max(0,e.memory-dt);if(!e.memory)e.mode='wander';}}
   else if(sees){e.mode='chase';e.memory=18;e.target={x:perceived.x,z:perceived.z};e.pathTimer=0;}
   else if(hears){if(e.mode!=='chase')e.mode='investigate';e.target={x:p.x,z:p.z};e.memory=Math.max(8,e.memory);}
   else if(e.memory>0){e.memory-=dt;if(e.mode==='chase')e.mode='search';if(e.memory<=0){e.mode='wander';e.target=null;}}
   if(e.mode==='chase'&&distance<def.range&&los&&(!this.hidden||this.hiddenSeen)&&this.attackCooldown<=0){vDamage(s,def.damage*mult.damage);this.attackCooldown=1.2;this.events.push({type:'attack'});this.noise=35;}
   if(e.mode==='watch')continue;
   if(!e.target||Math.hypot(e.x-e.target.x,e.z-e.target.z)<1.1){if(e.memory>0){e.mode='search';const r=rng(e.rng);e.rng=Math.floor(r()*4294967296);e.target={x:e.target.x+(r()-.5)*14,z:e.target.z+(r()-.5)*14};}else{const r=rng(e.rng);e.rng=Math.floor(r()*4294967296);e.target={x:Math.floor((e.x+(r()-.5)*40)/CELL)*CELL+2,z:Math.floor((e.z+(r()-.5)*40)/CELL)*CELL+2};}}
   e.pathTimer-=dt;if(e.pathTimer<=0){e.pathTimer=e.mode==='chase'?.7:3;e.path=world.path(e.x,e.z,e.target.x,e.target.z,700);if(e.path.length&&world.canStand(e.target.x,e.target.z))e.path[e.path.length-1]={...e.target};if(!e.path.length&&world.lineOfSight(e.x,e.z,e.target.x,e.target.z))e.path=[{...e.target}];if(!e.path.length&&e.mode!=='chase')e.target=null;}
   if(e.path?.length){const t=e.path[0],dx=t.x-e.x,dz=t.z-e.z,len=Math.hypot(dx,dz),speed=(e.mode==='chase'?def.pursuit:def.walk)*mult.speed;const move=Math.min(len,speed*dt);e.yaw=Math.atan2(-dx,-dz);if(world.canStand(e.x+dx/len*move,e.z,.33))e.x+=dx/len*move;if(world.canStand(e.x,e.z+dz/len*move,.33))e.z+=dz/len*move;if(len<.8)e.path.shift();e.stepDistance=(e.stepDistance||0)+move;if(e.stepDistance>1.6&&distance<35){e.stepDistance=0;this.events.push({type:'entityStep',x:e.x,z:e.z,surface:surfaceAt(world,e.x,e.z,world.ground(e.x,e.z).height),entity:true});}}
  }
  // Retain distant entities as cheap persistent records; cap historical population.
  if(s.entities.length>24)s.entities=s.entities.filter(e=>e.active||e.age<3600).slice(-24);
 }
 setInsideLocker(){const a=this.hideSpot;if(!a)return;this.state.position={x:a.x,z:a.z-.03,y:a.y};this.state.yaw=Math.PI;this.state.pitch=0;this.state.flashlight=false;this.crouched=false;this.vy=0;this.grounded=true;}
 restoreLocker(){if(!this.hidden)return;this.hideSpot=this.state.hiding?.spot||null;if(!this.hideSpot){const p=this.state.position;for(let dz=-1;dz<=1&&!this.hideSpot;dz++)for(let dx=-1;dx<=1&&!this.hideSpot;dx++){const c=this.world.chunk(Math.floor(p.x/SIZE)+dx,Math.floor(p.z/SIZE)+dz),a=c.props.find(a=>a.id===this.hidden&&a.kind==='locker');if(a)this.hideSpot={id:a.id,x:a.x,z:a.z,y:this.world.ground(a.x,a.z,false).height+.05,w:a.w,d:a.d,h:a.h,exit:this.world.canStand(p.x,p.z)?{...p}:{x:a.x,z:a.z+a.d/2+.68},yaw:this.state.yaw,pitch:0,flashlight:this.state.flashlight};}}if(this.hideSpot){const yaw=this.state.yaw,pitch=this.state.pitch;this.setInsideLocker();if(this.state.hiding?.spot){this.state.yaw=yaw;this.state.pitch=pitch;}}}
 serialize(){return JSON.stringify({...this.state,hiding:{id:this.hidden,seen:this.hiddenSeen,spot:this.hideSpot||null},verticalVelocity:this.vy,savedAt:new Date().toISOString()});}
}
function vDamage(s,n){s.stats.health=clamp(s.stats.health-n);s.stats.stress=clamp(s.stats.stress+20);}
export function parseSave(text){const s=JSON.parse(text),fail=()=>{throw new Error('This save is damaged or is not compatible.');};if(!s||s.version!==1||typeof s.seed!=='string'||typeof s.id!=='string'||typeof s.name!=='string'||!['explorer','survival','nightmare'].includes(s.difficulty)||!s.stats||!s.position||!['x','y','z'].every(k=>Number.isFinite(s.position[k]))||!Array.isArray(s.inventory)||s.inventory.length>12||!s.changes||Array.isArray(s.changes)||!s.director)fail();for(const k of ['health','stamina','hunger','thirst','stress','battery','oxygen'])if(!Number.isFinite(s.stats[k])||s.stats[k]<0||s.stats[k]>100)fail();for(const k of ['elapsed','distance','deepest','collected','encounters','yaw','pitch'])if(!Number.isFinite(s[k]))fail();for(const k of ['next','event','quiet'])if(!Number.isFinite(s.director[k]))fail();for(const k of ['journal','discovered','structures','landmarks','entities'])if(!Array.isArray(s[k]))fail();if(s.discovered.some(i=>!Number.isInteger(i)||!BIOMES[i])||s.journal.some(i=>typeof i!=='string'))fail();for(const i of s.inventory)if(!ITEMS[i.type]||!Number.isInteger(i.count)||i.count<1||i.count>ITEMS[i.type].stack)fail();for(const [key,c] of Object.entries(s.changes)){if(!/^-?\d+,-?\d+$/.test(key)||!Array.isArray(c.taken)||!Array.isArray(c.markers)||!c.doors||!c.storage)fail();for(const a of c.markers)if(!['chalk','glow'].includes(a.type)||!['x','y','z','yaw'].every(k=>Number.isFinite(a[k])))fail();for(const [type,count] of Object.entries(c.storage))if(!ITEMS[type]||!Number.isInteger(count)||count<1)fail();}if(s.hiding){if(typeof s.hiding!=='object'||Array.isArray(s.hiding)||(s.hiding.id!==null&&typeof s.hiding.id!=='string')||typeof s.hiding.seen!=='boolean')fail();const a=s.hiding.spot;if(a&&(!s.hiding.id||a.id!==s.hiding.id||!['x','y','z','w','d','h','yaw','pitch'].every(k=>Number.isFinite(a[k]))||a.w<=0||a.d<=0||a.h<=0||!a.exit||!Number.isFinite(a.exit.x)||!Number.isFinite(a.exit.z)||typeof a.flashlight!=='boolean'))fail();}for(const e of s.entities)if(typeof e.id!=='string'||!ENTITY_TYPES[e.type]||!['x','z','yaw','memory','age','rng','pathTimer'].every(k=>Number.isFinite(e[k]))||!Array.isArray(e.path))fail();return s;}













