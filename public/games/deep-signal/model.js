export const W=1000,H=560,RADIUS=14,SPAWN={x:500,y:82};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const BIOMES=[
 {name:'The sunken shelf',tag:'Broken coral. Lost cargo.',water:['#174955','#061c2b'],rock:['#59736c','#233c41','#102c37'],glow:'#90e7d5',plant:'#569c8e'},
 {name:'The kelp cathedral',tag:'Something moves between the fronds.',water:['#214a49','#081e2b'],rock:['#617969','#2e4945','#112f36'],glow:'#b4e4b1',plant:'#7aab72'},
 {name:'The drowned fleet',tag:'Steel sleeps. The water does not.',water:['#27424f','#0c1827'],rock:['#687077','#35434b','#192c38'],glow:'#f0bd89',plant:'#779584'},
 {name:'The midnight rift',tag:'Follow the light. Watch what follows you.',water:['#242c4c','#0b1025'],rock:['#626680','#353651','#20243f'],glow:'#b9b8f0',plant:'#8e8dc9'}
];
export function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Drain grows by 10% per descent, with a firm ceiling so the timer stays fair.
export const oxygenDrain=level=>Math.min(1.25,1.1**Math.min(3,Math.max(0,level-1)));
export function salvageVisibility(cache,dive){if(cache.taken)return 0;if(d(cache,dive)<225)return 1;const age=dive.time-cache.echoAt;return Number.isFinite(age)&&age>=0?.85*clamp(1-Math.max(0,age-.5)/.35,0,1):0;}
export function isFree(rocks,x,y,padding=RADIUS+7){return x>=42&&x<=958&&y>=50&&y<=510&&rocks.every(r=>Math.hypot(x-r.x,y-r.y)>r.r+padding);}
// A conservative navigation mesh keeps every collectible in the connected sea.
export function navigation(rocks,start=SPAWN){
 const cols=39,rows=20,points=Array.from({length:cols*rows},(_,i)=>({x:42+i%cols*24,y:50+Math.floor(i/cols)*24,id:i}));
 const free=new Set(points.filter(p=>isFree(rocks,p.x,p.y)).map(p=>p.id));let first=points.filter(p=>free.has(p.id)).sort((a,b)=>d(a,start)-d(b,start))[0];
 if(!first)return {points:[],prev:new Map(),start:null};const queue=[first.id],prev=new Map([[first.id,null]]);
 for(let i=0;i<queue.length;i++){const id=queue[i],x=id%cols,y=Math.floor(id/cols);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,next=ny*cols+nx;if(nx>=0&&nx<cols&&ny>=0&&ny<rows&&free.has(next)&&!prev.has(next)){prev.set(next,id);queue.push(next);}}}
 return {points:queue.map(id=>points[id]),prev,start:first.id};
}
export function createSector(seed,level){
 const rng=random((seed^Math.imul(level,0x45d9f3b))>>>0),biome=BIOMES[(level-1)%BIOMES.length],rocks=[],rockCount=5+Math.min(17,level-1);
 for(let tries=0;rocks.length<rockCount&&tries<4000;tries++){const r={x:85+rng()*830,y:145+rng()*335,r:24+rng()*17,angle:rng()*Math.PI,shape:rng()*100,kind:(level>=3&&rng()<.24)?'wreck':'rock'};if(d(r,SPAWN)<r.r+145||rocks.some(a=>d(a,r)<a.r+r.r+29))continue;rocks.push(r);}
 const nav=navigation(rocks),candidates=[...nav.points];for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 const caches=[],wanted=5+Math.min(3,Math.floor((level-1)/4));for(const p of candidates){if(p.y<110||d(p,SPAWN)<145||caches.some(a=>d(a,p)<110)||!isFree(rocks,p.x,p.y,35))continue;caches.push({id:caches.length,x:p.x,y:p.y,taken:false,echoAt:-Infinity,echoPing:-Infinity,spin:rng()*6,kind:rng()<.25?'relic':'cargo'});if(caches.length===wanted)break;}
 // The navigation set is large; this fallback only relaxes spacing, never reachability.
 for(const p of candidates){if(caches.length>=wanted)break;if(d(p,SPAWN)>130&&caches.every(a=>d(a,p)>65)&&isFree(rocks,p.x,p.y,29))caches.push({id:caches.length,x:p.x,y:p.y,taken:false,echoAt:-Infinity,echoPing:-Infinity,spin:rng()*6,kind:'cargo'});}
 const hazards=[],types=level<2?['jelly']:level<3?['jelly','hunter']:level<5?['jelly','hunter','mine']:['jelly','hunter','eel','mine'];
 for(const p of candidates){if(hazards.length>=2+Math.min(16,level-1))break;if(d(p,SPAWN)<200||caches.some(a=>d(a,p)<55)||hazards.some(a=>d(a,p)<64)||!isFree(rocks,p.x,p.y,30))continue;const kind=types[hazards.length%types.length];hazards.push({id:hazards.length,kind,x:p.x,y:p.y,homeX:p.x,homeY:p.y,r:kind==='jelly'?22:kind==='mine'?13:17,angle:rng()*6,phase:rng()*6,alert:0,cooldown:1+rng()*3,mode:'patrol',clock:0,alive:true});}
 return {level,biome,rocks,caches,hazards,seed,drift:level>1?Math.min(10,2+Math.log2(level)*1.5):0,flow:rng()*6};
}
export class Dive{
 constructor(seed=Math.floor(Math.random()*4294967296)){
  this.seed=seed>>>0;this.level=1;this.cleared=0;this.total=0;this.score=0;this.time=0;this.hull=5;this.maxHull=5;this.air=90;this.maxAir=90;this.x=SPAWN.x;this.y=SPAWN.y;this.vx=this.vy=0;this.heading=0;this.facing=1;this.invulnerable=2;this.pingTime=-10;this.status='playing';this.transition=null;this.particles=[];this.events=[];this.generation=1;this.shake=0;this.warning=false;this.message='Recover every glowing salvage pod. The next screen opens automatically.';this.messageTime=6;this.sector=createSector(this.seed,1);
 }
 get caches(){return this.sector.caches;}
 get hazards(){return this.sector.hazards;}
 get rocks(){return this.sector.rocks;}
 get remaining(){return this.caches.filter(c=>!c.taken).length;}
 get recovered(){return this.caches.length-this.remaining;}
 get depth(){return this.level*250;}
 get drainRate(){return oxygenDrain(this.level);}
 get airSeconds(){return this.air/this.drainRate;}
 get maxAirSeconds(){return this.maxAir/this.drainRate;}
 get nearest(){return this.caches.filter(c=>!c.taken).map(c=>({...c,d:d(this,c)})).sort((a,b)=>a.d-b.d)[0];}
 say(message,seconds=3.5){this.message=message;this.messageTime=seconds;}
 burst(x,y,color,count=16){for(let i=0;i<count;i++){const a=i/count*Math.PI*2,s=25+(i%5)*14;this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-14,life:.6+(i%4)*.16,max:1,color,size:2+i%3});}if(this.particles.length>160)this.particles.splice(0,this.particles.length-160);}
 ping(){if(this.status!=='playing'||this.transition||this.time-this.pingTime<3)return false;this.pingTime=this.time;this.events.push('ping');for(const h of this.hazards)if(h.kind==='hunter')h.alert=5;return true;}
 recover(){if(this.status!=='playing'||this.transition)return false;const c=this.nearest;if(!c||c.d>44){this.say('Touch a salvage pod to collect it, or press E when close.');return false;}return this.collect(c.id);}
 collect(id){if(this.status!=='playing'||this.transition)return false;const c=this.caches.find(c=>c.id===id);if(!c||c.taken)return false;c.taken=true;c.takenAt=this.time;this.total++;this.score+=c.kind==='relic'?150:100;this.air=Math.min(this.maxAir,this.air+1.5*this.drainRate);this.events.push('pickup');this.burst(c.x,c.y,c.kind==='relic'?'#f1c28c':'#9fe8d9');if(this.remaining===0){this.cleared++;this.score+=250+this.level*25;this.events.push('clear');this.transition={elapsed:0,duration:1.8,from:{x:this.x,y:this.y},next:createSector(this.seed,this.level+1)};this.say('SECTOR CLEAR · descending. Air replenished. Hull +1.',4);}else this.say(this.remaining+' salvage '+(this.remaining===1?'pod remains.':'pods remain.'));return true;}
 hit(reason='Hull impact! Give rocks and sea life some room.'){
  if(this.status!=='playing'||this.transition||this.invulnerable>0)return false;this.hull--;this.invulnerable=1.45;this.shake=.5;this.events.push('hit');this.burst(this.x,this.y,'#edb18f',12);this.say(reason);if(this.hull<=0){this.status='lost';this.events.push('lost');}return true;
 }
 nextSector(){this.level++;this.sector=this.transition.next;this.transition=null;this.generation++;this.x=SPAWN.x;this.y=SPAWN.y;this.vx=this.vy=0;this.air=this.maxAir=90;this.hull=Math.min(this.maxHull,this.hull+1);this.invulnerable=2.2;this.pingTime=this.time-10;this.warning=false;this.particles=[];this.events.push('descend');this.say(this.level===2?'Hunters hear sonar. Ping to find salvage, then keep moving.':this.sector.biome.tag,5);}
 update(dt,keys={}){
  if(this.status!=='playing')return;dt=clamp(Number.isFinite(dt)?dt:0,0,.05);this.time+=dt;this.messageTime-=dt;if(this.messageTime<=0)this.message='';this.shake=Math.max(0,this.shake-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);p.vy-=dt*15;}this.particles=this.particles.filter(p=>p.life>0);
  if(this.transition){this.transition.elapsed+=dt;if(this.transition.elapsed>=this.transition.duration)this.nextSector();return;}
  const dx=Number(!!keys.right)-Number(!!keys.left),dy=Number(!!keys.down)-Number(!!keys.up),len=Math.hypot(dx,dy)||1,drag=Math.exp(-1.75*dt),flow=this.sector.flow;
  this.vx=(this.vx+dx/len*240*dt+Math.cos(flow)*this.sector.drift*dt)*drag;this.vy=(this.vy+dy/len*240*dt+Math.sin(flow)*this.sector.drift*dt)*drag;this.x+=this.vx*dt;this.y+=this.vy*dt;
  if(Math.abs(this.vx)>12)this.facing=this.vx>0?1:-1;this.heading+=((Math.atan2(this.vy,Math.abs(this.vx)+60)*.32)-this.heading)*(1-Math.exp(-dt*7));
  for(const r of this.rocks){const dist=d(this,r),min=r.r+RADIUS;if(dist<min){const nx=dist>.001?(this.x-r.x)/dist:1,ny=dist>.001?(this.y-r.y)/dist:0,speed=Math.hypot(this.vx,this.vy),toward=this.vx*nx+this.vy*ny;this.x=r.x+nx*(min+.4);this.y=r.y+ny*(min+.4);if(toward<0){this.vx-=nx*toward*1.25;this.vy-=ny*toward*1.25;}if(speed>88)this.hit('Rock collision! Ease off the throttle around tight gaps.');}}
  if(this.x<35||this.x>965)this.vx*=.2;if(this.y<48||this.y>515)this.vy*=.2;this.x=clamp(this.x,35,965);this.y=clamp(this.y,48,515);
  // Pursuers stay slower than the submarine; dash attacks keep their warning window.
  const speedScale=Math.min(1.7,1+Math.log2(this.level)*.17);
  for(const h of this.hazards){if(!h.alive)continue;h.clock+=dt;h.alert=Math.max(0,h.alert-dt);const distance=d(this,h);
   if(h.kind==='jelly'){const x=h.homeX+Math.sin(this.time*.4+h.phase)*18,y=h.homeY+Math.sin(this.time*.68*speedScale+h.phase)*28;if(isFree(this.rocks,x,y,h.r+2)){h.x=x;h.y=y;}}
   if(h.kind==='hunter'){const hunt=distance<230+Math.min(130,this.level*4)||h.alert>0,tx=hunt?this.x:h.homeX+Math.cos(this.time*.3+h.phase)*60,ty=hunt?this.y:h.homeY+Math.sin(this.time*.4+h.phase)*45,target=Math.atan2(ty-h.y,tx-h.x),delta=Math.atan2(Math.sin(target-h.angle),Math.cos(target-h.angle));h.angle+=clamp(delta,-dt*1.8,dt*1.8);const speed=(hunt?52:23)*speedScale;h.x+=Math.cos(h.angle)*speed*dt;h.y+=Math.sin(h.angle)*speed*dt;h.mode=hunt?'hunt':'patrol';}
   if(h.kind==='eel'){h.cooldown-=dt;if(h.mode==='warn'){if(h.cooldown<=0){h.mode='dash';h.cooldown=.72;}}else if(h.mode==='dash'){h.x+=Math.cos(h.angle)*180*dt;h.y+=Math.sin(h.angle)*180*dt;if(h.cooldown<=0){h.mode='patrol';h.cooldown=2.1/speedScale;}}else{h.x+=Math.cos(h.angle)*19*dt;h.y+=Math.sin(h.angle)*19*dt;h.angle+=Math.sin(this.time+h.phase)*dt*.5;if(distance<300&&h.cooldown<=0){h.mode='warn';h.cooldown=.9;h.angle=Math.atan2(this.y-h.y,this.x-h.x);}}}
   if(h.kind==='mine'){if(h.mode==='patrol'&&distance<100){h.mode='armed';h.cooldown=.95;}if(h.mode==='armed'){h.cooldown-=dt;if(h.cooldown<=0){h.mode='burst';h.cooldown=.35;this.burst(h.x,h.y,'#e8ae8e',24);this.events.push('mine');}}else if(h.mode==='burst'){h.cooldown-=dt;if(d(this,h)<76)this.hit('Pressure mine! Back away when its warning ring starts flashing.');if(h.cooldown<=0)h.alive=false;}}
   else if(d(this,h)<h.r+RADIUS-2)this.hit(h.kind==='eel'?'Eel strike! Its glowing eye warns before it lunges.':h.kind==='hunter'?'Hunter impact! Keep moving and watch your sonar.':'Jellyfish sting! Stay clear of the glowing bells.');
   if(h.kind!=='jelly'&&h.kind!=='mine'){for(const rock of this.rocks){const gap=d(h,rock),min=rock.r+h.r+3;if(gap<min){const a=gap>.01?Math.atan2(h.y-rock.y,h.x-rock.x):h.angle;h.x=rock.x+Math.cos(a)*min;h.y=rock.y+Math.sin(a)*min;h.angle+=dt*2;}}if(h.x<50||h.x>950||h.y<65||h.y>500)h.angle+=Math.PI*.8;h.x=clamp(h.x,50,950);h.y=clamp(h.y,65,500);}
  }
  if(this.status!=='playing')return;
  const pingAge=this.time-this.pingTime;for(const c of this.caches){if(pingAge>=0&&pingAge<3&&c.echoPing!==this.pingTime&&d(this,c)<pingAge*420){c.echoAt=this.time;c.echoPing=this.pingTime;}if(!c.taken&&d(this,c)<29){this.collect(c.id);if(this.transition)break;}}
  if(this.transition)return;this.air=Math.max(0,this.air-dt*this.drainRate);if(this.airSeconds<20&&!this.warning){this.warning=true;this.events.push('air');this.say('LOW AIR · collect salvage for +1.5 seconds. Clear the screen to refill.',5);}if(this.airSeconds>24)this.warning=false;if(this.air<=0){this.status='lost';this.events.push('lost');this.say('Air supply exhausted.');}
 }
 checkpoint(){if(this.status!=='playing')return null;const next=!!this.transition;return {v:2,seed:this.seed,level:this.level+(next?1:0),cleared:this.cleared,total:this.total,score:this.score,hull:next?Math.min(5,this.hull+1):this.hull,air:next?90:this.air,time:this.time,x:next?SPAWN.x:this.x,y:next?SPAWN.y:this.y,taken:next?[]:this.caches.filter(c=>c.taken).map(c=>c.id)};}
 static restore(raw){
  if(!raw||raw.v!==2||!Number.isInteger(raw.seed)||!Number.isSafeInteger(raw.level)||raw.level<1||raw.level>1e9||!Number.isFinite(raw.air)||raw.air<=0||!Number.isFinite(raw.hull)||raw.hull<=0)return null;
  const g=new Dive(raw.seed);g.level=raw.level;g.sector=createSector(g.seed,g.level);g.cleared=Math.min(g.level-1,Math.max(0,Math.floor(raw.cleared)||0));g.total=clamp(Math.floor(raw.total)||0,0,1e12);g.score=clamp(Math.floor(raw.score)||0,0,1e14);g.time=clamp(Number(raw.time)||0,0,1e12);g.hull=clamp(Math.floor(raw.hull),1,5);g.maxAir=90;g.air=clamp(raw.air,.1,g.maxAir);for(const c of g.caches){c.taken=Array.isArray(raw.taken)&&raw.taken.includes(c.id);}if(!g.remaining)return null;if(Number.isFinite(raw.x)&&Number.isFinite(raw.y)&&isFree(g.rocks,raw.x,raw.y,15)){g.x=raw.x;g.y=raw.y;}g.generation=g.level;g.pingTime=g.time-10;g.say('Dive resumed. '+g.remaining+' salvage '+(g.remaining===1?'pod remains':'pods remain')+' on this screen.');return g;
 }
}
