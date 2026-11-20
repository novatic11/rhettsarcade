import {Game,CLUBS,CAMPAIGN,TABLES_PER_CLUB,clubOf,W,H,R,BORDER} from './model.js';
import {Sfx} from './sfx.js';

const KEY='ricochet-club-prototype-v1',$=s=>document.querySelector(s);
let save={v:1,best:0,plays:0,level:1,stars:{},scores:{}};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s==='object'){for(const k of ['best','plays','level'])if(Number.isFinite(s[k]))save[k]=Math.max(k==='level'?1:0,Math.floor(s[k]));if(s.stars&&typeof s.stars==='object')save.stars=s.stars;if(s.scores&&typeof s.scores==='object')save.scores=s.scores;}}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save));}catch{}};
const sfx=new Sfx('ricochet-club-settings-v1');
const SONG={bpm:76,wave:'sine',vol:.05,bassWave:'triangle',bassVol:.06,hold:2.4,steps:[[64,67],[],[71],[],[69],[],[67],[],[62,65],[],[69],[],[67],[],[64],[],[60,64],[],[67],[],[71],[],[72],[],[62,66],[],[69],[],[74],[],[71],[]],bass:[40,null,null,null,47,null,null,null,38,null,null,null,45,null,null,null,36,null,null,null,43,null,null,null,38,null,null,null,45,null,null,null]};

const canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay');
let game=null,mode='menu',aim={ang:-Math.PI/4,pow:.6,drag:false},keys=new Set(),time=0,last=performance.now(),parts=[],floats=[],shake=0,feltCache=null;

