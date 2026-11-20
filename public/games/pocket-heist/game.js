import {Heist,GEAR,CHAPTERS,chapterOf,T,GW,GH,W,H,FLOOR,WALL,OUT,DOOR,RED,BLUE,EXIT} from './model.js';
import {Sfx} from './sfx.js';

const KEY='pocket-heist-prototype-v1',$=s=>document.querySelector(s),money=v=>'$'+Math.floor(v).toLocaleString();
let stats={best:0,cleared:0,plays:0,muted:false,musicMuted:false,medals:{},cash:0,gear:{},stolen:0};
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object')stats={...stats,...v};}catch{}
for(const k of ['best','cleared','plays','cash','stolen'])stats[k]=Number.isFinite(stats[k])?Math.max(0,Math.floor(stats[k])):0;
if(!stats.medals||typeof stats.medals!=='object'||Array.isArray(stats.medals))stats.medals={};if(!stats.gear||typeof stats.gear!=='object')stats.gear={};
for(const k in stats.gear)if(!GEAR[k])delete stats.gear[k];delete stats.run;delete stats.bestCargo;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(stats));}catch{}}
const sfx=new Sfx('pocket-heist-audio-unused');sfx.muted=!!stats.muted;sfx.music=!stats.musicMuted;sfx.save=()=>{stats.muted=sfx.muted;stats.musicMuted=!sfx.music;persist();};
const SNEAK={bpm:84,wave:'triangle',vol:.03,bassWave:'sine',bassVol:.08,hold:1.4,steps:[[62],[],[],[65],[],[],[64],[],[62],[],[],[60],[],[57],[],[]],bass:[38,null,null,null,38,null,null,null,41,null,null,null,36,null,40,null]};
const CHASE={bpm:150,wave:'square',vol:.022,bassWave:'sawtooth',bassVol:.04,hat:true,hold:.8,steps:[[69],[],[72],[69],[],[67],[69],[],[69],[],[72],[74],[],[72],[69],[]],bass:[45,45,null,45,45,null,48,null,45,45,null,45,43,null,40,null]};

const canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay');
let view={s:1,ox:0,oy:0},game=null,mode='menu',keys=new Set(),pressed=new Set(),time=0,last=performance.now(),staticLayer=null,shake=0,flash=0;

