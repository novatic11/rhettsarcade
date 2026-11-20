/* Neon Slip's obstacle choreography. Geometry is shared by rendering and hit detection. */
((root)=>{
'use strict';
const W=420,H=740,R=10;
const specs={
 debris:{label:'DEBRIS FIELD',hint:'PICK YOUR OWN PATH BETWEEN THE ROCKS',color:'#ffb275'},
 slalom:{label:'SLALOM',hint:'WEAVE RIGHT, THEN LEFT',color:'#c09bff'},
 rotor:{label:'ROTOR',hint:'GO AROUND THE SPINNING ARM',color:'#ff749f'},
 crossfire:{label:'CROSSFIRE',hint:'WATCH THE PROJECTILES CROSS YOUR PATH',color:'#ffdb78'},
 crusher:{label:'CRUSHING JAWS',hint:'FOLLOW THE OPENING · THE JAWS KEEP MOVING',color:'#ff986e'},
 mines:{label:'PROXIMITY MINES',hint:'MINES FLASH BEFORE THEY BURST · KEEP YOUR DISTANCE',color:'#ff7292'},
 comets:{label:'COMET RAIN',hint:'READ THE TRAILS · DODGE THE DIAGONAL DIVE',color:'#80d9ff'},
 rails:{label:'LIVE WIRES',hint:'SKIRT THE ELECTRIC CHEVRONS ON EITHER SIDE',color:'#a9f580'},
 wrecking:{label:'WRECKING BALLS',hint:'WATCH THE REBOUND · THE BIG BALLS BOUNCE',color:'#ffc76c'},
 hunter:{label:'LOCK-ON LASER',hint:'BAIT THE TARGET · MOVE AFTER IT LOCKS',color:'#6ef5df'}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(seed){let state=seed>>>0;return ()=>{state=(state+0x6D2B79F5)>>>0;let z=Math.imul(state^(state>>>15),state|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296}}
function createRoute(seed){
 const rand=random(seed);let deck=[],count=0,last='',label='DEBRIS FIELD';
 return {next(){
  count++;
  if(!deck.length){deck=Object.keys(specs);for(let i=deck.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}if(deck.at(-1)===last)[deck[0],deck[deck.length-1]]=[deck.at(-1),deck[0]]}
  // A short, open debris field teaches steering; the first full deck follows it.
  const type=count===1?'debris':deck.pop();last=type;label=specs[type].label;if(count===1&&deck.at(-1)==='debris')[deck[0],deck[deck.length-1]]=[deck.at(-1),deck[0]];
  return {type,label,hint:specs[type].hint,id:count,warmup:count===1,seed:Math.floor(rand()*4294967296),mirror:rand()<.5,drop:count%3===0?(rand()<.5?'shield':'battery'):null};
 },get label(){return label},get sections(){return count}};
}
function createWave(route,speed,playerX){
 const rand=random(route.seed),g={...route,y:-100,age:0,speed,broken:false,hit:false,passed:false,clearance:Infinity,nodes:[],rewards:[],targetX:playerX,locked:false};
 const reward=(x,offset,type='spark')=>g.rewards.push({x,offset,type});
 if(g.type==='debris'){
  const count=g.warmup?3:5,step=Math.max(115,speed*.42);
  for(let i=0;i<count;i++){
   const x=i===0?(g.mirror?125:295):60+rand()*300,r=g.warmup?23:22+rand()*16;
   g.nodes.push({x,y:-i*step,r,turn:rand()*6.28});
   reward(x<210?Math.min(356,x+100):Math.max(64,x-100),-i*step+36);
  }
  g.tail=(count-1)*step+45;
 }else if(g.type==='slalom'){
  // Long islands make the safe side change over time, rather than punching a hole in a row.
  const step=140+speed*.72;
  for(let i=0;i<3;i++){const left=Boolean(i%2)!==g.mirror;g.nodes.push({x:left?-12:185,y:-i*step,w:247,h:140});reward(left?325:95,-i*step+72)}
  g.hint=g.mirror?'WEAVE LEFT, THEN RIGHT':'WEAVE RIGHT, THEN LEFT';g.tail=2*step+10;
 }else if(g.type==='rotor'){
  g.pivot=185+rand()*50;g.spin=(g.mirror?-1:1)*.9;g.angle=rand()*Math.PI;
  g.tail=140;reward(g.pivot<210?365:55,0);reward(g.pivot<210?365:55,-74);
 }else if(g.type==='crossfire'){
  const step=Math.max(140,speed*.48);
  for(let i=0;i<4;i++)g.nodes.push({x:0,y:-i*step,r:15,start:(i%2)*Math.PI,rate:1.35+rand()*.35});
  g.tail=3*step+25;reward(210,-step*.5);reward(210,-step*2.5);
 }else if(g.type==='crusher'){
  const step=180+speed*.7;
  for(let i=0;i<3;i++){g.nodes.push({y:-i*step,phase:i*1.7+(g.mirror?Math.PI:0)});reward(210,-i*step+22);g.rewards.at(-1).jaw=i}
  g.tail=2*step+60;
 }else if(g.type==='mines'){
  const step=Math.max(150,speed*.65);
  for(let i=0;i<6;i++){const x=[85,335,210,335,85,210][g.mirror?5-i:i];g.nodes.push({x,y:-i*step,fuse:null,lockY:null});reward(x<210?310:110,-i*step+55)}
  g.tail=5*step+90;
 }else if(g.type==='comets'){
  const step=Math.max(130,speed*.4);
  for(let i=0;i<7;i++){const vx=((i%2===0)!==g.mirror?1:-1)*(95+speed*.14),aim=65+rand()*290;g.nodes.push({x:aim-vx*(728+i*step)/speed,y:-i*step,vx,r:13});if(i%2===0)reward(aim<210?325:95,-i*step+60)}
  g.tail=6*step+45;
 }else if(g.type==='rails'){
  const step=200+speed*.72;
  for(let i=0;i<2;i++){g.nodes.push({y:-i*step,flip:(i%2===0)!==g.mirror});reward(g.mirror?48:372,-i*step)}
  g.tail=step+155;
 }else if(g.type==='wrecking'){
  const step=Math.max(210,speed*.8);
  for(let i=0;i<3;i++){g.nodes.push({y:-i*step,start:rand()*600,vx:(g.mirror?-1:1)*(120+rand()*35),r:39});reward(210,-i*step+95)}
  g.tail=2*step+60;
 }else{
  g.y=0;g.tail=0;reward(playerX<210?330:90,0);
 }
 if(route.drop){const last=g.rewards.at(-1);reward(last?.x||210,(last?.offset||0)-70,route.drop)}
 return g;
}
function tick(g,dt,step,playerX){
 g.age+=dt;
 if(g.type==='hunter'){
  if(!g.locked){g.targetX=clamp(playerX,30,W-30);if(g.age>=.45)g.locked=true}
 }else g.y+=step;
 if(g.type==='mines')for(const n of g.nodes){
  const y=g.y+n.y;
  if(n.fuse===null&&Math.hypot(playerX-n.x,628-y)<125){n.fuse=0;n.lockY=y}
  else if(n.fuse!==null){if(n.fuse<.7&&n.lockY<628)n.lockY=Math.min(628,n.lockY+step);n.fuse+=dt;}
 }

}
function laserStage(g){return g.age<.45?'tracking':g.age<1.25?'locked':g.age<1.8?'firing':'cooldown'}
function jaw(g,n){return {center:210+Math.sin(g.age*1.05+n.phase)*62,gap:132+Math.sin(g.age*2.2+n.phase)*28}}
function ballX(g,n){const travel=((n.start+g.age*n.vx)%600+600)%600;return 60+(travel<=300?travel:600-travel)}
function mineRadius(n){return n.fuse===null||n.fuse<.7?18:18+46*Math.sin(Math.PI*clamp((n.fuse-.7)/.45,0,1))}
function parts(g){
 if(g.type==='crusher')return g.nodes.flatMap((n,i)=>{const {center,gap}=jaw(g,n);return [{id:'jawL'+i,shape:'rect',x:-12,y:g.y+n.y,w:center-gap/2+12,h:54},{id:'jawR'+i,shape:'rect',x:center+gap/2,y:g.y+n.y,w:W-center-gap/2+12,h:54}]});
 if(g.type==='mines')return g.nodes.flatMap((n,i)=>n.fuse!==null&&n.fuse>=1.15?[]:[{id:'mine'+i,shape:'circle',x:n.x,y:n.lockY??g.y+n.y,r:mineRadius(n),mine:n}]);
 if(g.type==='comets')return g.nodes.map(n=>({shape:'circle',x:n.x+g.age*n.vx,y:g.y+n.y,r:n.r,vx:n.vx,projectile:true}));
 if(g.type==='rails')return g.nodes.flatMap(n=>{const y=g.y+n.y,tip=y+(n.flip?95:-95);return [{shape:'capsule',x:110,y,bx:210,by:tip,r:7},{shape:'capsule',x:210,y:tip,bx:310,by:y,r:7}]});
 if(g.type==='wrecking')return g.nodes.map(n=>({shape:'circle',x:ballX(g,n),y:g.y+n.y,r:n.r,ball:true}));
 if(g.type==='debris')return g.nodes.map(n=>({shape:'circle',x:n.x,y:g.y+n.y,r:n.r,turn:n.turn}));
 if(g.type==='slalom')return g.nodes.map(n=>({shape:'rect',x:n.x,y:g.y+n.y,w:n.w,h:n.h}));
 if(g.type==='rotor'){
  const a=g.angle+g.age*g.spin,dx=Math.cos(a)*116,dy=Math.sin(a)*116;
  return [{shape:'capsule',x:g.pivot-dx,y:g.y-dy,bx:g.pivot+dx,by:g.y+dy,r:8},{shape:'circle',x:g.pivot,y:g.y,r:19}];
 }
 if(g.type==='crossfire')return g.nodes.map(n=>({shape:'circle',x:210+Math.cos(g.age*n.rate+n.start)*168,y:g.y+n.y,r:n.r,direction:-Math.sin(g.age*n.rate+n.start),projectile:true}));
 return laserStage(g)==='firing'?[{shape:'rect',x:g.targetX-19,y:-30,w:38,h:H+60}]:[];
}
function done(g){return g.type==='hunter'?g.age>=2.1:g.y-g.tail>H+55&&(g.type!=='mines'||g.nodes.every(n=>n.fuse===null||n.fuse>=1.15))}
function pointSegment(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,u=len?clamp(((px-ax)*dx+(py-ay)*dy)/len,0,1):0;return Math.hypot(px-ax-u*dx,py-ay-u*dy)}
function distance(p,x,y){
 if(p.shape==='circle')return Math.hypot(x-p.x,y-p.y)-p.r;
 if(p.shape==='capsule')return pointSegment(x,y,p.x,p.y,p.bx,p.by)-p.r;
 const dx=Math.max(p.x-x,0,x-p.x-p.w),dy=Math.max(p.y-y,0,y-p.y-p.h);return Math.hypot(dx,dy);
}
function sweep(before,after,x0,y0,x1,y1){
 let clearance=Infinity;
 for(let i=0;i<after.length;i++){
  const b=after[i],a=(b.id?before.find(p=>p.id===b.id):before[i])||b;
  // Subdivide relative motion, including the ends of rotating arms and forward dash travel.
  const movement=Math.max(Math.hypot(b.x-a.x,b.y-a.y),Math.hypot((b.bx||b.x)-(a.bx||a.x),(b.by||b.y)-(a.by||a.y)))+Math.hypot(x1-x0,y1-y0);
  const samples=Math.max(1,Math.ceil(movement/4));
  for(let j=0;j<=samples;j++){
   const u=j/samples,p={...b,x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
   if(b.shape==='rect'){p.w=a.w+(b.w-a.w)*u;p.h=a.h+(b.h-a.h)*u}
   if(b.shape==='circle')p.r=a.r+(b.r-a.r)*u;
   if(b.shape==='capsule'){p.bx=a.bx+(b.bx-a.bx)*u;p.by=a.by+(b.by-a.by)*u}
   clearance=Math.min(clearance,distance(p,x0+(x1-x0)*u,y0+(y1-y0)*u)-R);
  }
 }
 return {hit:clearance<0,clearance};
}
function rewardPosition(g,it){return {x:it.jaw!==undefined?jaw(g,g.nodes[it.jaw]).center:it.x,y:g.type==='hunter'?100+g.age*330+it.offset:g.y+it.offset}}
function draw(ctx,g){
 const {color}=specs[g.type];ctx.save();ctx.globalAlpha=g.broken?.16:1;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;
 if(g.type==='hunter'){
  const stage=laserStage(g),x=g.targetX;
  if(stage!=='cooldown'){
   const active=stage==='firing';ctx.shadowBlur=active?24:0;ctx.fillStyle=active?color:stage==='tracking'?'#6ef5df12':'#ffb27525';ctx.fillRect(x-19,0,38,H);
   ctx.strokeStyle=stage==='tracking'?color:'#ffb275';ctx.lineWidth=active?2:1;ctx.setLineDash(active?[]:[8,8]);ctx.strokeRect(x-19,-10,38,H+20);ctx.setLineDash([]);
   if(active){ctx.fillStyle='#e5fff9';ctx.fillRect(x-3,0,6,H)}
   ctx.shadowBlur=0;ctx.strokeStyle=stage==='tracking'?color:'#ffb275';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,628,32,0,Math.PI*2);ctx.moveTo(x-43,628);ctx.lineTo(x+43,628);ctx.moveTo(x,585);ctx.lineTo(x,671);ctx.stroke();
   ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillStyle=active?color:'#ffce9d';ctx.fillText(stage==='tracking'?'TARGETING':stage==='locked'?'LOCKED · MOVE!':'FIRING',clamp(x,80,340),490);
   if(!active){ctx.fillStyle='#ffb275';ctx.fillRect(x-19,505,38*clamp((g.age-.45)/.8,0,1),3)}
  }
  ctx.restore();return;
 }
 if(g.type==='rotor'){
  ctx.shadowBlur=0;ctx.strokeStyle=color+'22';ctx.setLineDash([4,9]);ctx.beginPath();ctx.arc(g.pivot,g.y,116,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=color;ctx.shadowBlur=12;
 }
 for(const p of parts(g)){
  if(p.mine){
   const n=p.mine,warning=n.fuse!==null&&n.fuse<.7,blast=n.fuse>=.7&&n.fuse!==null;
   ctx.shadowBlur=blast?24:10;ctx.fillStyle=blast?color+'44':'#351b34';ctx.strokeStyle=warning&&Math.floor(n.fuse*16)%2?'#fff0d0':color;ctx.lineWidth=blast?4:2;
   ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(!blast){ctx.setLineDash([3,6]);ctx.strokeStyle=color+'55';ctx.beginPath();ctx.arc(p.x,p.y,64,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=color;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*18,p.y+Math.sin(a)*18);ctx.lineTo(p.x+Math.cos(a)*24,p.y+Math.sin(a)*24);ctx.stroke()}ctx.fillStyle=warning?'#fff4d4':color;ctx.fillRect(p.x-4,p.y-4,8,8);if(warning){ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('BURST',p.x,p.y-33)}}
   ctx.strokeStyle=color;continue;
  }
  if(p.ball){
   ctx.fillStyle='#3c2b27';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.save();ctx.translate(p.x,p.y);ctx.rotate(g.age*2);ctx.shadowBlur=0;ctx.lineWidth=6;ctx.strokeStyle=color+'99';ctx.beginPath();ctx.moveTo(-22,-22);ctx.lineTo(22,22);ctx.moveTo(22,-22);ctx.lineTo(-22,22);ctx.stroke();ctx.restore();continue;
  }
  if(g.type==='comets'){
   ctx.lineWidth=18;ctx.lineCap='round';ctx.strokeStyle=color+'22';ctx.beginPath();ctx.moveTo(p.x-p.vx*.32,p.y-72);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.lineWidth=4;ctx.strokeStyle=color+'99';ctx.stroke();ctx.fillStyle='#e8fcff';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=color;continue;
  }
  if(g.type==='rails'){
   ctx.lineCap='round';ctx.strokeStyle=color+'33';ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.bx,p.by);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#f2ffe7';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=12;i++){const u=i/12,jitter=i%2?Math.sin(g.age*22+i)*5:0;ctx.lineTo(p.x+(p.bx-p.x)*u+jitter,p.y+(p.by-p.y)*u)}ctx.stroke();ctx.strokeStyle=color;continue;
  }
  if(p.shape==='rect'){
   ctx.fillStyle='#292140';ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,14);ctx.fill();ctx.lineWidth=3;ctx.stroke();ctx.save();ctx.beginPath();ctx.rect(p.x+4,p.y+4,p.w-8,p.h-8);ctx.clip();ctx.strokeStyle=color+'66';ctx.lineWidth=9;for(let x=p.x-150;x<p.x+p.w+150;x+=30){ctx.beginPath();ctx.moveTo(x,p.y);ctx.lineTo(x+140,p.y+p.h);ctx.stroke()}ctx.restore();
   ctx.shadowBlur=0;ctx.fillStyle=color;ctx.font='bold 22px system-ui';ctx.textAlign='center';ctx.fillText(p.x<0?'→':'←',p.x<0?p.x+p.w-34:p.x+34,p.y+(g.type==='crusher'?35:80));ctx.shadowBlur=12;
  }else if(p.shape==='capsule'){
   ctx.lineCap='round';ctx.lineWidth=p.r*2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.bx,p.by);ctx.stroke();ctx.strokeStyle='#fff0f6';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=color;
  }else if(g.type==='debris'){
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.turn+g.age*.18);ctx.fillStyle='#3a2934';ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=p.r*(i%2?.87:1);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.lineWidth=2;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle=color+'70';ctx.beginPath();ctx.moveTo(-p.r*.4,-p.r*.4);ctx.lineTo(0,2);ctx.lineTo(p.r*.5,-p.r*.2);ctx.stroke();ctx.restore();
  }else{
   if(p.projectile){ctx.strokeStyle=color+'66';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(p.x-(p.direction<0?-32:32),p.y-9);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.strokeStyle=color}
   ctx.fillStyle=p.projectile?color:'#35223c';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff4d4';ctx.beginPath();ctx.arc(p.x,p.y,p.projectile?5:6,0,Math.PI*2);ctx.fill();
  }
 }
 if(g.y>30&&g.y<470){ctx.shadowBlur=0;ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(g.label,210,g.y-155)}
 ctx.restore();
}
root.NeonObstacles={specs,createRoute,createWave,tick,parts,done,sweep,distance,draw,rewardPosition,laserStage};
})(globalThis);