/* ---------- drawing ---------- */
function felt(club){
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d'),col=CLUBS[club].felt;
 c.fillStyle='#3a2416';c.beginPath();c.roundRect(0,0,W,H,22);c.fill();
 const wood=c.createLinearGradient(0,0,0,H);wood.addColorStop(0,'#6b4226');wood.addColorStop(.5,'#4a2c18');wood.addColorStop(1,'#6b4226');c.fillStyle=wood;c.beginPath();c.roundRect(4,4,W-8,H-8,20);c.fill();
 for(let i=0;i<60;i++){c.strokeStyle=`rgba(0,0,0,${Math.random()*.15})`;c.beginPath();const y=Math.random()*H;c.moveTo(0,y);c.bezierCurveTo(W/3,y+8,W*2/3,y-8,W,y);c.stroke();}
 const g=c.createRadialGradient(W/2,H/2,60,W/2,H/2,W*.6);g.addColorStop(0,shade(col,.12));g.addColorStop(1,shade(col,-.25));c.fillStyle=g;c.fillRect(BORDER-6,BORDER-6,W-2*BORDER+12,H-2*BORDER+12);
 for(let i=0;i<5000;i++){c.fillStyle=`rgba(255,255,255,${Math.random()*.025})`;c.fillRect(Math.random()*W,Math.random()*H,1,1);}
 c.strokeStyle='#00000055';c.lineWidth=6;c.strokeRect(BORDER-3,BORDER-3,W-2*BORDER+6,H-2*BORDER+6);
 c.fillStyle='#e3b86a';for(const [x,y] of [[BORDER-10,BORDER-10],[W-BORDER+10,BORDER-10],[BORDER-10,H-BORDER+10],[W-BORDER+10,H-BORDER+10],[W/2,BORDER-14],[W/2,H-BORDER+14]]){c.beginPath();c.arc(x,y,5,0,7);c.fill();}
 c.fillStyle='#ffffff10';c.font='italic 700 54px Georgia';c.textAlign='center';c.fillText(CLUBS[club].name,W/2,H/2+18);
 return cv;
}
function shade(hex,f){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=v=>Math.max(0,Math.min(255,Math.round(f>0?v+(255-v)*f:v*(1+f))));return `rgb(${m(r)},${m(g)},${m(b)})`;}
function star(c,x,y,r,rot){c.beginPath();for(let i=0;i<10;i++){const a=rot+i*Math.PI/5-Math.PI/2,rr=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();}
function draw(){
 const c=ctx,t=game.table;c.save();c.clearRect(0,0,W,H);if(shake>0)c.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 c.drawImage(feltCache,0,0);
 for(const s of t.sands){c.fillStyle='#d8c08a';c.globalAlpha=.55;c.beginPath();c.roundRect(s.x,s.y,s.w,s.h,18);c.fill();c.globalAlpha=1;c.fillStyle='#b89a5a55';for(let i=0;i<30;i++){c.fillRect(s.x+((i*53)%s.w),s.y+((i*37)%s.h),2,2);}}
 for(const b of t.boosts){c.save();c.translate(b.x+b.w/2,b.y+b.h/2);c.fillStyle='#ffffff14';c.beginPath();c.roundRect(-b.w/2,-b.h/2,b.w,b.h,8);c.fill();c.rotate(b.dir);for(let i=0;i<3;i++){const o=((time*1.5+i/3)%1)*30-15;c.strokeStyle=`rgba(120,255,210,${.9-Math.abs(o)/20})`;c.lineWidth=3;c.beginPath();c.moveTo(o-6,-9);c.lineTo(o+3,0);c.lineTo(o-6,9);c.stroke();}c.restore();}
 for(const w of t.wells){const g=c.createRadialGradient(w.x,w.y,4,w.x,w.y,w.reach);const col=w.power>0?'130,170,255':'255,150,120';g.addColorStop(0,`rgba(${col},.45)`);g.addColorStop(1,`rgba(${col},0)`);c.fillStyle=g;c.beginPath();c.arc(w.x,w.y,w.reach,0,7);c.fill();for(let i=0;i<3;i++){const rr=((w.power>0?1-((time*.5+i/3)%1):((time*.5+i/3)%1)))*w.reach*.6;c.strokeStyle=`rgba(${col},${.35*(1-rr/(w.reach*.6))})`;c.lineWidth=1.5;c.beginPath();c.arc(w.x,w.y,rr,0,7);c.stroke();}c.fillStyle='#0b0d18';c.beginPath();c.arc(w.x,w.y,9,0,7);c.fill();c.strokeStyle=`rgb(${col})`;c.lineWidth=2;c.stroke();}
 for(const h of t.holes){c.fillStyle='#000';c.beginPath();c.arc(h.x,h.y,h.r,0,7);c.fill();c.strokeStyle='#e3b86a';c.lineWidth=3;c.stroke();const g=c.createRadialGradient(h.x,h.y-3,1,h.x,h.y,h.r);g.addColorStop(0,'#000');g.addColorStop(1,'#222');c.fillStyle=g;c.beginPath();c.arc(h.x,h.y,h.r-2,0,7);c.fill();}
 for(const p of t.portals)for(const e of [p.a,p.b]){for(let i=0;i<4;i++){c.strokeStyle=`hsla(${p.hue+i*15},90%,${60+i*5}%,.8)`;c.lineWidth=2;c.beginPath();c.arc(e.x,e.y,8+i*3,time*3+i,time*3+i+Math.PI*1.3);c.stroke();}c.fillStyle=`hsla(${p.hue},90%,70%,.25)`;c.beginPath();c.arc(e.x,e.y,18,0,7);c.fill();}
 // walls
 c.lineCap='round';
 for(const s of t.walls.slice(4)){c.strokeStyle='#2a1a10';c.lineWidth=12;c.beginPath();c.moveTo(s.ax,s.ay);c.lineTo(s.bx,s.by);c.stroke();c.strokeStyle='#7a4c2c';c.lineWidth=8;c.stroke();c.strokeStyle='#a46c42';c.lineWidth=2;c.beginPath();c.moveTo(s.ax,s.ay-2);c.lineTo(s.bx,s.by-2);c.stroke();}
 for(const g of t.gates){const closed=t.gateClosed(g);c.strokeStyle=closed?'#e3b86a':'#e3b86a33';c.lineWidth=closed?7:2;c.setLineDash(closed?[]:[6,6]);c.beginPath();c.moveTo(g.ax,g.ay);c.lineTo(g.bx,g.by);c.stroke();c.setLineDash([]);c.fillStyle='#e3b86a';for(const [x,y] of [[g.ax,g.ay],[g.bx,g.by]]){c.beginPath();c.arc(x,y,4,0,7);c.fill();}}
 for(const s of t.switches){s.flash=Math.max(0,s.flash-.03);c.fillStyle='#3a2c18';c.beginPath();c.arc(s.x,s.y,13,0,7);c.fill();c.fillStyle=t.gateFlip?'#ffd98d':'#c08a3a';c.beginPath();c.arc(s.x,s.y,9+s.flash*3,0,7);c.fill();c.fillStyle='#fff6';c.beginPath();c.arc(s.x-3,s.y-3,3,0,7);c.fill();}
 for(const b of t.blocks)if(b.hp>0){c.fillStyle=b.hp>1?'rgba(170,220,255,.55)':'rgba(170,220,255,.3)';c.strokeStyle='#d8f0ff';c.lineWidth=1.5;c.beginPath();c.roundRect(b.x,b.y,b.w,b.h,3);c.fill();c.stroke();c.strokeStyle='#ffffff55';c.beginPath();c.moveTo(b.x+3,b.y+b.h*.7);c.lineTo(b.x+b.w*.6,b.y+3);c.stroke();if(b.hp===1){c.strokeStyle='#ffffff99';c.beginPath();c.moveTo(b.x+b.w*.3,b.y+b.h*.3);c.lineTo(b.x+b.w*.5,b.y+b.h*.5);c.lineTo(b.x+b.w*.4,b.y+b.h*.8);c.stroke();}}
 for(const b of t.bumpers){b.flash=Math.max(0,b.flash-.04);const g=c.createRadialGradient(b.x-b.r*.3,b.y-b.r*.3,2,b.x,b.y,b.r);g.addColorStop(0,'#fff');g.addColorStop(.5,b.flash?'#ffe6a8':'#c9c4cf');g.addColorStop(1,'#6a6274');c.fillStyle=g;c.beginPath();c.arc(b.x,b.y,b.r+b.flash*3,0,7);c.fill();c.strokeStyle='#e3b86a';c.lineWidth=2;c.stroke();c.fillStyle='#e05a7a';c.beginPath();c.arc(b.x,b.y,b.r*.35,0,7);c.fill();}
 // stars
 for(const s of game.stars){if(s.got){if(s.pop<1){s.pop+=.05;c.globalAlpha=1-s.pop;c.fillStyle='#ffe28a';star(c,s.x,s.y,14+s.pop*20,time);c.fill();c.globalAlpha=1;}continue;}c.shadowColor='#ffd86a';c.shadowBlur=14;c.fillStyle='#ffd86a';star(c,s.x,s.y,13+Math.sin(time*3+s.x)*1.5,Math.sin(time+s.y)*.3);c.fill();c.shadowBlur=0;c.fillStyle='#fff8d0';star(c,s.x,s.y,5,0);c.fill();}
 // aim guide
 if(mode==='play'&&game.status==='aim'){const maxLen=Math.max(220,620-game.club*55)*(aim.pow*.6+.4);const pts=game.preview(aim.ang,aim.pow,maxLen);let n=0;for(let i=1;i<pts.length;i++){const p=pts[i];if(!p)continue;if(i%3)continue;n++;c.fillStyle=`rgba(255,255,255,${Math.max(.05,.75-n*.012)})`;c.beginPath();c.arc(p.x,p.y,2.2,0,7);c.fill();}
  const bx=game.ball.x,by=game.ball.y;c.strokeStyle='#e3b86a';c.lineWidth=3;c.beginPath();c.moveTo(bx-Math.cos(aim.ang)*16,by-Math.sin(aim.ang)*16);c.lineTo(bx-Math.cos(aim.ang)*(16+aim.pow*70),by-Math.sin(aim.ang)*(16+aim.pow*70));c.stroke();
  c.fillStyle='#0008';c.fillRect(bx-24,by+18,48,6);c.fillStyle=`hsl(${120-aim.pow*120},80%,60%)`;c.fillRect(bx-24,by+18,48*aim.pow,6);}
 // ball
 for(let i=0;i<game.trail.length;i++){const p=game.trail[i];c.fillStyle=`rgba(255,255,255,${i/game.trail.length*.25})`;c.beginPath();c.arc(p.x,p.y,R*i/game.trail.length,0,7);c.fill();}
 const b=game.ball;c.fillStyle='#0006';c.beginPath();c.ellipse(b.x+3,b.y+4,R,R*.8,0,0,7);c.fill();const bg=c.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,R);bg.addColorStop(0,'#fff');bg.addColorStop(.6,'#ece6f0');bg.addColorStop(1,'#9a90a6');c.fillStyle=bg;c.beginPath();c.arc(b.x,b.y,R,0,7);c.fill();c.strokeStyle='#e05a7a';c.lineWidth=1.5;c.beginPath();c.arc(b.x,b.y,R*.55,time*4,time*4+2);c.stroke();
 for(const p of parts){c.fillStyle=p.color;c.globalAlpha=Math.max(0,p.life);c.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);}c.globalAlpha=1;
 for(const f of floats){c.globalAlpha=Math.max(0,1-f.t);c.fillStyle='#ffe28a';c.font='800 18px Georgia';c.textAlign='center';c.fillText(f.text,f.x,f.y-f.t*40);}c.globalAlpha=1;
 c.restore();
}
function burst(x,y,color,n=14,sp=160){for(let i=0;i<n;i++){const a=Math.random()*7,s=Math.random()*sp;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,s:2+Math.random()*3,color});}}