/* ---------------- static map layer ---------------- */
function roomColor(r){const hues=[210,30,160,280,350,190,45,120,250,10];return hues[r.id%hues.length];}
function fitView(){let x0=GW,y0=GH,x1=0,y1=0;for(const r of game.rooms){x0=Math.min(x0,r.x-1);y0=Math.min(y0,r.y-1);x1=Math.max(x1,r.x+r.w+1);y1=Math.max(y1,r.y+r.h+1);}y1=Math.max(y1,game.exit.y+2);x0-=.5;x1+=.5;y0-=1.4;y1+=.4;const s=Math.min(1.7,W/((x1-x0)*T),H/((y1-y0)*T));view={s,ox:W/2-(x0+x1)/2*T*s,oy:H/2-(y0+y1)/2*T*s+12};}
function buildStatic(){fitView();
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
 c.fillStyle='#1a1f27';c.fillRect(0,0,W,H);
 for(let i=0;i<300;i++){c.fillStyle=`rgba(255,255,255,${Math.random()*.03})`;c.fillRect(Math.random()*W,Math.random()*H,2,2);}
 c.strokeStyle='#e6c25a33';c.lineWidth=3;c.setLineDash([22,18]);c.beginPath();c.moveTo(0,H-14);c.lineTo(W,H-14);c.stroke();c.setLineDash([]);
 for(const r of game.rooms){const h=roomColor(r);c.fillStyle=`hsl(${h},16%,${r.dark?11:19}%)`;c.fillRect(r.x*T,r.y*T,r.w*T,r.h*T);
  const pattern=r.id%3;c.strokeStyle=`hsla(${h},25%,40%,.18)`;c.lineWidth=1;
  if(pattern===0)for(let x=r.x;x<=r.x+r.w;x++){c.beginPath();c.moveTo(x*T,r.y*T);c.lineTo(x*T,(r.y+r.h)*T);c.stroke();}
  else if(pattern===1)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){if((x+y)%2){c.fillStyle=`hsla(${h},20%,30%,.25)`;c.fillRect(x*T,y*T,T,T);}}
  else{for(let y=r.y*T;y<(r.y+r.h)*T;y+=10){c.beginPath();c.moveTo(r.x*T,y);c.lineTo((r.x+r.w)*T,y);c.stroke();}}
  c.fillStyle=`hsla(${h},40%,60%,.08)`;c.beginPath();c.ellipse((r.x+r.w/2)*T,(r.y+r.h/2)*T,r.w*T*.35,r.h*T*.3,0,0,7);c.fill();
 }
 for(const k of game.creaks){const [x,y]=k.split(',').map(Number);c.strokeStyle='#c99a6255';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.moveTo(x*T+2,y*T+6+i*9);c.lineTo(x*T+T-2,y*T+6+i*9+(i%2?2:-2));c.stroke();}}
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const v=game.at(x,y);
  if(v===WALL){c.fillStyle='#2b3547';c.fillRect(x*T,y*T,T,T);c.fillStyle='#3d4a61';c.fillRect(x*T,y*T,T,T-6);c.fillStyle='#4b5a75';c.fillRect(x*T,y*T,T,3);}
  else if(v===DOOR){c.fillStyle='#4a3a2a';c.fillRect(x*T+2,y*T+2,T-4,T-4);c.fillStyle='#6b543c66';c.fillRect(x*T+4,y*T+4,T-8,T-8);}
  else if(v===EXIT){c.fillStyle='#29452f';c.fillRect(x*T,y*T,T,T);c.fillStyle='#7ef0a0';c.font='700 9px system-ui';c.textAlign='center';c.fillText('EXIT',x*T+T/2,y*T+T/2+3);}
 }
 // getaway van
 const ex=game.exit;const vx=ex.x*T+T/2,vy=(ex.y+1)*T+4;c.save();c.translate(vx,vy);c.fillStyle='#0006';c.fillRect(-34,4,68,20);c.fillStyle='#d9dde4';c.beginPath();c.roundRect(-32,0,64,22,5);c.fill();c.fillStyle='#4a5a70';c.fillRect(14,3,14,10);c.fillStyle='#222';c.beginPath();c.arc(-20,22,5,0,7);c.arc(18,22,5,0,7);c.fill();c.fillStyle='#e9a93f';c.font='700 8px system-ui';c.textAlign='center';c.fillText('LAUNDRY',-6,14);c.restore();
 return cv;
}

/* ---------------- drawing ---------------- */
function fan(ox,oy,face,fov,range,color,rays=36){const c=ctx;c.beginPath();c.moveTo(ox,oy);for(let i=0;i<=rays;i++){const a=face-fov/2+fov*i/rays,d=game.ray(ox,oy,a,range);c.lineTo(ox+Math.cos(a)*d,oy+Math.sin(a)*d);}c.closePath();c.fillStyle=color;c.fill();}
function icon(kind,x,y,t){const c=ctx;c.save();c.translate(x,y);const bob=Math.sin(t*3+x)*2;c.translate(0,bob);
 c.shadowColor='#ffe08a';c.shadowBlur=8;
 if(kind==='painting'){c.fillStyle='#b8873a';c.fillRect(-10,-8,20,16);c.fillStyle='#4a8ad0';c.fillRect(-7,-5,14,10);c.fillStyle='#f2c36b';c.beginPath();c.arc(2,-1,3,0,7);c.fill();}
 else if(kind==='statue'){c.fillStyle='#e8e2d0';c.beginPath();c.arc(0,-5,4,0,7);c.fill();c.fillRect(-4,-1,8,9);c.fillStyle='#9a927e';c.fillRect(-7,7,14,3);}
 else if(kind==='gem'||kind==='diamond'){c.fillStyle=kind==='gem'?'#ff6ba8':'#9ef0ff';c.beginPath();c.moveTo(0,-9);c.lineTo(8,-2);c.lineTo(0,9);c.lineTo(-8,-2);c.closePath();c.fill();c.fillStyle='#fff8';c.beginPath();c.moveTo(0,-9);c.lineTo(3,-2);c.lineTo(-3,-2);c.fill();}
 else if(kind==='cash'){c.fillStyle='#5dbb63';c.fillRect(-8,-5,16,10);c.fillStyle='#2f7a3a';c.fillRect(-2,-5,4,10);}
 else if(kind==='watch'){c.strokeStyle='#ddd';c.lineWidth=2;c.beginPath();c.arc(0,0,5,0,7);c.stroke();c.fillStyle='#f2c36b';c.fillRect(-2,-9,4,4);c.fillRect(-2,5,4,4);}
 else{c.strokeStyle='#f2c36b';c.lineWidth=2.5;c.beginPath();c.arc(0,2,5,0,7);c.stroke();c.fillStyle='#9ef0ff';c.beginPath();c.arc(0,-4,3,0,7);c.fill();}
 c.restore();}
