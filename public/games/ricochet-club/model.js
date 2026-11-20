// Ricochet Club 2.0 — deterministic ball physics and solvable generated tables.
export const W=1000,H=600,R=9,STEP=1/240,MAX_SPEED=950,BORDER=34;
export const CLUBS=[
 {name:'The Felt Room',felt:'#1f5a4a',intro:'Bank the marble off the rails. Collect every star before your shots run out.'},
 {name:'Bumper Bar',felt:'#5a2f4a',intro:'Chrome bumpers kick the marble back harder than it hit them.'},
 {name:'Glass House',felt:'#24476a',intro:'Glass blocks shatter after a hit or two. Break a path open.'},
 {name:'Portal Parlor',felt:'#3d2f6a',intro:'Roll into one portal and out of its twin, same speed, same direction.'},
 {name:'Switchback',felt:'#5a4a24',intro:'Hit a brass switch to swap which gates are closed.'},
 {name:'Sand Trap',felt:'#5e5233',intro:'Sand slows the marble to a crawl. Boost pads fling it forward.'},
 {name:'Gravity Lounge',felt:'#1d3550',intro:'Gravity wells bend the marble’s path. Aim for the curve.'},
 {name:'The Pit',felt:'#3a2424',intro:'Pockets swallow the marble and cost you the shot. Everything at once.'}
];
export const TABLES_PER_CLUB=10,CAMPAIGN=CLUBS.length*TABLES_PER_CLUB;
export function rng(seed){let s=(seed>>>0)||7;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export const clubOf=n=>n>CAMPAIGN?CLUBS.length-1:Math.floor((n-1)/TABLES_PER_CLUB);
export function featuresFor(n){const c=clubOf(n),e=n>CAMPAIGN,r=rng(n*97);const any=p=>e&&r()<p;return {bumpers:c>=1||any(.8),glass:c>=2||any(.6),portals:c>=3||any(.5),gates:c>=4||any(.4),sand:c>=5||any(.5),wells:c>=6||any(.5),holes:c>=7||any(.6)};}

const segHit=(px,py,s)=>{const dx=s.bx-s.ax,dy=s.by-s.ay,l=dx*dx+dy*dy||1;let t=((px-s.ax)*dx+(py-s.ay)*dy)/l;t=Math.max(0,Math.min(1,t));const cx=s.ax+dx*t,cy=s.ay+dy*t;return {cx,cy,d:Math.hypot(px-cx,py-cy)};};
export function rectSegs(x,y,w,h,extra={}){return [{ax:x,ay:y,bx:x+w,by:y,...extra},{ax:x+w,ay:y,bx:x+w,by:y+h,...extra},{ax:x+w,ay:y+h,bx:x,by:y+h,...extra},{ax:x,ay:y+h,bx:x,by:y,...extra}];}

// The table state that physics can change (glass, gates) lives in Table so generation and play share the code.
export class Table{
 constructor(def){this.def=def;this.reset();}
 reset(){const d=this.def;this.walls=d.walls.map(s=>({...s}));this.blocks=d.blocks.map(b=>({...b,segs:rectSegs(b.x,b.y,b.w,b.h)}));this.bumpers=d.bumpers.map(b=>({...b,flash:0}));this.gates=d.gates.map(g=>({...g}));this.switches=d.switches.map(s=>({...s,touching:false,flash:0}));this.portals=d.portals;this.sands=d.sands;this.boosts=d.boosts;this.wells=d.wells;this.holes=d.holes;this.gateFlip=false;}
 snapshot(){return {blocks:this.blocks.map(b=>b.hp),flip:this.gateFlip,touch:this.switches.map(s=>s.touching)};}
 restore(s){this.blocks.forEach((b,i)=>b.hp=s.blocks[i]);this.gateFlip=s.flip;if(s.touch)this.switches.forEach((x,i)=>x.touching=s.touch[i]);}
 gateClosed(g){return g.closed!==this.gateFlip;}
}
// Simulate one substep. Returns events. ball:{x,y,vx,vy,portalLock}
export function physicsStep(t,ball,events){
 const dt=STEP;
 // fields
 for(const w of t.wells){const dx=w.x-ball.x,dy=w.y-ball.y,d=Math.max(30,Math.hypot(dx,dy));if(d<w.reach){const f=w.power*90000/(d*d);ball.vx+=dx/d*f*dt;ball.vy+=dy/d*f*dt;}}
 let fr=.5;for(const s of t.sands)if(ball.x>s.x&&ball.x<s.x+s.w&&ball.y>s.y&&ball.y<s.y+s.h)fr=3.4;
 for(const b of t.boosts)if(ball.x>b.x&&ball.x<b.x+b.w&&ball.y>b.y&&ball.y<b.y+b.h){ball.vx+=Math.cos(b.dir)*1500*dt;ball.vy+=Math.sin(b.dir)*1500*dt;}
 let sp=Math.hypot(ball.vx,ball.vy);if(sp>MAX_SPEED){ball.vx*=MAX_SPEED/sp;ball.vy*=MAX_SPEED/sp;sp=MAX_SPEED;}
 const decel=Math.max(0,1-fr*dt)*(sp>0?Math.max(0,sp-16*dt)/sp:0);ball.vx*=decel;ball.vy*=decel;
 ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 const bounce=(nx,ny,cx,cy,rest,kind,ref)=>{const vn=ball.vx*nx+ball.vy*ny;if(vn>=0)return false;ball.x=cx+nx*(R+.01);ball.y=cy+ny*(R+.01);ball.vx-=(1+rest)*vn*nx;ball.vy-=(1+rest)*vn*ny;events.push({kind,ref,speed:-vn});ball.bounces=(ball.bounces||0)+1;return true;};
 const segs=[...t.walls.map(s=>[s,'wall']),...t.gates.filter(g=>t.gateClosed(g)).map(g=>[g,'gate'])];
 for(const b of t.blocks)if(b.hp>0)for(const s of b.segs)segs.push([s,'glass',b]);
 for(const [s,kind,ref] of segs){const h=segHit(ball.x,ball.y,s);if(h.d<R){const nx=(ball.x-h.cx)/(h.d||1),ny=(ball.y-h.cy)/(h.d||1);if(bounce(nx,ny,h.cx,h.cy,.9,kind,ref)&&kind==='glass'){ref.hp--;if(ref.hp<=0)events.push({kind:'shatter',ref});}}}
 for(const b of t.bumpers){const dx=ball.x-b.x,dy=ball.y-b.y,d=Math.hypot(dx,dy);if(d<R+b.r){const nx=dx/d,ny=dy/d;if(bounce(nx,ny,b.x+nx*b.r,b.y+ny*b.r,1,'bumper',b)){ball.vx+=nx*160;ball.vy+=ny*160;b.flash=1;}}}
 for(const s of t.switches){const d=Math.hypot(ball.x-s.x,ball.y-s.y),touch=d<R+12;if(touch&&!s.touching){t.gateFlip=!t.gateFlip;s.flash=1;events.push({kind:'switch',ref:s});}s.touching=touch;}
 for(const p of t.portals){for(const [a,b] of [[p.a,p.b],[p.b,p.a]]){const d=Math.hypot(ball.x-a.x,ball.y-a.y);if(d<16&&ball.portalLock!==a){const s=Math.hypot(ball.vx,ball.vy)||1;ball.x=b.x+ball.vx/s*2;ball.y=b.y+ball.vy/s*2;ball.portalLock=b;events.push({kind:'portal',ref:p});return;}if(ball.portalLock===a&&d>22)ball.portalLock=null;}}
 for(const h of t.holes)if(Math.hypot(ball.x-h.x,ball.y-h.y)<h.r-3){events.push({kind:'hole',ref:h});ball.sunk=true;return;}
}
export const resting=b=>Math.hypot(b.vx,b.vy)<9;
export function simulate(t,ball,maxTime=14,onStep){const events=[];let time=0;while(time<maxTime&&!ball.sunk){physicsStep(t,ball,events);time+=STEP;if(onStep)onStep(ball,time,events);if(resting(ball))break;}ball.vx=ball.vy=0;return {events,time};}

// ---------- generation ----------
export function generate(n){
 for(let attempt=0;attempt<40;attempt++){const def=tryGenerate(n,attempt);if(def)return def;}
 return tryGenerate(n,99,true);
}
function tryGenerate(n,attempt,easy=false){
 const r=rng(n*1013+attempt*7919),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),f=easy?{}:featuresFor(n),club=clubOf(n),k=n>CAMPAIGN?1:((n-1)%TABLES_PER_CLUB)/9,depth=n>CAMPAIGN?Math.min(1,(n-CAMPAIGN)/40):0;
 const L=BORDER,T=BORDER,Rt=W-BORDER,B=H-BORDER;
 const walls=rectSegs(L,T,Rt-L,B-T);const occupied=[];
 const free=(x,y,rad)=>x-rad>L&&x+rad<Rt&&y-rad>T&&y+rad<B&&occupied.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+rad);
 const claim=(x,y,rad)=>occupied.push({x,y,r:rad});
 const start={x:ri(L+60,L+160),y:ri(T+80,B-80)};if(r()<.5)start.x=W-start.x;claim(start.x,start.y,60);
 const blocks=[],bumpers=[],gates=[],switches=[],portals=[],sands=[],boosts=[],wells=[],holes=[];
 const place=(rad,fn,tries=40)=>{for(let i=0;i<tries;i++){const x=ri(L+rad+10,Rt-rad-10),y=ri(T+rad+10,B-rad-10);if(free(x,y,rad)){claim(x,y,rad);fn(x,y);return true;}}return false;};
 // solid blocks and angled rails
 const solids=2+Math.round(k*2)+(club>=4?1:0)+Math.round(depth*2);
 for(let i=0;i<solids;i++){const w=ri(30,140),h=ri(24,110);place(Math.max(w,h)/2+12,(x,y)=>{if(r()<.35){const a=r()*Math.PI,len=ri(90,180);walls.push({ax:x-Math.cos(a)*len/2,ay:y-Math.sin(a)*len/2,bx:x+Math.cos(a)*len/2,by:y+Math.sin(a)*len/2});}else walls.push(...rectSegs(x-w/2,y-h/2,w,h));});}
 if(f.bumpers)for(let i=0;i<2+Math.round(k*3);i++)place(34,(x,y)=>bumpers.push({x,y,r:ri(16,24)}));
 if(f.glass)for(let i=0;i<2+Math.round(k*3);i++){const w=ri(16,26),h=ri(60,120),vert=r()<.5;place(Math.max(w,h)/2+10,(x,y)=>blocks.push(vert?{x:x-w/2,y:y-h/2,w,h,hp:ri(1,2)}:{x:x-h/2,y:y-w/2,w:h,h:w,hp:ri(1,2)}));}
 if(f.portals)for(let i=0;i<(k>.6?2:1);i++){let a=null;place(30,(x,y)=>a={x,y});let b=null;if(a)place(30,(x,y)=>b={x,y});if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)>220)portals.push({a,b,hue:i?40:280});}
 if(f.gates)for(let i=0;i<1+Math.round(k);i++){const len=ri(90,150),vert=r()<.5;let ok=place(len/2+8,(x,y)=>gates.push(vert?{ax:x,ay:y-len/2,bx:x,by:y+len/2,closed:r()<.5}:{ax:x-len/2,ay:y,bx:x+len/2,by:y,closed:r()<.5}));if(ok)place(28,(x,y)=>switches.push({x,y}));}
 if(f.sand)for(let i=0;i<1+Math.round(k*2);i++){const w=ri(90,170),h=ri(70,130);place(Math.max(w,h)/2,(x,y)=>sands.push({x:x-w/2,y:y-h/2,w,h}));}
 if(f.sand)for(let i=0;i<1+Math.round(k);i++)place(30,(x,y)=>boosts.push({x:x-22,y:y-22,w:44,h:44,dir:Math.floor(r()*8)*Math.PI/4}));
 if(f.wells)for(let i=0;i<1+Math.round(k*1.5);i++)place(60,(x,y)=>wells.push({x,y,reach:ri(150,230),power:(r()<.25?-1:1)*(.8+r()*.6)}));
 if(f.holes)for(let i=0;i<1+Math.round(k*2+depth*2);i++)place(32,(x,y)=>holes.push({x,y,r:ri(16,21)}));
 const def={n,club,start,walls,blocks,bumpers,gates,switches,portals,sands,boosts,wells,holes,stars:[],par:0,budget:0};
 // Build a solution: random shots whose real paths carry the stars.
 const t=new Table(def),shotsWanted=Math.min(5,1+Math.floor(k*2.4)+(club>=3?1:0)+(n>CAMPAIGN?Math.floor(depth*2):0)),starTarget=Math.min(9,2+Math.floor(k*3)+club/2+Math.floor(depth*3));
 let pos={...start},stars=[],solution=[];
 for(let s=0;s<shotsWanted;s++){
  let best=null;
  for(let tries=0;tries<30;tries++){
   const snap=t.snapshot(),ang=r()*Math.PI*2,pow=.55+r()*.45,ball={x:pos.x,y:pos.y,vx:Math.cos(ang)*MAX_SPEED*pow,vy:Math.sin(ang)*MAX_SPEED*pow,bounces:0};const path=[];
   simulate(t,ball,14,(b,time)=>{if(Math.floor(time/STEP)%6===0)path.push({x:b.x,y:b.y,b:b.bounces||0,sp:Math.hypot(b.vx,b.vy)});});
   const end={x:ball.x,y:ball.y};
   const ok=!ball.sunk&&path.length>40&&(ball.bounces||0)>=(club>0||k>.3?1:0)&&Math.hypot(end.x-pos.x,end.y-pos.y)>80;
   if(ok){const after=path.filter(p=>p.b>=(club>0||k>.3?1:0)&&p.sp>120&&Math.hypot(p.x-pos.x,p.y-pos.y)>70);const score=after.length+(ball.bounces||0)*20+r()*30;if(after.length&&(!best||score>best.score)){best={score,ang,pow,snapEnd:t.snapshot(),end,after};}}
   t.restore(snap);
  }
  if(!best)return null;
  // replay the chosen shot to leave the table in the right state
  {const ball={x:pos.x,y:pos.y,vx:Math.cos(best.ang)*MAX_SPEED*best.pow,vy:Math.sin(best.ang)*MAX_SPEED*best.pow};simulate(t,ball);}
  const per=Math.max(1,Math.round((starTarget-stars.length)/(shotsWanted-s)));
  for(let i=0;i<per*6&&stars.filter(x=>x.shot===s).length<per;i++){const p=best.after[Math.floor(best.after.length*(.35+.65*r()))%best.after.length];if(stars.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>70)&&Math.hypot(p.x-start.x,p.y-start.y)>60)stars.push({x:p.x,y:p.y,shot:s});}
  solution.push({ang:best.ang,pow:best.pow});pos=best.end;
 }
 if(stars.length<2)return null;
 def.stars=stars.map(({x,y})=>({x:Math.round(x),y:Math.round(y)}));def.par=solution.length;def.budget=solution.length+(n<=3?3:2);def.solution=solution;
 return def;
}