/* ---------- events / sound ---------- */
const PENT=[523,587,659,784,880,1047,1175,1319,1568];
function handle(){for(const e of game.events.splice(0)){switch(e.kind){
 case 'shoot':sfx.noise(.06,{freq:2500,vol:.12});sfx.tone(180,.08,{type:'sine',vol:.15});break;
 case 'wall':case 'gate':if(e.speed>40)sfx.tone(240+Math.random()*40,.06,{type:'triangle',vol:Math.min(.16,e.speed/2500)});break;
 case 'glass':sfx.tone(1800,.05,{type:'triangle',vol:.06});break;
 case 'shatter':sfx.noise(.3,{filter:'highpass',freq:3000,vol:.14});burst(e.ref.x+e.ref.w/2,e.ref.y+e.ref.h/2,'#cfeaff',22,200);shake=4;break;
 case 'bumper':sfx.tone(660,.12,{type:'square',vol:.07,slide:1.5});burst(game.ball.x,game.ball.y,'#ffe6a8',6,90);break;
 case 'switch':sfx.chord([392,523],.12,{type:'square',vol:.05,spread:.04});break;
 case 'portal':sfx.tone(300,.25,{type:'sine',vol:.12,slide:3});break;
 case 'star':{const f=PENT[Math.min(PENT.length-1,e.combo-1)];sfx.tone(f,.25,{type:'triangle',vol:.14});sfx.tone(f*1.5,.3,{type:'sine',vol:.06,delay:.05});burst(e.ref.x,e.ref.y,'#ffd86a',16);floats.push({x:e.ref.x,y:e.ref.y-10,t:0,text:e.combo>1?'×'+e.combo:'★'});break;}
 case 'sunk':sfx.tone(400,.4,{type:'sine',vol:.12,slide:.3});floats.push({x:game.ball.x,y:game.ball.y-14,t:0,text:'Pocketed!'});break;
 case 'won':setTimeout(won,500);sfx.chord([523,659,784,1047],.7,{type:'triangle',vol:.1,spread:.09});break;
 case 'lost':setTimeout(lost,500);sfx.tone(300,.5,{type:'triangle',vol:.1,slide:.6});break;
}}}

