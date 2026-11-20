/* Presentation only: never moves collision shapes or changes saved progress. */
((root)=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
function createClock(){
 const step=1/120;let last=null,carry=0;
 return {advance(now,simulate){if(last===null){last=now;return 0}carry+=clamp((now-last)/1000,0,.1);last=now;let count=0;while(carry+1e-9>=step&&count<12){simulate(step);carry=Math.max(0,carry-step);count++}return count},reset(){last=null;carry=0}};
}
function createEffects(){
 let bank=0,flash=0,punch=0,clock=0,rings=[],labels=[];
 const low=()=>root.arcadeSettings?.profile==='chromebook',reduced=()=>Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 function ring(x,y,color,size=80,duration=.55){rings.push({x,y,color,size,age:0,duration});rings=rings.slice(-12)}
 function label(x,y,text,color){labels.push({x,y,text,color,age:0});labels=labels.slice(-8)}
 function event(type,x,y,text){
  if(type==='spark'){ring(x,y,'#ffe3a3',29,.3);punch=.18;return}
  if(type==='dash'){ring(x,y,'#8af6ff',115,.6);flash=.15;punch=.38;return}
  if(type==='break'){ring(x,y,'#b1f5ff',72,.4);label(x,y-28,'PHASE BREAK','#a7f5ff');return}
  if(type==='shield'){ring(x,y,'#a6c5ff',95,.7);label(x,y-32,text||'SHIELD ACTIVE','#b8dbff');flash=.12;return}
  if(type==='near'){ring(x,y,'#b3ffdd',38,.4);label(x,y-35,text||'CLOSE CALL +15','#b3ffdd');punch=.25;return}
  if(type==='over'){ring(x,y,'#ff82ac',130,.65);flash=.2;return}
  if(type==='combo'){label(x,y-55,text,'#ffe3a3');ring(x,y,'#ffe3a3',70,.6);punch=.3;return}
  label(x,y-34,text||'DASH RECHARGED','#a2f4ff');ring(x,y,'#a2f4ff',48,.45);
 }
 function tick(dt,vx){clock+=dt;bank+=(clamp(vx/1500,-.26,.26)-bank)*(1-Math.exp(-13*dt));flash=Math.max(0,flash-dt);punch=Math.max(0,punch-dt);for(const r of rings)r.age+=dt;for(const l of labels)l.age+=dt;rings=rings.filter(r=>r.age<r.duration);labels=labels.filter(l=>l.age<.85)}
 function background(ctx,phase,pace,color,x,boost){
  const scroll=reduced()?0:phase;ctx.save();const base=ctx.createLinearGradient(0,0,0,740);base.addColorStop(0,'#111d39');base.addColorStop(.5,'#080f23');base.addColorStop(1,'#050b19');ctx.fillStyle=base;ctx.fillRect(0,0,420,740);
  const glow=ctx.createRadialGradient(210,180,5,210,180,320);glow.addColorStop(0,'#7368db1c');glow.addColorStop(.6,'#21465c0b');glow.addColorStop(1,'#0a102000');ctx.fillStyle=glow;ctx.fillRect(0,0,420,740);
  const shift=reduced()?0:(x-210)*.025;ctx.lineWidth=.7;ctx.strokeStyle=color+'14';
  for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(210+i*30+shift,110);ctx.lineTo(210+i*110+shift,740);ctx.stroke()}
  for(let i=0;i<15;i++){const u=((i/15+(reduced()?0:phase*.018))%1),y=120+u*u*650;ctx.globalAlpha=u*.4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(420,y);ctx.stroke()}
  ctx.globalAlpha=1;
  const count=low()?24:48;
  for(let i=0;i<count;i++){const depth=.3+(i%4)*.23,y=((i*83+scroll*(13+depth*22))%800)-30,sx=(i*137.5+27)%420+shift*depth;ctx.fillStyle=i%4===0?color:'#c1d8ff';ctx.globalAlpha=.18+depth*.25;ctx.fillRect(sx,y,i%3===0?1.5:1,reduced()?2:2+Math.min(9,(pace-1)*2)+(boost?20:0))}
  ctx.globalAlpha=.32;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(15,740);ctx.moveTo(405,0);ctx.lineTo(405,740);ctx.stroke();
  for(let i=0;i<6;i++){const y=((i*147+scroll*90)%880)-80;ctx.globalAlpha=.3;ctx.fillStyle=color;ctx.fillRect(10,y,3,24);ctx.fillRect(407,y,3,24)}
  ctx.globalAlpha=1;ctx.restore();
 }
 function wake(ctx,trail,color,boost){
  if(trail.length<2)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=0;
  for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],u=clamp(b.life/.4,0,1);ctx.globalAlpha=u*(boost?.55:.22);ctx.strokeStyle=boost?'#8af6ff':color;ctx.lineWidth=(boost?13:7)*u;ctx.beginPath();ctx.moveTo(a.x,a.y+14);ctx.lineTo(b.x,b.y+14);ctx.stroke()}
  ctx.restore();
 }
 function engine(ctx,phase,boost,color){
  ctx.save();const length=boost?66:25+Math.sin(phase*40)*4,g=ctx.createLinearGradient(0,9,0,length+15);g.addColorStop(0,'#e9ffff');g.addColorStop(.22,boost?'#8af6ff':color);g.addColorStop(1,'#8adfff00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-4,9);ctx.quadraticCurveTo(-7,24,0,length+15);ctx.quadraticCurveTo(7,24,4,9);ctx.fill();ctx.restore();
 }
 function pickup(ctx,it,phase){
  ctx.save();ctx.translate(it.x,it.y);const spark=it.type==='spark',color=spark?'#ffe0a1':'#a1dfff',pulse=1+Math.sin(phase*4+it.y*.01)*.08;
  ctx.scale(pulse,pulse);ctx.strokeStyle=color;ctx.fillStyle=spark?'#6d4e29':'#16395a';ctx.shadowColor=color;ctx.shadowBlur=low()?0:14;
  if(spark){ctx.rotate(Math.PI/4);ctx.fillRect(-7,-7,14,14);ctx.lineWidth=1.5;ctx.strokeRect(-7,-7,14,14);ctx.fillStyle='#fff3d3';ctx.fillRect(-3,-3,6,6)}
  else{ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle=color+'55';ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(0,0,21,-phase,TAU-phase);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=color;ctx.font='bold 19px system-ui';ctx.textAlign='center';ctx.fillText(it.type==='shield'?'◇':'ϟ',0,7)}
  ctx.restore();
 }
 function foreground(ctx){
  ctx.save();ctx.shadowBlur=0;
  for(const r of rings){const u=r.age/r.duration;ctx.globalAlpha=(1-u)*.65;ctx.strokeStyle=r.color;ctx.lineWidth=(1-u)*3+.5;ctx.beginPath();ctx.arc(r.x,r.y,12+(reduced()?u*.25:u)*r.size,0,TAU);ctx.stroke()}
  for(const l of labels){ctx.globalAlpha=Math.min(1,l.age*10)*Math.min(1,(.85-l.age)*4);ctx.fillStyle=l.color;ctx.textAlign='center';ctx.font='bold 11px monospace';ctx.fillText(l.text,clamp(l.x,90,330),l.y-(reduced()?0:l.age*32))}
  if(flash>0&&!reduced()){ctx.globalAlpha=flash*.25;ctx.fillStyle='#c9ecff';ctx.fillRect(0,0,420,740)}ctx.restore();
 }
 return {tick,event,background,wake,engine,pickup,foreground,get bank(){return reduced()?0:bank},get punch(){return punch},get reduced(){return reduced()},get low(){return low()},get counts(){return {rings:rings.length,labels:labels.length}},reset(){bank=flash=punch=clock=0;rings=[];labels=[]}};
}
root.NeonFlight={createClock,createEffects};
})(globalThis);