function person(x,y,face,body,head,o={}){const c=ctx;c.save();c.translate(x,y);c.fillStyle='#0006';c.beginPath();c.ellipse(0,5,11,6,0,0,7);c.fill();c.rotate(face);
 if(o.dog){c.fillStyle=body;c.beginPath();c.ellipse(0,0,11,6,0,0,7);c.fill();c.beginPath();c.arc(10,0,5,0,7);c.fill();c.fillStyle='#2a1a10';c.beginPath();c.ellipse(9,-4,2,3,0,0,7);c.ellipse(9,4,2,3,0,0,7);c.fill();c.strokeStyle=body;c.lineWidth=3;c.beginPath();c.moveTo(-10,0);c.lineTo(-15,Math.sin(time*14)*3);c.stroke();}
 else{const sw=o.moving?Math.sin(time*(o.fast?16:10))*3:0;c.fillStyle=o.feet||'#111';c.beginPath();c.arc(3+sw,-5,3,0,7);c.arc(3-sw,5,3,0,7);c.fill();c.fillStyle=body;c.beginPath();c.ellipse(0,0,7,10,0,0,7);c.fill();c.fillStyle=head;c.beginPath();c.arc(1,0,6,0,7);c.fill();if(o.cap){c.fillStyle=o.cap;c.beginPath();c.arc(0,0,6,Math.PI*.5,Math.PI*1.5);c.fill();c.fillRect(3,-3,5,6);}}
 c.restore();}