/* ---------- menus ---------- */
function show(html){overlay.innerHTML=`<div class="card">${html}</div>`;overlay.hidden=false;}
function hideOverlay(){overlay.hidden=true;canvas.focus();}
const highest=()=>Math.max(1,save.level);
function menu(){mode='menu';const n=highest(),club=clubOf(Math.min(n,CAMPAIGN));const total=Object.values(save.stars).reduce((a,b)=>a+(Number(b)||0),0);
 show(`<p class="eyebrow">${n>CAMPAIGN?'Endless tables':CLUBS[club].name}</p><h2>Ricochet Club</h2><p>One marble. A table full of angles. Bank your shot off rails, bumpers and portals to collect every star. Eight clubs with ten tables each, then endless generated tables that keep getting harder.</p>
 <div class="stats"><div><small>Tables cleared</small><b>${Math.min(CAMPAIGN,n-1)} / ${CAMPAIGN}</b></div><div><small>Stars</small><b>${total} / ${CAMPAIGN*3}</b></div><div><small>Best table score</small><b>${save.best.toLocaleString()}</b></div></div>
 <div class="row"><button class="primary" id="go">${n>CAMPAIGN?'Endless table '+(n-CAMPAIGN):'Play table '+n}</button><button id="pick">Choose a table</button></div>`);
 $('#go').onclick=()=>start(n);$('#pick').onclick=pick;}