export class Game{
 constructor(n){this.n=n;this.def=generate(n);this.table=new Table(this.def);this.club=this.def.club;this.reset();}
 reset(){this.table.reset();this.ball={x:this.def.start.x,y:this.def.start.y,vx:0,vy:0};this.stars=this.def.stars.map(s=>({...s,got:false,pop:0}));this.shots=0;this.moving=false;this.status='aim';this.events=[];this.lastRest={...this.ball};this.trail=[];this.acc=0;this.combo=0;}
 get budget(){return this.def.budget;}
 get left(){return this.stars.filter(s=>!s.got).length;}
 shoot(ang,pow){if(this.status!=='aim')return false;pow=Math.max(.08,Math.min(1,pow));this.ball.vx=Math.cos(ang)*MAX_SPEED*pow;this.ball.vy=Math.sin(ang)*MAX_SPEED*pow;this.ball.bounces=0;this.ball.portalLock=null;this.lastRest={x:this.ball.x,y:this.ball.y};this.shots++;this.status='rolling';this.combo=0;this.events.push({kind:'shoot',pow});return true;}
 preview(ang,pow,maxLen){const t=new Table(this.def);t.restore(this.table.snapshot());const b={x:this.ball.x,y:this.ball.y,vx:Math.cos(ang)*MAX_SPEED*pow,vy:Math.sin(ang)*MAX_SPEED*pow,portalLock:null};const pts=[{x:b.x,y:b.y}];let len=0,px=b.x,py=b.y;const ev=[];for(let i=0;i<4000&&len<maxLen;i++){physicsStep(t,b,ev);if(b.sunk)break;const jump=Math.hypot(b.x-px,b.y-py);if(jump>30)pts.push(null);len+=Math.min(jump,30);px=b.x;py=b.y;if(i%4===0)pts.push({x:b.x,y:b.y});if(resting(b))break;}return pts;}
 update(dt){
  if(this.status!=='rolling')return;this.acc+=Math.min(dt,.05);
  while(this.acc>=STEP){this.acc-=STEP;const ev=[];physicsStep(this.table,this.ball,ev);for(const e of ev)this.events.push(e);
   for(const s of this.stars)if(!s.got&&Math.hypot(s.x-this.ball.x,s.y-this.ball.y)<R+14){s.got=true;this.combo++;this.events.push({kind:'star',ref:s,combo:this.combo});}
   if(this.ball.sunk){this.ball={...this.lastRest,vx:0,vy:0};this.status='aim';this.events.push({kind:'sunk'});this.afterShot();return;}
   if(resting(this.ball)){this.ball.vx=this.ball.vy=0;this.status='aim';this.afterShot();return;}
  }
  this.trail.push({x:this.ball.x,y:this.ball.y});if(this.trail.length>24)this.trail.shift();
 }
 afterShot(){this.trail=[];if(!this.left){this.status='won';this.events.push({kind:'won'});}else if(this.shots>=this.budget){this.status='lost';this.events.push({kind:'lost'});}}
 get starsEarned(){return this.shots<=this.def.par?3:this.shots<=this.def.par+1?2:1;}
 get score(){if(this.status!=='won')return this.stars.filter(s=>s.got).length*100;return this.stars.length*100+(this.budget-this.shots)*150+300+(this.club*50);}
}