function draw(){
 const c=ctx;c.fillStyle='#10151d';c.fillRect(0,0,W,H);c.save();if(shake>0){c.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);}c.translate(view.ox,view.oy);c.scale(view.s,view.s);
 c.drawImage(staticLayer,0,0);
 // dynamic doors (locked)
 for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){const v=game.at(x,y);if(v===RED||v===BLUE){c.fillStyle=v===RED?'#c23b4a':'#3b6fd0';c.fillRect(x*T+1,y*T+1,T-2,T-2);c.fillStyle='#fff9';c.fillRect(x*T+T/2-3,y*T+T/2-4,6,8);c.fillStyle=v===RED?'#ff8a96':'#9cc0ff';c.fillRect(x*T+T/2-1,y*T+T/2-1,2,3);}}
 // props
 for(const h of game.hides){c.fillStyle='#55657d';c.fillRect(h.x*T+5,h.y*T+3,T-10,T-6);c.fillStyle='#3a475a';for(let i=0;i<3;i++)c.fillRect(h.x*T+8,h.y*T+7+i*5,T-16,2);if(game.p.hidden===h){c.strokeStyle='#6fd6c8';c.lineWidth=2;c.strokeRect(h.x*T+4,h.y*T+2,T-8,T-4);}}
 if(game.terminal){const t=game.terminal;c.fillStyle='#22303f';c.fillRect(t.x*T+4,t.y*T+4,T-8,T-8);c.fillStyle=game.loopTime>0?'#6fd6c8':`hsl(140,70%,${40+Math.sin(time*6)*15}%)`;c.fillRect(t.x*T+7,t.y*T+7,T-14,T-16);if(t.progress>0){c.fillStyle='#6fd6c8';c.fillRect(t.x*T,t.y*T-6,T*t.progress/1.6,4);}}
 if(game.vault){const v=game.vault,x=v.x*T,y=v.y*T;c.fillStyle='#5d6672';c.fillRect(x+1,y+1,T-2,T-2);c.strokeStyle='#9aa4b2';c.lineWidth=2;c.strokeRect(x+3,y+3,T-6,T-6);c.save();c.translate(x+T/2,y+T/2);c.rotate(v.open?1.5:v.progress*3);c.strokeStyle='#e8edf4';c.beginPath();c.arc(0,0,7,0,7);c.moveTo(-7,0);c.lineTo(7,0);c.moveTo(0,-7);c.lineTo(0,7);c.stroke();c.restore();if(!v.open&&v.progress>0){c.fillStyle='#f2c36b';c.fillRect(x,y-6,T*v.progress/v.time,4);}}
 for(const k of game.keys)if(!k.taken){c.save();c.translate((k.x+.5)*T,(k.y+.5)*T+Math.sin(time*3)*2);c.fillStyle=k.color===RED?'#ff5d6c':'#5d9bff';c.shadowColor=c.fillStyle;c.shadowBlur=10;c.fillRect(-8,-5,16,10);c.fillStyle='#fff';c.fillRect(-5,-2,6,4);c.restore();}
 for(const l of game.loot)if(!l.taken){if(l.required){c.strokeStyle=`rgba(242,195,107,${.4+.3*Math.sin(time*4)})`;c.lineWidth=2;c.beginPath();c.arc((l.x+.5)*T,(l.y+.5)*T,15+Math.sin(time*4)*2,0,7);c.stroke();}icon(l.kind,(l.x+.5)*T,(l.y+.5)*T,time);}
 // lasers
 for(const l of game.lasers){const cx=(l.x+.5)*T,cy=(l.y+.5)*T,on=game.laserOn(l),cyc=((game.time+l.phase)%l.period)/l.period,warn=!on&&cyc>.85;c.fillStyle='#555';if(l.v){c.fillRect(cx-3,l.y*T-2,6,4);c.fillRect(cx-3,(l.y+1)*T-2,6,4);}else{c.fillRect(l.x*T-2,cy-3,4,6);c.fillRect((l.x+1)*T-2,cy-3,4,6);}
  if(on||warn){c.strokeStyle=on?'#ff3048':'#ff304855';c.lineWidth=on?3:1;c.shadowColor='#ff3048';c.shadowBlur=on?12:0;c.beginPath();if(l.v){c.moveTo(cx,l.y*T);c.lineTo(cx,(l.y+1)*T);}else{c.moveTo(l.x*T,cy);c.lineTo((l.x+1)*T,cy);}c.stroke();c.shadowBlur=0;}}
 // vision cones
 for(const cam of game.cameras){if(cam.ang==null)continue;const on=game.camOn(cam);if(on)fan(cam.x,cam.y,cam.ang,.9,190,cam.sus>0?`rgba(255,${120-cam.sus*100},80,${.16+cam.sus*.25})`:'rgba(120,200,255,.11)',24);c.save();c.translate(cam.x,cam.y);c.rotate(cam.ang);c.fillStyle=on?'#cfd6e0':'#666';c.fillRect(-6,-5,14,10);c.fillStyle=on?(cam.sus>.5?'#ff5d6c':'#6fd6c8'):'#333';c.beginPath();c.arc(8,0,3,0,7);c.fill();c.restore();if(cam.off>0||game.loopTime>0){c.fillStyle='#6fd6c8';c.font='10px system-ui';c.textAlign='center';c.fillText('⚡',cam.x,cam.y-10);}}
 for(const g of game.guards){const dog=g.kind==='dog',alert=g.state==='chase';fan(g.x,g.y,g.face,dog?2:1.25,(dog?125:170)*(1),alert?'rgba(255,80,90,.2)':g.state==='investigate'?'rgba(255,200,90,.17)':'rgba(255,240,190,.12)',dog?30:34);}
 // dark rooms
 for(const r of game.rooms)if(r.dark){c.fillStyle='rgba(0,0,8,.45)';c.fillRect(r.x*T,r.y*T,r.w*T,r.h*T);}
 // noises
 for(const n of game.noises){c.strokeStyle=`rgba(255,255,255,${.35*(1-n.t/.8)})`;c.lineWidth=1.5;c.beginPath();c.arc(n.x,n.y,n.r*n.t/.8,0,7);c.stroke();}
 for(const d of game.decoys){c.fillStyle='#f2c36b';c.beginPath();c.arc(d.x,d.y+Math.abs(Math.sin(time*20))*-3,4,0,7);c.fill();}
 for(const e of game.emps){c.strokeStyle=`rgba(111,214,200,${1-e.t/.8})`;c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,200*e.t/.8,0,7);c.stroke();}
 // guards & player
 for(const g of game.guards){person(g.x,g.y,g.face,g.kind==='dog'?'#8a5a32':'#2d4a86','#e9c9a5',{dog:g.kind==='dog',cap:'#1d3060',moving:true,fast:g.state==='chase'});
  const mark=g.state==='chase'?'!':g.sus>.15?'?':'';if(mark){c.fillStyle=g.state==='chase'?'#ff5d6c':'#f2c36b';c.font='800 16px system-ui';c.textAlign='center';c.fillText(mark,g.x,g.y-16);}
  if(g.sus>0&&g.state!=='chase'){c.fillStyle='#0008';c.fillRect(g.x-12,g.y-28,24,4);c.fillStyle='#f2c36b';c.fillRect(g.x-12,g.y-28,24*Math.min(1,g.sus),4);}}
 const p=game.p;if(!p.hidden){c.globalAlpha=p.sneak?.75:1;person(p.x,p.y,p.face,'#1b1f26','#d8b090',{cap:'#30343c',moving:p.moving,feet:'#6fd6c8'});c.globalAlpha=1;if(game.haveKeys.size){let i=0;for(const k of game.haveKeys){c.fillStyle=k===RED?'#ff5d6c':'#5d9bff';c.fillRect(p.x-8+i*9,p.y+13,7,4);i++;}}}
 // smoke
 for(const s of game.smokes){const g2=c.createRadialGradient(s.x,s.y,4,s.x,s.y,s.r);g2.addColorStop(0,'rgba(190,195,205,.92)');g2.addColorStop(1,'rgba(150,155,165,0)');c.fillStyle=g2;c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.fill();}
 // interaction prompt
 const it=game.interactables()[0];if(it&&!game.p.moving){c.fillStyle='#000a';c.fillRect(p.x-50,p.y-40,100,18);c.fillStyle='#f2c36b';c.font='600 11px system-ui';c.textAlign='center';c.fillText({vault:'Hold E · crack vault',terminal:'Hold E · loop cameras',hide:p.hidden?'E · leave locker':'E · hide in locker'}[it.kind],p.x,p.y-27);}
 c.restore();c.save();
 if(game.alarmed){c.fillStyle=`rgba(255,40,60,${.08+.08*Math.sin(time*8)})`;c.fillRect(0,0,W,H);}
 if(flash>0){c.fillStyle=`rgba(255,255,255,${flash})`;c.fillRect(0,0,W,H);}
 c.restore();
 hud();
}
function hud(){
 const c=ctx,ch=CHAPTERS[game.chapter];c.fillStyle='#0b111bd0';c.fillRect(0,0,W,30);c.font='600 13px system-ui';c.textAlign='left';c.fillStyle='#f2c36b';
 c.fillText(game.level>100?`Endless job ${game.level-100}`:`Job ${game.level} · ${ch.name}`,12,20);
 c.fillStyle='#e8edf4';c.fillText(`🎯 ${game.targetsLeft()} left`,300,20);c.fillText(`💰 ${money(game.stolen)}`,400,20);c.fillText(`⏱ ${Math.floor(game.time)}s / par ${game.par}s`,500,20);
 c.fillText(`Q smoke ${game.charges.smoke}   F decoy ${game.charges.decoy}   C EMP ${game.charges.emp}`,660,20);
 if(game.loopTime>0){c.fillStyle='#6fd6c8';c.fillText('Loop '+Math.ceil(game.loopTime)+'s',900,20);}
 if(game.alarmed){c.fillStyle='#ff5d6c';c.font='800 22px system-ui';c.textAlign='center';c.fillText(`ALARM · POLICE IN ${Math.ceil(game.police)}s`,W/2,62);}
 if(game.messageTime>0&&game.message){c.font='600 14px system-ui';const w=c.measureText(game.message).width+28;c.fillStyle='#0b111be0';c.beginPath();c.roundRect(W/2-w/2,H-44,w,30,8);c.fill();c.fillStyle='#e8edf4';c.textAlign='center';c.fillText(game.message,W/2,H-24);}
 if(game.p.sneak){c.fillStyle='#6fd6c8';c.font='700 11px system-ui';c.textAlign='left';c.fillText('SNEAKING',12,H-12);}
}