function pick(){let html='<p class="eyebrow">The clubs</p><h2>Choose a table</h2><p>3 stars for clearing at par, 2 for one over.</p><div class="clubs">';
 for(let c=0;c<CLUBS.length;c++){const first=c*TABLES_PER_CLUB+1;if(first>highest())break;const got=Array.from({length:10},(_,i)=>Number(save.stars[first+i])||0).reduce((a,b)=>a+b,0);
  html+=`<div class="club"><h3>${c+1}. ${CLUBS[c].name}<small>${got} / 30 ★</small></h3><div class="grid">`;for(let i=0;i<10;i++){const n=first+i,s=Number(save.stars[n])||0;html+=`<button data-n="${n}" class="${n===highest()?'next':''}" ${n<=highest()?'':'disabled'}>${n}<small>${'★'.repeat(s)}</small></button>`;}html+='</div></div>';}
 html+=`</div><div class="row"><button id="back">Back</button>${highest()>CAMPAIGN?`<button class="primary" id="endless">Endless table ${highest()-CAMPAIGN}</button>`:''}</div>`;show(html);
 overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>start(Number(b.dataset.n)));$('#back').onclick=menu;$('#endless')&&($('#endless').onclick=()=>start(highest()));}
function start(n){sfx.unlock();game=new Game(n);feltCache=felt(game.club);aim={ang:Math.atan2(H/2-game.ball.y,W/2-game.ball.x),pow:.6,drag:false};mode='play';parts=[];floats=[];save.plays++;persist();
 if((n-1)%TABLES_PER_CLUB===0&&n<=CAMPAIGN){mode='brief';show(`<p class="eyebrow">Club ${game.club+1}</p><h2>${CLUBS[game.club].name}</h2><p>${CLUBS[game.club].intro}</p><div class="row"><button class="primary" id="go">Play table ${n}</button></div>`);$('#go').onclick=()=>{mode='play';hideOverlay();};}else hideOverlay();readout();}
function won(){mode='done';const n=game.n,s=game.starsEarned,score=game.score;save.stars[n]=Math.max(Number(save.stars[n])||0,s);save.scores[n]=Math.max(Number(save.scores[n])||0,score);save.best=Math.max(save.best,score);if(n>=save.level)save.level=n+1;persist();
 show(`<p class="eyebrow">${n>CAMPAIGN?'Endless table '+(n-CAMPAIGN):'Table '+n} cleared</p><h2>${s===3?'A beautiful angle.':s===2?'Nicely done.':'Cleared!'}</h2><div class="big-stars">${'★'.repeat(s)}<i>${'★'.repeat(3-s)}</i></div><div class="stats"><div><small>Shots</small><b>${game.shots} <small style="display:inline">/ par ${game.def.par}</small></b></div><div><small>Score</small><b>${score.toLocaleString()}</b></div><div><small>Best here</small><b>${save.scores[n].toLocaleString()}</b></div></div>
 <div class="row"><button class="primary" id="next">Next table</button><button id="again">Replay</button><button id="tables2">Tables</button></div>${n===CAMPAIGN?'<p>🎉 Every club conquered. Endless tables are open.</p>':''}`);
 $('#next').onclick=()=>start(n+1);$('#again').onclick=()=>start(n);$('#tables2').onclick=pick;}
