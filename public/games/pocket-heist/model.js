// Pocket Heist 2.0 — procedural stealth jobs. Pure logic, no DOM.
export const T=30,GW=32,GH=20,W=GW*T,H=GH*T;
export const FLOOR=0,WALL=1,OUT=2,DOOR=3,RED=4,BLUE=5,EXIT=6;
export const CHAPTERS=[
 {name:'Night School',intro:'Guards patrol with flashlights. Stay out of their light, grab the marked target and get back to the van.'},
 {name:'Eyes on the Walls',intro:'Security cameras sweep back and forth. Their cones trip the alarm just like a guard.'},
 {name:'Keys to the Kingdom',intro:'Locked doors need a matching keycard. Find it first.'},
 {name:'Red Light District',intro:'Laser tripwires pulse across doorways. Wait for the gap.'},
 {name:'Safe Cracking',intro:'The big prize sits in a vault. Hold E to crack it — the drill is loud.'},
 {name:'Lights Out',intro:'Dark rooms make you harder to spot. Lockers let you hide: press E beside one.'},
 {name:'Who Let the Dogs In',intro:'Guard dogs are fast and can smell you through walls when you are close. Sneak.'},
 {name:'Creaky Floors',intro:'Old floorboards creak when you walk on them. Sneaking keeps them quiet.'},
 {name:'Inside Job',intro:'Security terminals loop the cameras and lasers for a while. Hold E to hack one.'},
 {name:'The Masterpiece',intro:'Everything at once. The biggest jobs in the city.'}
];
export const GEAR={
 smoke:{name:'Smoke bombs',key:'Q',costs:[150,400,900],desc:'Drop a cloud that blocks every line of sight. One charge per level, per job.'},
 decoy:{name:'Noisemakers',key:'F',costs:[120,350,800],desc:'Toss a rattling decoy ahead. Guards go to investigate.'},
 emp:{name:'EMP charges',key:'C',costs:[300,700,1500],desc:'Knock out nearby cameras and lasers for 8 seconds.'},
 shoes:{name:'Soft shoes',costs:[250,700],desc:'Walking makes less noise and creaky floors are quieter.'},
 hands:{name:'Quick hands',costs:[300,800],desc:'Crack vaults and hack terminals faster.'},
 suit:{name:'Shadow suit',costs:[400,1100],desc:'Guards and cameras take longer to spot you.'}
};
export function rng(seed){let s=(seed>>>0)||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
export const chapterOf=level=>level>100?9:Math.min(9,Math.floor((level-1)/10));
export function features(level){
 const ch=chapterOf(level),endless=level>100,R=rng(level*31+7),pick=p=>endless?R()<p:false;
 return {cameras:ch>=1||pick(.8),locks:ch>=2?(ch>=6&&R()<.6?2:1):0,lasers:ch>=3||pick(.7),vault:ch>=4||pick(.6),dark:ch>=5||pick(.5),dogs:ch>=6||pick(.5),creaks:ch>=7||pick(.5),terminal:ch>=8||pick(.5)};
}

export function generate(level){
 const R=rng(level*7919+101),ri=(a,b)=>a+Math.floor(R()*(b-a+1)),f=features(level),ch=chapterOf(level);
 const inCh=level>100?9:(level-1)%10,prog=level>100?1:Math.min(1,(ch*10+inCh)/90);
 const bw=Math.min(30,15+Math.round(prog*13)+ri(0,2)),bh=Math.min(18,10+Math.round(prog*7)+ri(0,1));
 const x0=Math.floor((GW-bw)/2),y0=Math.max(0,Math.floor((GH-1-bh)/2));
 const g=new Uint8Array(GW*GH).fill(OUT),at=(x,y)=>x<0||y<0||x>=GW||y>=GH?OUT:g[y*GW+x],set=(x,y,v)=>{g[y*GW+x]=v;};
 for(let y=y0;y<y0+bh;y++)for(let x=x0;x<x0+bw;x++)set(x,y,(x===x0||y===y0||x===x0+bw-1||y===y0+bh-1)?WALL:FLOOR);
 const rooms=[],doors=[];
 const split=(r,depth)=>{
  const canV=r.w>=9,canH=r.h>=7,big=r.w*r.h>(depth<2?30:44+R()*30);
  if(!big||(!canV&&!canH)){rooms.push(r);return;}
  const vertical=canV&&(!canH||r.w/r.h>1.15||(r.w/r.h>.8&&R()<.5));
  for(let tries=0;tries<12;tries++){
   if(vertical){const sx=r.x+ri(4,r.w-5);if(doors.some(d=>d.y>=r.y-1&&d.y<=r.y+r.h&&(d.x===sx)&&(d.y===r.y-1||d.y===r.y+r.h)))continue;
    for(let y=r.y;y<r.y+r.h;y++)set(sx,y,WALL);const dy=ri(r.y,r.y+r.h-1);set(sx,dy,DOOR);const a={x:r.x,y:r.y,w:sx-r.x,h:r.h},b={x:sx+1,y:r.y,w:r.x+r.w-sx-1,h:r.h};const d={x:sx,y:dy,v:true};doors.push(d);split(a,depth+1);split(b,depth+1);return;}
   else{const sy=r.y+ri(3,r.h-4);if(doors.some(d=>(d.y===sy)&&(d.x===r.x-1||d.x===r.x+r.w)))continue;
    for(let x=r.x;x<r.x+r.w;x++)set(x,sy,WALL);const dx=ri(r.x,r.x+r.w-1);set(dx,sy,DOOR);const a={x:r.x,y:r.y,w:r.w,h:sy-r.y},b={x:r.x,y:sy+1,w:r.w,h:r.y+r.h-sy-1};doors.push({x:dx,y:sy,v:false});split(a,depth+1);split(b,depth+1);return;}
  }
  rooms.push(r);
 };
 split({x:x0+1,y:y0+1,w:bw-2,h:bh-2},0);
 rooms.forEach((r,i)=>{r.id=i;r.cx=r.x+Math.floor(r.w/2);r.cy=r.y+Math.floor(r.h/2);});
 const roomOf=(x,y)=>rooms.find(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);
 for(const d of doors){d.a=roomOf(d.v?d.x-1:d.x,d.v?d.y:d.y-1);d.b=roomOf(d.v?d.x+1:d.x,d.v?d.y:d.y+1);}
 // Exit on the bottom wall, under a room that touches it.
 const bottom=rooms.filter(r=>r.y+r.h===y0+bh-1),startRoom=bottom[ri(0,bottom.length-1)],ex=ri(startRoom.x+1,startRoom.x+startRoom.w-2),ey=y0+bh-1;set(ex,ey,EXIT);
 const exit={x:ex,y:ey},start={x:(ex+.5)*T,y:(ey-.5)*T};
 // Room graph depth from start.
 const adj=new Map(rooms.map(r=>[r,[]]));for(const d of doors)if(d.a&&d.b){adj.get(d.a).push([d.b,d]);adj.get(d.b).push([d.a,d]);}
 const reach=(from,blocked=new Set())=>{const dist=new Map([[from,0]]),q=[from],via=new Map();while(q.length){const r=q.shift();for(const [n,d] of adj.get(r))if(!blocked.has(d)&&!dist.has(n)){dist.set(n,dist.get(r)+1);via.set(n,d);q.push(n);}}return {dist,via};};
 const base=reach(startRoom);const depth=r=>base.dist.get(r)??0;
 const sorted=rooms.slice().sort((a,b)=>depth(b)-depth(a));
 const used=new Set([exit.x+','+exit.y]),doorSet=new Set(doors.map(d=>d.x+','+d.y));
 const nearDoor=(x,y)=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>doorSet.has((x+a)+','+(y+b)))||(Math.abs(x-exit.x)<=1&&Math.abs(y-exit.y)<=2);
 const spot=(r,edge=false)=>{for(let t=0;t<60;t++){const x=edge?(R()<.5?r.x:r.x+r.w-1):ri(r.x,r.x+r.w-1),y=edge&&R()<.5?(R()<.5?r.y:r.y+r.h-1):ri(r.y,r.y+r.h-1);const k=x+','+y;if(!used.has(k)&&!nearDoor(x,y)&&at(x,y)===FLOOR){used.add(k);return {x,y};}}return null;};
 const targetCount=level<=3?1:Math.min(3,1+Math.floor(prog*2.5)+(R()<.3?1:0));
 const loot=[];const vaultRoom=f.vault?sorted[0]:null;let vault=null;
 if(vaultRoom){const p=spot(vaultRoom,true)||spot(vaultRoom);if(p)vault={x:p.x,y:p.y,progress:0,open:false,time:4};}
 const targetRooms=sorted.filter(r=>r!==startRoom);for(let i=0;i<targetCount-(vault?1:0);i++){const r=targetRooms[Math.min(targetRooms.length-1,i+(vault?1:0))]||sorted[0];const p=spot(r,true)||spot(r);if(p)loot.push({...p,kind:['painting','statue','gem'][ri(0,2)],value:500+level*20,required:true,taken:false});}
 const extra=3+Math.floor(prog*6);for(let i=0;i<extra;i++){const r=rooms[ri(0,rooms.length-1)];const p=spot(r);if(p)loot.push({...p,kind:['cash','watch','ring','cash'][ri(0,3)],value:ri(4,12)*10+level*2,required:false,taken:false});}
 // Locks: lock doors on the path from the start to the deepest room, keys stay on the reachable side.
 const keys=[];
 if(f.locks){const deep=vaultRoom||sorted[0];let path=[],r=deep;while(r&&r!==startRoom){const d=base.via.get(r);if(!d)break;path.unshift(d);r=d.a===r?d.b:d.a;}
  const colors=[RED,BLUE].slice(0,f.locks),locked=new Set();
  colors.forEach((col,i)=>{const d=path[Math.min(path.length-1,Math.floor(path.length*(i?.85:.4)))];if(!d||locked.has(d))return;locked.add(d);set(d.x,d.y,col);d.lock=col;const side=reach(startRoom,new Set([...locked].filter(x=>x===d||col===RED)));const options=rooms.filter(rm=>side.dist.has(rm)&&rm!==startRoom);const kr=options.length?options[ri(0,options.length-1)]:startRoom;let p=spot(kr);for(const alt of options){if(p)break;p=spot(alt);}if(p)keys.push({...p,color:col,taken:false});else{set(d.x,d.y,DOOR);d.lock=0;locked.delete(d);}});}
 // Cameras in deeper rooms.
 const cameras=[];if(f.cameras){const n=Math.min(rooms.length-1,1+Math.floor(prog*5));for(const r of sorted.filter(r=>r!==startRoom).slice(0,n)){const cx=R()<.5?r.x:r.x+r.w-1,cy=R()<.5?r.y:r.y+r.h-1;const base=Math.atan2(r.cy-cy,r.cx-cx);cameras.push({x:(cx+.5)*T+(cx===r.x?-11:11),y:(cy+.5)*T+(cy===r.y?-11:11),base,sweep:.7,phase:R()*6,speed:.5+R()*.4,sus:0,off:0});}}
 const lasers=[];if(f.lasers){for(const d of doors){if(d.lock||!d.a||!d.b||d.a===startRoom||d.b===startRoom)continue;if(R()<.45+prog*.3)lasers.push({x:d.x,y:d.y,v:d.v,period:2.6+R()*1.6,on:.55+R()*.15,phase:R()*5,off:0});}}
 const hides=[];if(f.dark){for(const r of rooms)if(r!==startRoom&&R()<.5){const p=spot(r,true);if(p)hides.push(p);}}
 const dark=new Set();if(f.dark)for(const r of rooms)if(r!==startRoom&&R()<.4)dark.add(r.id);
 const creaks=new Set();if(f.creaks)for(const r of rooms)if(r!==startRoom&&R()<.6)for(let i=0;i<Math.floor(r.w*r.h*.25);i++){const x=ri(r.x,r.x+r.w-1),y=ri(r.y,r.y+r.h-1);creaks.add(x+','+y);}
 let terminal=null;if(f.terminal){const r=rooms.filter(x=>x!==startRoom&&x!==vaultRoom)[0]||startRoom;const p=spot(r,true);if(p)terminal={...p,progress:0};}
 // Guards and dogs.
 const gc=Math.min(7,1+Math.floor(prog*5)+(level>100?Math.floor((level-100)/8):0)),guards=[];
 const candidates=rooms.filter(r=>r!==startRoom);
 for(let i=0;i<gc&&candidates.length;i++){
  const n=Math.min(candidates.length,ri(2,4)),route=[];const pool=candidates.slice();for(let k=0;k<n;k++){const r=pool.splice(ri(0,pool.length-1),1)[0];route.push({x:ri(r.x,r.x+r.w-1),y:ri(r.y,r.y+r.h-1)});}
  if(route.length===1){const r=candidates[ri(0,candidates.length-1)];route.push({x:r.cx,y:r.cy});}
  const dog=f.dogs&&i>0&&R()<.4;guards.push({kind:dog?'dog':'guard',route});
 }
 const rooms2=rooms.map(r=>({id:r.id,x:r.x,y:r.y,w:r.w,h:r.h,dark:dark.has(r.id)}));
 return {level,chapter:ch,grid:g,rooms:rooms2,exit,start,loot,keys,vault,cameras,lasers,hides,creaks,terminal,guards,features:f,par:30+rooms.length*9+gc*4};
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),angDiff=(a,b)=>{let d=b-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;};
export class Heist{
 constructor(level=1,gear={}){
  this.level=level;this.gear=gear;const m=generate(level);Object.assign(this,m);this.grid=new Uint8Array(m.grid);this.map=m;
  this.p={x:m.start.x,y:m.start.y,face:-Math.PI/2,sneak:false,hidden:null,moving:false,step:0};
  this.time=0;this.alarm=0;this.alarmed=false;this.police=0;this.status='play';this.spotted=false;this.message=CHAPTERS[this.chapter].intro;this.messageTime=6;
  this.haveKeys=new Set();this.smokes=[];this.decoys=[];this.noises=[];this.events=[];this.loopTime=0;this.empTime=0;this.emps=[];
  this.charges={smoke:gear.smoke||0,decoy:gear.decoy||0,emp:gear.emp||0};this.score=0;this.stolen=0;
  const R=rng(level*13+5);
  this.guards=m.guards.map((g,i)=>{const path=[];for(let k=0;k<g.route.length;k++){const a=g.route[k],b=g.route[(k+1)%g.route.length];path.push(...this.path(a.x,a.y,b.x,b.y,true));}let best=0,bd=-1;path.forEach((t,k)=>{const dd=Math.hypot(t.x*T-m.start.x,t.y*T-m.start.y);if(dd>bd){bd=dd;best=k;}});const s=path[best]||g.route[0];return {id:i,kind:g.kind,x:(s.x+.5)*T,y:(s.y+.5)*T,face:R()*6,route:path.length?path:[s],idx:path.length?(best+1)%path.length:0,state:'patrol',sus:0,wait:R()*2,look:0,target:null,lost:0,repath:0,trail:[],stepT:0};});
 }
 at(x,y){return x<0||y<0||x>=GW||y>=GH?OUT:this.grid[y*GW+x];}
 solidFor(x,y,who){const v=this.at(x,y);if(v===WALL||v===OUT)return true;if(who==='player'&&(v===RED||v===BLUE))return !this.haveKeys.has(v);return false;}
 blocksSight(x,y){const v=this.at(x,y);return v===WALL||v===RED||v===BLUE;}
 path(sx,sy,tx,ty,guard=true){
  if(sx===tx&&sy===ty)return [{x:tx,y:ty}];const prev=new Int32Array(GW*GH).fill(-1),q=[sy*GW+sx];prev[q[0]]=q[0];
  for(let i=0;i<q.length;i++){const c=q[i],x=c%GW,y=(c/GW)|0;if(x===tx&&y===ty)break;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*GW+nx;if(nx<0||ny<0||nx>=GW||ny>=GH||prev[n]>=0)continue;const v=this.at(nx,ny);if(v===WALL||v===OUT||v===EXIT)continue;prev[n]=c;q.push(n);}}
  const end=ty*GW+tx;if(prev[end]<0)return [];const out=[];for(let c=end;c!==sy*GW+sx;c=prev[c])out.unshift({x:c%GW,y:(c/GW)|0});return out;
 }
 roomAt(px,py){const x=Math.floor(px/T),y=Math.floor(py/T);return this.rooms.find(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h);}
 isDark(px,py){return !!this.roomAt(px,py)?.dark;}
 los(ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.ceil(d/6);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(this.blocksSight(Math.floor(x/T),Math.floor(y/T)))return false;for(const s of this.smokes)if(Math.hypot(x-s.x,y-s.y)<s.r)return false;}return true;}
 ray(ax,ay,ang,range){const dx=Math.cos(ang),dy=Math.sin(ang);for(let d=4;d<range;d+=5){const x=ax+dx*d,y=ay+dy*d;if(this.blocksSight(Math.floor(x/T),Math.floor(y/T)))return d;for(const s of this.smokes)if(Math.hypot(x-s.x,y-s.y)<s.r)return d;}return range;}
 noise(x,y,r,kind){this.noises.push({x,y,r,t:0,kind});for(const g of this.guards){if(g.state==='chase')continue;const d=Math.hypot(g.x-x,g.y-y);if(d<r){g.state='investigate';g.target={x,y};g.repath=0;g.sus=Math.max(g.sus,.35);g.wait=0;}}}
 say(m,t=3){this.message=m;this.messageTime=t;}
 camOn(cam){return cam.off<=0&&this.loopTime<=0;}
 laserOn(l){if(l.off>0||this.loopTime>0)return false;return ((this.time+l.phase)%l.period)/l.period<l.on;}
 interactables(){const p=this.p,out=[];const near=(o,r=26)=>Math.hypot((o.x+.5)*T-p.x,(o.y+.5)*T-p.y)<r+T*.5;
  if(this.vault&&!this.vault.open&&near(this.vault))out.push({kind:'vault'});if(this.terminal&&this.loopTime<=0&&near(this.terminal))out.push({kind:'terminal'});
  for(const h of this.hides)if(near(h,16))out.push({kind:'hide',h});return out;}
 step(dt,input={}){
  if(this.status!=='play')return;dt=Math.min(dt,.05);this.time+=dt;if(this.messageTime>0)this.messageTime-=dt;
  const p=this.p,sneak=!!input.sneak;p.sneak=sneak;
  // gadgets
  if(input.smoke&&this.charges.smoke>0){this.charges.smoke--;this.smokes.push({x:p.x,y:p.y,r:10,max:78,t:0,life:7});this.events.push('smoke');}
  if(input.decoy&&this.charges.decoy>0){this.charges.decoy--;let d=this.ray(p.x,p.y,p.face,170)-10;const x=p.x+Math.cos(p.face)*d,y=p.y+Math.sin(p.face)*d;this.decoys.push({x,y,t:0,life:4});this.events.push('decoy');}
  if(input.emp&&this.charges.emp>0){this.charges.emp--;this.emps.push({x:p.x,y:p.y,t:0});for(const c of this.cameras)if(Math.hypot(c.x-p.x,c.y-p.y)<200){c.off=8;c.sus=0;}for(const l of this.lasers)if(Math.hypot((l.x+.5)*T-p.x,(l.y+.5)*T-p.y)<200)l.off=8;this.events.push('emp');}
  // interaction
  const inter=this.interactables();
  if(input.interactPressed){const h=inter.find(i=>i.kind==='hide');if(p.hidden){p.hidden=null;this.events.push('unhide');}else if(h){p.hidden=h.h;p.x=(h.h.x+.5)*T;p.y=(h.h.y+.5)*T;this.events.push('hide');}}
  let working=false;
  if(input.interact&&!p.hidden){const quick=1+.35*(this.gear.hands||0);
   const v=inter.find(i=>i.kind==='vault');if(v){working=true;this.vault.progress+=dt*quick;if(Math.floor(this.vault.progress*1.5)!==Math.floor((this.vault.progress-dt*quick)*1.5)){this.noise((this.vault.x+.5)*T,(this.vault.y+.5)*T,150,'drill');this.events.push('drill');}if(this.vault.progress>=this.vault.time){this.vault.open=true;this.loot.push({x:this.vault.x,y:this.vault.y,kind:'diamond',value:1200+this.level*30,required:true,taken:false});this.events.push('vault');this.say('Vault open! Grab the diamond.');}}
   const t=inter.find(i=>i.kind==='terminal');if(t){working=true;this.terminal.progress+=dt*quick;if(this.terminal.progress>=1.6){this.loopTime=25;this.terminal.progress=0;this.events.push('hack');this.say('Cameras and lasers looped for 25 seconds.');for(const c of this.cameras)c.sus=0;}}
  }else if(this.terminal)this.terminal.progress=Math.max(0,this.terminal.progress-dt);
  this.working=working;
  // movement
  let mx=input.x||0,my=input.y||0;const len=Math.hypot(mx,my);p.moving=false;
  if(len>0&&!working){if(p.hidden){p.hidden=null;this.events.push('unhide');}mx/=len;my/=len;p.face=Math.atan2(my,mx);const sp=(sneak?62:125)*dt;this.move(p,mx*sp,my*sp);p.moving=true;
   p.step+=sp;const stride=sneak?40:26;if(p.step>stride){p.step=0;const tile=Math.floor(p.x/T)+','+Math.floor(p.y/T),creak=this.creaks.has(tile);const shoes=1-.3*(this.gear.shoes||0);
    if(creak){const r=(sneak?0:150)*shoes;if(r>0){this.noise(p.x,p.y,r,'creak');this.events.push('creak');}}else if(!sneak){this.noise(p.x,p.y,60*shoes,'step');}this.events.push(sneak?'softstep':'step');}}
  // pickups
  for(const l of this.loot)if(!l.taken&&Math.hypot((l.x+.5)*T-p.x,(l.y+.5)*T-p.y)<20){l.taken=true;this.stolen+=l.value;this.events.push(l.required?'target':'loot');if(l.required){const left=this.loot.filter(o=>o.required&&!o.taken).length+(this.vault&&!this.vault.open?1:0);this.say(left?left+' target'+(left>1?'s':'')+' left.':'All targets secured. Get to the van!');}}
  for(const k of this.keys)if(!k.taken&&Math.hypot((k.x+.5)*T-p.x,(k.y+.5)*T-p.y)<20){k.taken=true;this.haveKeys.add(k.color);this.events.push('key');this.say((k.color===RED?'Red':'Blue')+' keycard. Matching doors now open for you.');}
  // lasers
  for(const l of this.lasers){if(l.off>0)l.off-=dt;if(this.laserOn(l)){const cx=(l.x+.5)*T,cy=(l.y+.5)*T;if(Math.abs(p.x-cx)<(l.v?6:T*.5)&&Math.abs(p.y-cy)<(l.v?T*.5:6)){this.trigger('laser');}}}
  // exit
  const tx=Math.floor(p.x/T),ty=Math.floor((p.y+8)/T);if(tx===this.exit.x&&ty===this.exit.y){if(this.targetsLeft()===0)return this.win();if(this.messageTime<=0)this.say('You still need the target'+(this.targetsLeft()>1?'s':'')+'.');}
  // timers
  if(this.loopTime>0)this.loopTime-=dt;
  for(const s of this.smokes){s.t+=dt;s.r=Math.min(s.max,s.r+dt*120);if(s.t>s.life-1.5)s.r*=1-dt*1.2;}this.smokes=this.smokes.filter(s=>s.t<s.life);
  for(const d of this.decoys){d.t+=dt;if(Math.floor(d.t*2)!==Math.floor((d.t-dt)*2))this.noise(d.x,d.y,220,'decoy');}this.decoys=this.decoys.filter(d=>d.t<d.life);
  for(const n of this.noises)n.t+=dt;this.noises=this.noises.filter(n=>n.t<.8);for(const e of this.emps)e.t+=dt;this.emps=this.emps.filter(e=>e.t<.8);
  this.stepCameras(dt);this.stepGuards(dt);
  if(this.alarmed){this.police-=dt;if(this.police<=0)return this.lose('The police arrived. The job is blown.');}
  else this.alarm=Math.max(0,this.alarm-dt*.04);
 }
 targetsLeft(){return this.loot.filter(o=>o.required&&!o.taken).length+(this.vault&&!this.vault.open?1:0);}
 move(o,dx,dy){const r=9;const tryAxis=(nx,ny)=>{for(const [ox,oy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){if(this.solidFor(Math.floor((nx+ox)/T),Math.floor((ny+oy)/T),'player'))return false;}return true;};
  if(tryAxis(o.x+dx,o.y))o.x+=dx;if(tryAxis(o.x,o.y+dy))o.y+=dy;
  for(const c of [RED,BLUE])if(this.haveKeys.has(c)){const x=Math.floor(o.x/T),y=Math.floor(o.y/T);for(const [a,b] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]])if(this.at(x+a,y+b)===c&&Math.hypot((x+a+.5)*T-o.x,(y+b+.5)*T-o.y)<T){this.grid[(y+b)*GW+x+a]=DOOR;this.events.push('door');}}}
 visibility(px,py,range,fov,face,ox,oy){
  const p=this.p;if(p.hidden)return 0;const d=Math.hypot(p.x-ox,p.y-oy);let rng=range;if(this.isDark(p.x,p.y))rng*=.55;if(d>rng)return 0;
  if(Math.abs(angDiff(face,Math.atan2(p.y-oy,p.x-ox)))>fov/2)return 0;if(!this.los(ox,oy,p.x,p.y))return 0;
  const suit=1-.2*(this.gear.suit||0);return (1.3-d/rng)*(p.sneak?.65:1)*(p.moving?1:.7)*suit;
 }
 stepCameras(dt){for(const c of this.cameras){if(c.off>0)c.off-=dt;c.ang=c.base+Math.sin(this.time*c.speed+c.phase)*c.sweep;if(!this.camOn(c)){c.sus=Math.max(0,c.sus-dt);continue;}const v=this.visibility(0,0,190,.9,c.ang,c.x,c.y);if(v>0){c.sus+=v*dt*1.1;if(c.sus>=1){c.sus=1;this.trigger('camera');}}else c.sus=Math.max(0,c.sus-dt*.5);}}
 trigger(src){if(!this.alarmed){this.alarmed=true;this.police=28;this.alarm=1;this.spotted=true;this.events.push('alarm');this.say(src==='laser'?'You tripped a laser! Police in 28 seconds — get out!':'Alarm! Police in 28 seconds — get out!');}for(const g of this.guards){if(g.state!=='chase'){g.state='investigate';g.target={x:this.p.x,y:this.p.y};g.repath=0;}}}
 stepGuards(dt){
  const p=this.p;
  for(const g of this.guards){
   const dog=g.kind==='dog',range=dog?125:170,fov=dog?2:1.25;
   let v=this.visibility(0,0,range,fov,g.face,g.x,g.y);
   if(dog&&!p.hidden&&!p.sneak&&Math.hypot(p.x-g.x,p.y-g.y)<70)v=Math.max(v,.8);
   if(v>0){g.sus+=v*dt*(g.state==='patrol'?1.15:1.8);g.lastSeen={x:p.x,y:p.y};if(g.sus>.35&&g.state==='patrol'){g.state='investigate';g.target={x:p.x,y:p.y};g.repath=0;g.wait=.6;this.events.push('huh');}if(g.sus>=1&&g.state!=='chase'){g.state='chase';g.lost=0;this.spotted=true;this.events.push('spotted');this.trigger('guard');}}
   else if(g.state!=='chase')g.sus=Math.max(0,g.sus-dt*.22);
   const speed=(g.state==='chase'?(dog?165:132):g.state==='investigate'?(dog?115:88):(dog?85:62))*dt;
   if(g.state==='chase'){
    if(v>0||Math.hypot(p.x-g.x,p.y-g.y)<40){g.lost=0;g.target={x:p.x,y:p.y};}else g.lost+=dt;
    if(g.lost>5){g.state='investigate';g.sus=.6;g.wait=2;}
    g.repath-=dt;if(g.repath<=0||!g.trail.length){g.repath=.35;g.trail=this.path(Math.floor(g.x/T),Math.floor(g.y/T),Math.floor(g.target.x/T),Math.floor(g.target.y/T));}
    this.follow(g,speed);
    if(!p.hidden&&Math.hypot(p.x-g.x,p.y-g.y)<20)return this.lose(dog?'A guard dog pinned you down.':'A guard caught you.');
    if(p.hidden&&Math.hypot(p.x-g.x,p.y-g.y)<20&&g.lost<1)return this.lose('A guard pulled you out of the locker.');
   }else if(g.state==='investigate'){
    if(g.wait>0){g.wait-=dt;g.face+=angDiff(g.face,Math.atan2(g.target.y-g.y,g.target.x-g.x))*Math.min(1,dt*4);continue;}
    if(!g.trail.length||g.repath<=0){g.repath=99;g.trail=this.path(Math.floor(g.x/T),Math.floor(g.y/T),Math.floor(g.target.x/T),Math.floor(g.target.y/T));if(!g.trail.length)g.trail=[{x:Math.floor(g.x/T),y:Math.floor(g.y/T)}];}
    if(this.follow(g,speed)){g.look+=dt;g.face+=dt*2.2*Math.sin(g.look*1.5);if(g.look>3){g.look=0;g.state='return';g.sus=Math.min(g.sus,.3);const r=g.route[g.idx];g.trail=this.path(Math.floor(g.x/T),Math.floor(g.y/T),r.x,r.y);}}
   }else if(g.state==='return'){if(this.follow(g,speed)||!g.trail.length){g.state='patrol';}}
   else{
    if(g.wait>0){g.wait-=dt;g.face+=Math.sin(this.time*1.3+g.id)*dt*1.2;continue;}
    const n=g.route[g.idx];const tx=(n.x+.5)*T,ty=(n.y+.5)*T,dx=tx-g.x,dy=ty-g.y,d=Math.hypot(dx,dy);
    if(d<=speed){g.x=tx;g.y=ty;g.idx=(g.idx+1)%g.route.length;const nn=g.route[g.idx];if(Math.abs(nn.x-n.x)+Math.abs(nn.y-n.y)>1){g.trail=this.path(n.x,n.y,nn.x,nn.y);g.state='return';}if(Math.random()<.035)g.wait=.8+Math.random()*1.2;}
    else{g.x+=dx/d*speed;g.y+=dy/d*speed;g.face+=angDiff(g.face,Math.atan2(dy,dx))*Math.min(1,dt*6);}
   }
  }
 }
 follow(g,speed){if(!g.trail.length)return true;const n=g.trail[0],tx=(n.x+.5)*T,ty=(n.y+.5)*T,dx=tx-g.x,dy=ty-g.y,d=Math.hypot(dx,dy);if(d<=speed){g.x=tx;g.y=ty;g.trail.shift();return !g.trail.length;}g.x+=dx/d*speed;g.y+=dy/d*speed;g.face+=angDiff(g.face,Math.atan2(dy,dx))*Math.min(1,speed*.12);return false;}
 win(){
  this.status='win';const all=this.loot.every(l=>l.taken);const ghost=!this.spotted;const time=Math.max(0,this.par-this.time);
  this.stars=1+(ghost?1:0)+(all?1:0);this.ghost=ghost;this.allLoot=all;
  this.score=Math.round(this.stolen+time*10+(ghost?500:0)+(all?250:0));this.events.push('win');
 }
 lose(why){this.status='lose';this.message=why;this.score=0;this.events.push('caught');}
}