/* ---------------- audio events ---------------- */
function handleEvents(){for(const e of game.events.splice(0)){switch(e){
 case 'step':sfx.noise(.03,{freq:600,vol:.03});break;case 'softstep':break;
 case 'creak':sfx.tone(140,.25,{type:'sawtooth',vol:.05,slide:.7});break;
 case 'loot':sfx.tone(1320,.06,{type:'square',vol:.06});sfx.tone(1760,.08,{type:'square',vol:.05,delay:.05});break;
 case 'target':sfx.chord([784,988,1175,1568],.3,{type:'triangle',vol:.09,spread:.06});break;
 case 'key':sfx.chord([660,880],.15,{type:'triangle',vol:.08,spread:.05});break;
 case 'door':sfx.noise(.1,{freq:400,vol:.1});break;
 case 'huh':sfx.tone(520,.12,{type:'triangle',vol:.06,slide:1.3});break;
 case 'spotted':sfx.tone(880,.18,{type:'square',vol:.07});sfx.tone(660,.25,{type:'square',vol:.07,delay:.12});break;
 case 'alarm':shake=6;for(let i=0;i<4;i++)sfx.tone(i%2?740:980,.2,{type:'sawtooth',vol:.06,delay:i*.22});break;
 case 'smoke':sfx.noise(.6,{freq:900,vol:.14});break;case 'decoy':sfx.tone(300,.1,{type:'square',vol:.05});break;
 case 'emp':sfx.tone(120,.5,{type:'sawtooth',vol:.08,slide:3});flash=.3;break;
 case 'drill':sfx.noise(.25,{filter:'bandpass',freq:2400,vol:.08});break;case 'vault':sfx.chord([392,523,659],.4,{type:'triangle',vol:.08,spread:.08});break;
 case 'hack':sfx.chord([880,1175,1568],.15,{type:'square',vol:.04,spread:.05});break;
 case 'hide':case 'unhide':sfx.noise(.08,{freq:1200,vol:.07});break;
 case 'win':sfx.chord([523,659,784,1047],.6,{type:'triangle',vol:.1,spread:.1});break;
 case 'caught':shake=10;sfx.tone(200,.6,{type:'sawtooth',vol:.09,slide:.4});break;
}}}