function lost(){mode='done';show(`<p class="eyebrow">Out of shots</p><h2>So close.</h2><p>${game.left} star${game.left>1?'s':''} left on the table. Par is ${game.def.par} shot${game.def.par>1?'s':''} — there is always a route.</p><div class="row"><button class="primary" id="again">Try again</button><button id="tables2">Tables</button></div>`);$('#again').onclick=()=>start(game.n);$('#tables2').onclick=pick;}
function readout(){if(!game)return;$('#club-name').textContent=CLUBS[game.club].name;$('#readout').innerHTML=`<div>Table<b>${game.n>CAMPAIGN?'E'+(game.n-CAMPAIGN):game.n}</b></div><div>Stars left<b>${game.left} / ${game.stars.length}</b></div><div>Shots<b>${game.shots} / ${game.budget}</b></div><div>Par<b>${game.def.par}</b></div><div>Power<b>${Math.round(aim.pow*100)}%</b></div>`;}

/* ---------- input ---------- */
function pt(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
function setAim(p){const dx=p.x-game.ball.x,dy=p.y-game.ball.y;if(Math.hypot(dx,dy)<4)return;aim.ang=Math.atan2(dy,dx);aim.pow=Math.min(1,Math.max(.08,Math.hypot(dx,dy)/260));}
canvas.addEventListener('pointerdown',e=>{sfx.unlock();if(mode!=='play'||game.status!=='aim')return;canvas.setPointerCapture(e.pointerId);aim.drag=true;setAim(pt(e));});
canvas.addEventListener('pointermove',e=>{if(aim.drag)setAim(pt(e));});
canvas.addEventListener('pointerup',e=>{if(!aim.drag)return;aim.drag=false;setAim(pt(e));if(aim.pow>.09)game.shoot(aim.ang,aim.pow);readout();});
canvas.addEventListener('pointercancel',()=>aim.drag=false);
addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;sfx.unlock();keys.add(e.code);if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
 if(e.code==='Space'&&mode==='play'&&game.status==='aim'){game.shoot(aim.ang,aim.pow);readout();}if(e.code==='KeyR'&&game&&mode!=='menu')start(game.n);});
addEventListener('keyup',e=>keys.delete(e.code));
$('#restart').onclick=()=>game&&start(game.n);$('#tables').onclick=()=>{sfx.unlock();pick();};
$('#sound').onclick=()=>{sfx.unlock();sfx.setMuted(!sfx.muted);sync();};$('#music').onclick=()=>{sfx.unlock();sfx.setMusic(!sfx.music);sync();};
function sync(){$('#sound').setAttribute('aria-pressed',String(!sfx.muted));$('#music').setAttribute('aria-pressed',String(sfx.music));}

function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;shake=Math.max(0,shake-dt*25);
 if(game){if(mode==='play'){const fine=keys.has('ShiftLeft')||keys.has('ShiftRight')?.25:1;if(keys.has('ArrowLeft'))aim.ang-=dt*1.4*fine;if(keys.has('ArrowRight'))aim.ang+=dt*1.4*fine;if(keys.has('ArrowUp'))aim.pow=Math.min(1,aim.pow+dt*.6);if(keys.has('ArrowDown'))aim.pow=Math.max(.08,aim.pow-dt*.6);const before=game.status;game.update(dt);handle();if(before!==game.status||keys.size)readout();}
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.life-=dt*1.6;}parts=parts.filter(p=>p.life>0);for(const f of floats)f.t+=dt;floats=floats.filter(f=>f.t<1);
  draw();}
 if(mode==='play'||mode==='brief')sfx.play(SONG);
 requestAnimationFrame(frame);}
addEventListener('visibilitychange',()=>sfx.pause(document.hidden));
sync();game=new Game(Math.min(highest(),CAMPAIGN+50));feltCache=felt(game.club);menu();readout();requestAnimationFrame(frame);
window.__rc=()=>game;
