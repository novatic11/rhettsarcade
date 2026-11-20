/* Seeded modular boss encounters. Collision shapes are also used to render attacks. */
((root)=>{
'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const weapons={
 fan:{name:'SCATTER',color:'#ffc67e',hint:'Aimed spread · slip between the rounds'},
 rail:{name:'RAILGUN',color:'#ff88bd',hint:'Lane locks before firing · move after the lock'},
 rockets:{name:'ROCKETS',color:'#ff9c7e',hint:'Missiles turn briefly, then commit · shoot them down'},
 mortar:{name:'MORTAR',color:'#b6a1ff',hint:'Blast targets mark your flight line · leave the rings'},
 saw:{name:'SAW RACK',color:'#ffe28e',hint:'Heavy blades bounce off the side walls'},
 fence:{name:'ARC GATE',color:'#86f2df',hint:'Descending electric bars · follow the opening'},
 helix:{name:'HELIX',color:'#a9d0ff',hint:'Wavering streams · watch their approach'},
 drones:{name:'DRONE BAY',color:'#b8f493',hint:'Drones line up a dive · destroy or dodge them'}
};
const guns={pulse:{name:'TWIN PULSE',interval:.17,damage:5,speed:950},burst:{name:'BURST DRIVER',interval:.48,damage:9,speed:1030},lance:{name:'ION LANCE',interval:.32,damage:18,speed:1250}};
function random(seed){let n=seed>>>0;return ()=>{n=(n+0x6D2B79F5)>>>0;let z=Math.imul(n^(n>>>15),n|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296}}
function createDirector(rand){let next=1000,pending=0;return {observe(score){while(score>=next){if(rand()<.25)pending++;next+=1000}},take(){if(!pending)return false;pending--;return true},get pending(){return pending},get next(){return next}}}
function createFight(seed,index=1){
 const rand=random(seed),deck=Object.keys(weapons);for(let i=deck.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 const scale=1+Math.min(4,Math.max(0,index-1))*.08;
 return {seed,index,rand,stage:'arrival',age:0,time:0,stageTime:0,x:210,y:285,armor:3,core:Math.round(160*scale),maxCore:Math.round(160*scale),gun:Object.keys(guns)[Math.floor(rand()*3)],modules:deck.slice(0,4).map((type,i)=>({id:i,type,offset:[-140,-60,60,140][i],offsetY:i===0||i===3?60:42,hp:Math.round(84*scale),maxHp:Math.round(84*scale),flash:0,windup:0})),shots:[],projectiles:[],hazards:[],fire:0,burst:0,burstWait:0,attack:.8,cursor:0,uid:0,victoryAwarded:false};
}
function modulePosition(f,m){return {x:f.x+m.offset,y:f.y+m.offsetY}}
function event(events,type,x,y,extra={}){events.push({type,x,y,...extra})}
function projectile(f,m,x,y,vx,vy,kind='orb',extra={}){if(f.projectiles.length>=100)return;f.projectiles.push({id:'p'+f.uid++,module:m.id,x,y,vx,vy,age:0,r:kind==='saw'?23:kind==='drone'?13:kind==='rocket'?9:6,kind,color:weapons[m.type].color,...extra})}
function attack(f,m,px,events){
 const p=modulePosition(f,m),type=m.type,color=weapons[type].color;event(events,'attack',p.x,p.y,{weapon:type});
 if(type==='fan'){const angle=Math.atan2(628-p.y,px-p.x);for(let i=-2;i<=2;i++){const a=angle+i*.19;projectile(f,m,p.x,p.y,Math.cos(a)*165,Math.sin(a)*165)}}
 if(type==='rail')f.hazards.push({id:'h'+f.uid++,module:m.id,kind:'rail',x:clamp(px,35,385),y:p.y,age:0,color});
 if(type==='rockets')for(let i=-1;i<=1;i+=2)projectile(f,m,p.x+i*13,p.y,i*38,128,'rocket',{hp:9});
 if(type==='mortar')f.hazards.push({id:'h'+f.uid++,module:m.id,kind:'mortar',x:clamp(px,55,365),y:620,age:0,color});
 if(type==='saw')projectile(f,m,p.x,p.y,p.x<210?135:-135,115,'saw');
 if(type==='fence')f.hazards.push({id:'h'+f.uid++,module:m.id,kind:'fence',x:90+f.rand()*240,y:p.y+30,gap:138,age:0,color});
 if(type==='helix')for(let i=-1;i<=1;i++)projectile(f,m,p.x+i*27,p.y-i*19,i*12,145,'helix',{home:p.x+i*27,phase:i*1.6});
 if(type==='drones')for(let i=-1;i<=1;i+=2)projectile(f,m,clamp(p.x+i*26,30,390),p.y+20,0,25,'drone',{hp:12,target:px});
 f.hazards=f.hazards.slice(-8);
}
function segmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,u=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*u,py-ay-dy*u)}
function damageModule(f,m,damage,events){
 if(m.hp<=0)return;m.hp=Math.max(0,m.hp-damage);m.flash=.09;const p=modulePosition(f,m);event(events,'impact',p.x,p.y,{color:weapons[m.type].color});
 if(!m.hp){f.hazards=f.hazards.filter(h=>h.module!==m.id||h.kind!=='rail');event(events,'module',p.x,p.y,{name:weapons[m.type].name});if(f.modules.every(m=>m.hp<=0)){f.attack=.8;event(events,'exposed',f.x,f.y)}}
}
function fireGun(f,input,events){
 const gun=guns[f.gun],emit=(offset=0)=>f.shots.push({x:input.x+offset,y:input.y-18,previousY:input.y-18,damage:gun.damage,speed:gun.speed,pierce:f.gun==='lance',life:1.3});
 if(f.gun==='pulse'){emit(-6);emit(6)}else emit();f.shots=f.shots.slice(-64);event(events,'shot',input.x,input.y);
}
function dangerParts(f){
 const out=f.projectiles.map(p=>({id:p.id,shape:'circle',x:p.x,y:p.y,r:p.r}));
 for(const h of f.hazards){
  if(h.kind==='rail'&&h.age>=1&&h.age<1.3)out.push({id:h.id,shape:'rect',x:h.x-10,y:h.y,w:20,h:780-h.y});
  if(h.kind==='mortar'&&h.age>=1.25&&h.age<1.75)out.push({id:h.id,shape:'circle',x:h.x,y:h.y,r:Math.sin((h.age-1.25)/.5*Math.PI)*62});
  if(h.kind==='fence'){out.push({id:h.id+'L',shape:'capsule',x:10,y:h.y,bx:h.x-h.gap/2,by:h.y,r:6},{id:h.id+'R',shape:'capsule',x:h.x+h.gap/2,y:h.y,bx:410,by:h.y,r:6})}
 }
 return out;
}
function tick(f,dt,input){
 const events=[];f.age+=dt;f.stageTime+=dt;f.x=210+Math.sin(f.age*.42)*15;f.y=285+Math.sin(f.age*.7)*5;
 for(const m of f.modules){m.flash=Math.max(0,m.flash-dt);m.windup=Math.max(0,m.windup-dt)}
 if(f.stage==='arrival'){if(f.stageTime>=2){f.stage='active';f.stageTime=0;event(events,'ready',f.x,f.y)}return events}
 if(f.stage==='victory')return events;
 f.time+=dt;const before=dangerParts(f);
 f.fire-=dt;f.burstWait-=dt;
 if(f.fire<=0){fireGun(f,input,events);f.fire+=guns[f.gun].interval;if(f.gun==='burst'){f.burst=2;f.burstWait=.065}}
 if(f.burst>0&&f.burstWait<=0){fireGun(f,input,events);f.burst--;f.burstWait=.065}
 const live=f.modules.filter(m=>m.hp>0);f.attack-=dt;
 if(f.attack<=.55&&live.length){const m=live[f.cursor%live.length];m.windup=.55}
 if(f.attack<=0){
  if(live.length){const m=live[f.cursor++%live.length];attack(f,m,input.x,events)}
  else{const angle=Math.atan2(628-f.y,input.x-f.x);for(let i=-1;i<=1;i++){const a=angle+i*.26;projectile(f,{id:-1,type:'fan'},f.x,f.y,Math.cos(a)*145,Math.sin(a)*145)}}
  // Telegraph one module at a time. Core exposure gives a slower final pattern.
  f.attack=live.length?1.25:1.55;
 }
 for(const p of f.projectiles){
  p.age+=dt;
  if(p.kind==='rocket'&&p.age<.85)p.vx+=(clamp((input.x-p.x)*.65,-105,105)-p.vx)*(1-Math.exp(-3*dt));
  if(p.kind==='drone'){
   if(p.age<.75){p.target=input.x;p.vx=clamp((p.target-p.x)*2,-110,110)}
   else if(!p.diving){p.diving=true;p.vx=clamp((p.target-p.x)*.4,-65,65);p.vy=215;event(events,'dive',p.x,p.y)}
  }
  p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.kind==='helix')p.x=p.home+Math.sin(p.age*2.8+p.phase)*42+p.vx*p.age;
  if(p.kind==='saw'){if(p.x<28){p.x=28;p.vx=Math.abs(p.vx)}if(p.x>392){p.x=392;p.vx=-Math.abs(p.vx)}}
 }
 for(const h of f.hazards){h.age+=dt;if(h.kind==='fence')h.y+=105*dt}
 for(const shot of f.shots){
  shot.previousY=shot.y;shot.y-=shot.speed*dt;shot.life-=dt;let stopped=false;
  for(const p of f.projectiles){if(p.hp>0&&segmentDistance(p.x,p.y,shot.x,shot.previousY,shot.x,shot.y)<p.r+4){p.hp-=shot.damage;if(p.hp<=0){p.dead=true;event(events,'intercept',p.x,p.y,{color:p.color})}if(!shot.pierce){shot.life=0;stopped=true;break}}}
  if(stopped)continue;
  for(const m of f.modules){const p=modulePosition(f,m);if(m.hp>0&&segmentDistance(p.x,p.y,shot.x,shot.previousY,shot.x,shot.y)<27){damageModule(f,m,shot.damage,events);shot.life=0;stopped=true;break}}
  if(!stopped&&segmentDistance(f.x,f.y,shot.x,shot.previousY,shot.x,shot.y)<36){shot.life=0;if(f.modules.every(m=>m.hp<=0)){f.core=Math.max(0,f.core-shot.damage);event(events,'impact',f.x,f.y,{color:'#e1ccff'});if(!f.core){f.stage='victory';f.stageTime=0;f.projectiles=[];f.hazards=[];f.shots=[];event(events,'victory',f.x,f.y);break}}}
 }
 f.shots=f.shots.filter(s=>s.life>0&&s.y>-30);
 f.projectiles=f.projectiles.filter(p=>!p.dead&&p.y<800&&p.x>-70&&p.x<490&&p.age<9);
 f.hazards=f.hazards.filter(h=>h.kind==='fence'?h.y<800:h.age<(h.kind==='rail'?1.4:1.8));
 if(f.stage==='active'){
  const after=dangerParts(f),contact=root.NeonObstacles.sweep(before,after,input.previousX??input.x,input.previousY??input.y,input.x,input.y);
  if(contact.hit){if(input.phasing){f.projectiles=f.projectiles.filter(p=>Math.hypot(p.x-input.x,p.y-input.y)>p.r+36)}else if(!input.invulnerable){event(events,'playerHit',input.x,input.y);f.projectiles=f.projectiles.filter(p=>Math.hypot(p.x-input.x,p.y-input.y)>100)}}
 }
 return events;
}
function hull(ctx,points,fill,stroke){ctx.beginPath();for(const [x,y]of points)ctx.lineTo(x,y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function draw(ctx,f,{low=false,reduced=false}={}){
 ctx.save();const intro=f.stage==='arrival'?clamp(f.stageTime/2,0,1):1,dy=(1-intro)**3*-350;
 ctx.translate(0,dy);ctx.globalAlpha=f.stage==='victory'?Math.max(0,1-f.stageTime/1.8):1;ctx.lineWidth=1.5;
 const cx=f.x,cy=f.y;ctx.shadowBlur=low?0:14;ctx.shadowColor='#a69bff';
 hull(ctx,[[cx-184,cy-10],[cx-153,cy-35],[cx-65,cy-26],[cx-28,cy-58],[cx+28,cy-58],[cx+65,cy-26],[cx+153,cy-35],[cx+184,cy-10],[cx+174,cy+23],[cx+55,cy+27],[cx+33,cy+52],[cx-33,cy+52],[cx-55,cy+27],[cx-174,cy+23]],'#19243d','#829dd2');
 ctx.shadowBlur=0;
 for(let i=-1;i<=1;i+=2){hull(ctx,[[cx+i*75,cy-21],[cx+i*152,cy-25],[cx+i*170,cy-9],[cx+i*69,cy+5]],'#344a69');ctx.fillStyle='#87efff';ctx.fillRect(cx+i*160-12,cy+17,24,4)}
 const exposed=f.modules.every(m=>m.hp<=0);ctx.strokeStyle=exposed?'#ff9ed8':'#9cbcff';ctx.fillStyle='#0c142a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,33,0,TAU);ctx.fill();ctx.stroke();
 ctx.save();ctx.translate(cx,cy);ctx.rotate(reduced?0:f.age*.6);hull(ctx,[[0,-23],[18,0],[0,23],[-18,0]],exposed?'#ffc8ed':'#b8aaff');ctx.fillStyle='#fff5ff';ctx.fillRect(-4,-4,8,8);ctx.restore();
 if(!exposed){ctx.strokeStyle='#8aafff66';ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(cx,cy,42,0,TAU);ctx.stroke();ctx.setLineDash([])}
 for(const m of f.modules){
  const p=modulePosition(f,m),w=weapons[m.type];ctx.lineWidth=5;ctx.strokeStyle=m.hp?'#4a6288':'#24334e';ctx.beginPath();ctx.moveTo(cx+m.offset*.85,cy+16);ctx.lineTo(p.x,p.y);ctx.stroke();
  if(m.hp<=0){ctx.lineWidth=1;ctx.strokeStyle='#596681';ctx.strokeRect(p.x-18,p.y-12,36,20);ctx.beginPath();ctx.moveTo(p.x-11,p.y-7);ctx.lineTo(p.x+11,p.y+6);ctx.moveTo(p.x+11,p.y-7);ctx.lineTo(p.x-11,p.y+6);ctx.stroke();continue}
  ctx.strokeStyle=w.color;ctx.lineWidth=2;ctx.shadowColor=w.color;ctx.shadowBlur=low?0:m.windup>0?16:7;
  hull(ctx,[[p.x-25,p.y-19],[p.x-15,p.y-27],[p.x+15,p.y-27],[p.x+25,p.y-19],[p.x+25,p.y+19],[p.x+15,p.y+25],[p.x-15,p.y+25],[p.x-25,p.y+19]],m.flash>0?'#e4f3ff':'#17253d',w.color);
  ctx.shadowBlur=0;ctx.fillStyle=w.color;
  if(m.type==='fan'){for(let i=-1;i<=1;i++){ctx.save();ctx.translate(p.x+i*10,p.y+8);ctx.rotate(-i*.23);ctx.fillRect(-3,0,6,23);ctx.restore()}}
  else if(m.type==='rail'||m.type==='helix'){ctx.fillRect(p.x-5,p.y-3,10,37);ctx.strokeStyle='#e9f7ff';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(p.x-11,p.y+i*7);ctx.lineTo(p.x+11,p.y+i*7);ctx.stroke()}}
  else if(m.type==='rockets'){for(let i=-1;i<=1;i+=2){ctx.strokeRect(p.x+i*10-5,p.y-10,10,28);ctx.fillRect(p.x+i*10-2,p.y+2,4,11)}}
  else if(m.type==='mortar'){ctx.beginPath();ctx.arc(p.x,p.y,13,0,TAU);ctx.stroke();ctx.fillRect(p.x-4,p.y-4,8,8)}
  else if(m.type==='saw'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(reduced?0:f.age*2);hull(ctx,Array.from({length:16},(_,i)=>{const a=i*TAU/16,r=i%2?11:19;return [Math.cos(a)*r,Math.sin(a)*r]}),w.color);ctx.restore()}
  else if(m.type==='fence'){ctx.fillRect(p.x-15,p.y-8,5,25);ctx.fillRect(p.x+10,p.y-8,5,25);ctx.beginPath();ctx.moveTo(p.x-13,p.y);ctx.lineTo(p.x-4,p.y+8);ctx.lineTo(p.x+4,p.y-5);ctx.lineTo(p.x+13,p.y+2);ctx.stroke()}
  else{ctx.strokeRect(p.x-15,p.y-12,30,29);ctx.beginPath();ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x,p.y+17);ctx.stroke()}
  ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle=w.color;ctx.fillText(w.name,p.x,p.y+41);ctx.fillStyle='#0b1021';ctx.fillRect(p.x-25,p.y+47,50,3);ctx.fillStyle=w.color;ctx.fillRect(p.x-25,p.y+47,50*m.hp/m.maxHp,3);
 }
 ctx.restore();
 ctx.save();ctx.lineCap='round';
 for(const h of f.hazards){
  ctx.strokeStyle=h.color;ctx.fillStyle=h.color;ctx.shadowColor=h.color;ctx.shadowBlur=low?0:10;
  if(h.kind==='rail'){if(h.age>=1.3)continue;const fire=h.age>=1&&h.age<1.3;ctx.globalAlpha=fire?.85:.45;ctx.lineWidth=fire?20:1;ctx.setLineDash(fire?[]:[8,8]);ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x,760);ctx.stroke();ctx.setLineDash([]);if(!fire){ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('RAIL LOCK',clamp(h.x,50,370),515)}else{ctx.strokeStyle='#fff4fd';ctx.lineWidth=3;ctx.stroke()}}
  if(h.kind==='mortar'){const active=h.age>=1.25;ctx.globalAlpha=active?.6:.5;ctx.lineWidth=active?3:1;const r=active?Math.sin((h.age-1.25)/.5*Math.PI)*62:62;ctx.beginPath();ctx.arc(h.x,h.y,Math.max(0,r),0,TAU);if(active){ctx.fillStyle=h.color+'55';ctx.fill()}ctx.stroke();if(!active){ctx.beginPath();ctx.arc(h.x,h.y,62*(1-h.age/1.25),0,TAU);ctx.stroke();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=h.color;ctx.fillText('BLAST',h.x,h.y-74)}}
  if(h.kind==='fence'){ctx.globalAlpha=1;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(10,h.y);ctx.lineTo(h.x-h.gap/2,h.y);ctx.moveTo(h.x+h.gap/2,h.y);ctx.lineTo(410,h.y);ctx.stroke();ctx.strokeStyle='#eaffff';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle=h.color+'77';ctx.setLineDash([3,9]);ctx.beginPath();ctx.moveTo(h.x,h.y+20);ctx.lineTo(h.x,h.y+80);ctx.stroke();ctx.setLineDash([])}
 }
 ctx.globalAlpha=1;
 for(const p of f.projectiles){
  ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=p.color;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=low?0:9;ctx.lineWidth=2;
  if(p.kind==='saw'){ctx.rotate(reduced?0:p.age*4);hull(ctx,Array.from({length:20},(_,i)=>{const a=i*TAU/20,r=i%2?16:23;return [Math.cos(a)*r,Math.sin(a)*r]}),'#43362e',p.color);ctx.beginPath();ctx.arc(0,0,6,0,TAU);ctx.fill()}
  else if(p.kind==='rocket'){ctx.rotate(-Math.atan2(p.vx,p.vy));hull(ctx,[[0,12],[-8,-1],[-5,-11],[5,-11],[8,-1]],p.color);ctx.fillStyle='#fff0ce';ctx.fillRect(-2,-16,4,6)}
  else if(p.kind==='drone'){hull(ctx,[[0,-13],[14,0],[0,13],[-14,0]],'#23364b',p.color);ctx.fillStyle=p.color;ctx.fillRect(-3,-3,6,6);if(!p.diving){ctx.globalAlpha=.4;ctx.setLineDash([4,6]);ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(p.target-p.x,370);ctx.stroke()}}
  else{ctx.beginPath();ctx.arc(0,0,p.r,0,TAU);ctx.fill();ctx.fillStyle='#fff1de';ctx.beginPath();ctx.arc(0,0,2,0,TAU);ctx.fill()}
  ctx.restore();
 }
 for(const s of f.shots){ctx.strokeStyle=s.pierce?'#dac0ff':'#9affef';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=low?0:8;ctx.lineWidth=s.pierce?5:3;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x,s.y+(s.pierce?30:13));ctx.stroke()}
 ctx.restore();
}
root.NeonBoss={weapons,guns,random,createDirector,createFight,tick,draw,dangerParts,modulePosition};
})(globalThis);