/* ---------------- menus ---------------- */
const nextJob=()=>stats.cleared+1;
function show(html){overlay.innerHTML=`<div class="card">${html}</div>`;overlay.hidden=false;}
function hide(){overlay.hidden=true;}
function stars(n){return '★'.repeat(n)+'<i>'+'★'.repeat(3-n)+'</i>';}
function menu(){
 mode='menu';sfx.stop();const n=nextJob(),ch=CHAPTERS[chapterOf(n)];
 show(`<p class="eyebrow">${n>100?'Endless jobs unlocked':'Chapter '+(chapterOf(n)+1)+' · '+ch.name}</p><h2>Pocket Heist</h2><p>Slip into the building, steal the marked target${n>3?'s':''}, and get back to the laundry van. Every job is a new floor plan. ${n<=100?'Clear all 100 jobs across ten chapters to unlock endless heists.':'You finished the campaign. The city still has plenty to steal.'}</p>
 <div class="stats"><div><small>Jobs cleared</small><b>${Math.min(100,stats.cleared)} / 100</b></div><div><small>Wallet</small><b>${money(stats.cash)}</b></div><div><small>Best score</small><b>${stats.best.toLocaleString()}</b></div></div>
 <div class="row"><button class="primary" id="go">${n>100?'Next endless job':'Start job '+n}</button><button id="jobs">Choose a job</button><button id="shop">Safehouse shop</button>${n>100?'':''}</div>`);
 $('#go').onclick=()=>start(n);$('#jobs').onclick=jobs;$('#shop').onclick=()=>shop(menu);
}
function jobs(){
 let html='<p class="eyebrow">Job board</p><h2>Choose a job</h2><p>Stars: finish the job · never set off an alarm · take every piece of loot.</p><div class="chapters">';
 for(let ch=0;ch<10;ch++){const first=ch*10+1;if(first>nextJob())break;const got=Array.from({length:10},(_,i)=>Number(stats.medals[first+i])||0).reduce((a,b)=>a+b,0);
  html+=`<div class="chapter"><h3>${ch+1}. ${CHAPTERS[ch].name}<small>${got} / 30 ★</small></h3><div class="jobs">`;
  for(let i=0;i<10;i++){const lv=first+i,m=Number(stats.medals[lv])||0,open=lv<=nextJob();html+=`<button class="job ${lv===nextJob()?'next':''}" data-lv="${lv}" ${open?'':'disabled'}>${lv}<small>${m?'★'.repeat(m):''}</small></button>`;}
  html+='</div></div>';}
 html+=`</div><div class="row"><button id="back">Back</button>${nextJob()>100?'<button class="primary" id="endless">Endless job '+(nextJob()-100)+'</button>':''}</div>`;show(html);
 overlay.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>start(Number(b.dataset.lv)));$('#back').onclick=menu;$('#endless')&&($('#endless').onclick=()=>start(nextJob()));
}
function shop(back){
 const html=`<p class="eyebrow">Safehouse</p><h2>Gear up</h2><p>Spend your take on tools. Gadget levels give that many charges on every job.</p><div class="stats"><div><small>Wallet</small><b>${money(stats.cash)}</b></div><div><small>Total stolen</small><b>${money(stats.stolen)}</b></div><div><small>Jobs cleared</small><b>${stats.cleared}</b></div></div><div class="gear">`+
 Object.entries(GEAR).map(([k,g])=>{const lv=stats.gear[k]||0,max=lv>=g.costs.length;return `<div><b>${g.name}${g.key?' <kbd>'+g.key+'</kbd>':''}</b><span class="pips">${'●'.repeat(lv)}${'○'.repeat(g.costs.length-lv)}</span><p>${g.desc}</p><button data-buy="${k}" ${max||stats.cash<g.costs[lv]?'disabled':''}>${max?'Maxed':'Buy '+money(g.costs[lv])}</button></div>`;}).join('')+`</div><div class="row"><button id="back">Done</button></div>`;
 show(html);overlay.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy,lv=stats.gear[k]||0,cost=GEAR[k].costs[lv];if(stats.cash>=cost){stats.cash-=cost;stats.gear[k]=lv+1;persist();sfx.chord([660,990],.15,{type:'triangle',vol:.08,spread:.05});$('#wallet').textContent=money(stats.cash);shop(back);}});$('#back').onclick=back;
}
function start(level){
 sfx.unlock();game=new Heist(level,stats.gear);staticLayer=buildStatic();mode='play';hide();canvas.focus();keys.clear();stats.plays++;persist();
 const first=(level-1)%10===0&&level<=100;if(first){mode='brief';show(`<p class="eyebrow">Chapter ${chapterOf(level)+1}</p><h2>${CHAPTERS[chapterOf(level)].name}</h2><p>${CHAPTERS[chapterOf(level)].intro}</p><div class="row"><button class="primary" id="go">Start job ${level}</button></div>`);$('#go').onclick=()=>{mode='play';hide();canvas.focus();};}
}
function finish(){
 const g=game,won=g.status==='win';mode='result';sfx.stop();
 if(won){const prev=Number(stats.medals[g.level])||0;stats.medals[g.level]=Math.max(prev,g.stars);if(g.level===stats.cleared+1)stats.cleared++;stats.cash+=g.stolen;stats.stolen+=g.stolen;stats.best=Math.max(stats.best,g.score);persist();$('#wallet').textContent=money(stats.cash);}
 const next=won?g.level+1:g.level;
 show(won?`<p class="eyebrow">${g.level>100?'Endless job '+(g.level-100):'Job '+g.level} complete</p><h2>Clean getaway</h2><div class="stars">${stars(g.stars)}</div><ul class="medal-list"><li>★ Escaped with the target${g.level>3?'s':''}</li><li class="${g.ghost?'':'no'}">${g.ghost?'★':'☆'} Ghost — no alarm, never spotted</li><li class="${g.allLoot?'':'no'}">${g.allLoot?'★':'☆'} Took every piece of loot</li></ul><div class="stats"><div><small>Take</small><b>${money(g.stolen)}</b></div><div><small>Time</small><b>${Math.floor(g.time)}s</b></div><div><small>Score</small><b>${g.score.toLocaleString()}</b></div></div><div class="row"><button class="primary" id="next">${next===101&&g.level===100?'Enter endless mode':'Next job'}</button><button id="retry">Replay</button><button id="shop">Safehouse</button><button id="menu">Menu</button></div>${g.level===100?'<p>🎉 You finished the campaign! Endless jobs are now unlocked.</p>':''}`
  :`<p class="eyebrow">Job ${g.level>100?'E'+(g.level-100):g.level} failed</p><h2>Busted</h2><p>${g.message}</p><div class="row"><button class="primary" id="retry">Try again (R)</button><button id="shop">Safehouse</button><button id="menu">Menu</button></div>`);
 $('#next')&&($('#next').onclick=()=>start(next));$('#retry').onclick=()=>start(g.level);$('#menu').onclick=menu;$('#shop').onclick=()=>shop(finishBack);
}
function finishBack(){menu();}
function pause(){if(mode==='play'){mode='pause';sfx.pause(true);show(`<p class="eyebrow">Paused</p><h2>Lying low</h2><div class="row"><button class="primary" id="resume">Resume</button><button id="retry">Restart job</button><button id="menu">Quit to menu</button></div>`);$('#resume').onclick=resume;$('#retry').onclick=()=>{sfx.pause(false);start(game.level);};$('#menu').onclick=()=>{sfx.pause(false);menu();};}else if(mode==='pause')resume();}
function resume(){mode='play';sfx.pause(false);hide();canvas.focus();last=performance.now();}

/* ---------------- input ---------------- */
const MOVE={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]};
addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&(e.code==='Enter'||e.code==='Space'))return;if(MOVE[e.code]||e.code==='Space')e.preventDefault();if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);sfx.unlock();
 if(e.code==='KeyP'||e.code==='Escape')pause();if(e.code==='KeyR'&&(mode==='play'||mode==='result'))start(game.level);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(mode==='play')pause();});
$('#pause').onclick=()=>{if(mode==='play'||mode==='pause')pause();};
$('#sound').onclick=()=>{sfx.unlock();sfx.setMuted(!sfx.muted);sync();};$('#music').onclick=()=>{sfx.unlock();sfx.setMusic(!sfx.music);sync();};
function sync(){$('#sound').setAttribute('aria-pressed',String(!sfx.muted));$('#music').setAttribute('aria-pressed',String(sfx.music));$('#wallet').textContent=money(stats.cash);}

/* ---------------- loop ---------------- */
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;shake=Math.max(0,shake-dt*20);flash=Math.max(0,flash-dt*2);
 if(game){
  if(mode==='play'){let x=0,y=0;for(const k of keys)if(MOVE[k]){x+=MOVE[k][0];y+=MOVE[k][1];}
   game.step(dt,{x,y,sneak:keys.has('ShiftLeft')||keys.has('ShiftRight'),interact:keys.has('KeyE'),interactPressed:pressed.has('KeyE'),smoke:pressed.has('KeyQ'),decoy:pressed.has('KeyF'),emp:pressed.has('KeyC')});
   handleEvents();sfx.play(game.alarmed?CHASE:SNEAK);if(game.status!=='play')setTimeout(finish,game.status==='win'?300:700),mode='ending';}
  else if(mode==='ending')handleEvents();
  draw();
 }else{ctx.fillStyle='#05080e';ctx.fillRect(0,0,W,H);}
 pressed.clear();requestAnimationFrame(frame);
}
sync();game=new Heist(nextJob(),stats.gear);staticLayer=buildStatic();menu();requestAnimationFrame(frame);
window.__heist=()=>game;
