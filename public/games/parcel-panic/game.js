import {Packing,route,cells,CAMPAIGN,TOOLS} from './model.js';
import {Sfx} from './sfx.js';

const KEY='parcel-panic-prototype-v1',$=s=>document.querySelector(s),W=1000,H=640;
let save={v:1,best:0,plays:0,level:1,stars:{},classic:null,daily:null};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s==='object'){for(const k of ['best','plays','level'])if(Number.isFinite(s[k]))save[k]=Math.max(k==='level'?1:0,Math.floor(s[k]));if(s.stars&&typeof s.stars==='object')save.stars=s.stars;if(s.classic&&s.classic.mode)save.classic=s.classic;if(s.daily&&typeof s.daily==='object')save.daily=s.daily;}}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save));}catch{}};
const sfx=new Sfx('parcel-panic-settings-v1');
const SONG={bpm:100,wave:'triangle',vol:.035,bassWave:'sine',bassVol:.08,hat:true,hold:1.3,steps:[[72],[],[74],[76],[],[79],[],[76],[74],[],[72],[],[69],[],[72],[],[71],[],[72],[74],[],[77],[],[74],[72],[],[71],[],[67],[],[],[]],bass:[48,null,55,null,48,null,55,null,45,null,52,null,45,null,52,null,43,null,50,null,43,null,50,null,48,null,55,null,48,null,43,null]};
const COLORS=[null,'#e8604c','#f0b545','#6fbf73','#5fa3e0','#b48be8','#ef8fb8','#f3cf63','#c8ccd2'];
const canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay');
let g=null,mode='menu',sel=0,drag=null,hover=null,tool=null,cursor={x:0,y:0},kbd=false,time=0,last=performance.now(),parts=[],floats=[],flying=[],shake=0,today=dateKey();
function dateKey(){const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}

/* ---------- layout ---------- */
const L={get cell(){return Math.floor(540/g.size);},get bx(){return 60+(540-this.cell*g.size)/2;},get by(){return 60+(540-this.cell*g.size)/2;},tray:[{x:680,y:40,w:280,h:180},{x:680,y:230,w:280,h:180},{x:680,y:420,w:280,h:180}]};
function boardCell(px,py){const c=L.cell;return {x:Math.floor((px-L.bx)/c),y:Math.floor((py-L.by)/c)};}
function anchorFor(p,px,py){const cs=cells(p),w=Math.max(...cs.map(a=>a[0]))+1,h=Math.max(...cs.map(a=>a[1]))+1,c=L.cell;return {x:Math.round((px-L.bx)/c-w/2),y:Math.round((py-L.by)/c-h/2)};}

/* ---------- drawing ---------- */
function box(c,x,y,s,color,o={}){
 const pad=s*.05;c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x+pad+2,y+pad+3,s-pad*2,s-pad*2);
 const g2=c.createLinearGradient(x,y,x,y+s);g2.addColorStop(0,'#e8c493');g2.addColorStop(1,'#c99a5e');c.fillStyle=g2;c.beginPath();c.roundRect(x+pad,y+pad,s-pad*2,s-pad*2,s*.08);c.fill();
 c.strokeStyle='#8a6438';c.lineWidth=1;c.stroke();
 if(o.star){c.fillStyle='#f3cf63';c.beginPath();c.roundRect(x+pad,y+pad,s-pad*2,s-pad*2,s*.08);c.fill();c.fillStyle='#8a5a10';c.font=`900 ${s*.5}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText('★',x+s/2,y+s/2+1);c.textBaseline='alphabetic';return;}
 if(o.tape){c.fillStyle='#9aa3ad';c.fillRect(x+pad,y+pad,s-pad*2,s-pad*2);c.fillStyle='#dfe4ea';c.fillRect(x+s*.42,y+pad,s*.16,s-pad*2);if(o.tape>1)c.fillRect(x+pad,y+s*.42,s-pad*2,s*.16);else{c.fillStyle='#b8bec6';c.fillRect(x+pad,y+s*.42,s*.3,s*.16);}return;}
 c.fillStyle='#a87a44';c.fillRect(x+s*.44,y+pad,s*.12,s-pad*2);
 c.fillStyle=color;c.fillRect(x+s*.16,y+s*.62,s*.26,s*.18);c.fillStyle='#fff8';c.fillRect(x+s*.18,y+s*.66,s*.16,s*.03);c.fillRect(x+s*.18,y+s*.72,s*.12,s*.03);
}
function drawPiece(c,p,x,y,s,alpha=1){c.globalAlpha=alpha;for(const [a,b] of cells(p))box(c,x+a*s,y+b*s,s,COLORS[p.color]);c.globalAlpha=1;}
function draw(){
 const c=ctx;c.save();c.clearRect(0,0,W,H);if(shake>0)c.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 // depot backdrop
 const bg=c.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#3a2e22');bg.addColorStop(1,'#241c14');c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.fillStyle='#ffffff06';for(let i=0;i<W;i+=40)c.fillRect(i,0,2,H);
 // van cargo bay
 const s=L.cell,bx=L.bx,by=L.by,n=g.size;
 c.fillStyle='#d7dde3';c.beginPath();c.roundRect(bx-26,by-26,n*s+52,n*s+52,22);c.fill();c.fillStyle='#b8c0c8';c.fillRect(bx-26,by+n*s+8,n*s+52,18);
 c.fillStyle='#2a2f36';c.beginPath();c.roundRect(bx-10,by-10,n*s+20,n*s+20,10);c.fill();
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const j=g.i(x,y);c.fillStyle=(x+y)%2?'#353b44':'#3a414b';c.fillRect(bx+x*s+1,by+y*s+1,s-2,s-2);if(g.stamp[j]&&!g.board[j]){c.strokeStyle='#e8604c';c.lineWidth=2;c.beginPath();c.arc(bx+x*s+s/2,by+y*s+s/2,s*.28,0,7);c.stroke();c.fillStyle='#e8604c';c.font=`800 ${s*.18}px system-ui`;c.textAlign='center';c.fillText('BONUS',bx+x*s+s/2,by+y*s+s*.56);}}
 // clear preview
 const prev=previewInfo();const glow=new Set();if(prev&&prev.lines.length)for(const l of prev.lines)for(let t=0;t<n;t++)glow.add(l.row!=null?g.i(t,l.row):g.i(l.col,t));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const j=g.i(x,y),v=g.board[j];
  if(g.pillar[j]){c.fillStyle='#5a6270';c.beginPath();c.roundRect(bx+x*s+3,by+y*s+3,s-6,s-6,6);c.fill();c.strokeStyle='#7a8494';c.lineWidth=2;for(let k=0;k<3;k++){c.beginPath();c.moveTo(bx+x*s+8,by+y*s+10+k*(s-20)/2);c.lineTo(bx+x*s+s-8,by+y*s+10+k*(s-20)/2);c.stroke();}continue;}
  if(v)box(c,bx+x*s,by+y*s,s,COLORS[v],{star:v===7,tape:v===8?g.tape[j]:0});
  if(glow.has(j)){c.fillStyle=`rgba(255,240,170,${.25+.15*Math.sin(time*10)})`;c.fillRect(bx+x*s,by+y*s,s,s);}}
 // ghost
 if(prev){c.globalAlpha=.55;drawPiece(c,prev.p,bx+prev.x*s,by+prev.y*s,s);c.globalAlpha=1;if(!prev.ok){c.fillStyle='rgba(232,96,76,.35)';for(const [a,b] of cells(prev.p)){const x=prev.x+a,y=prev.y+b;if(x>=0&&y>=0&&x<n&&y<n)c.fillRect(bx+x*s,by+y*s,s,s);}}}
 if(tool&&hover){const {x,y}=hover;c.strokeStyle='#e8604c';c.lineWidth=3;const r=tool==='bomb'?1:0;c.strokeRect(bx+(x-r)*s,by+(y-r)*s,s*(r*2+1),s*(r*2+1));}
 if(kbd&&mode==='play'&&!drag){c.strokeStyle='#ffd08a';c.lineWidth=2;c.setLineDash([5,4]);c.strokeRect(bx+cursor.x*s+2,by+cursor.y*s+2,s-4,s-4);c.setLineDash([]);}
 // tray
 L.tray.forEach((t,i)=>{const p=g.tray[i];c.fillStyle=i===sel&&p?'#4a3a28':'#2e251c';c.strokeStyle=i===sel&&p?'#ffd08a':'#4a3c2c';c.lineWidth=2;c.beginPath();c.roundRect(t.x,t.y,t.w,t.h,14);c.fill();c.stroke();c.fillStyle='#bfae98';c.font='600 12px system-ui';c.textAlign='left';c.fillText(String(i+1),t.x+10,t.y+18);
  if(!p||drag?.slot===i)return;const cs=cells(p),w=Math.max(...cs.map(a=>a[0]))+1,h=Math.max(...cs.map(a=>a[1]))+1,ps=Math.min(40,(t.w-40)/w,(t.h-30)/h);const fit=g.canFitAnywhere(p);drawPiece(c,p,t.x+t.w/2-w*ps/2,t.y+t.h/2-h*ps/2,ps,fit?1:.35);if(!fit){c.fillStyle='#e8604c';c.font='600 11px system-ui';c.textAlign='right';c.fillText('no room',t.x+t.w-10,t.y+18);}});
 if(g.def||Number.isFinite(g.limit)){const left=Math.max(0,g.limit-g.placed);c.fillStyle='#bfae98';c.font='600 13px system-ui';c.textAlign='center';c.fillText(left+' parcels left in the order',820,625);}
 // dragged piece
 if(drag&&drag.moved){const p=g.tray[drag.slot];if(p){const cs=cells(p),w=Math.max(...cs.map(a=>a[0]))+1,h=Math.max(...cs.map(a=>a[1]))+1;drawPiece(c,p,drag.px-w*s/2,drag.py-h*s/2,s,.9);}}
 // fx
 for(const f of flying){c.save();c.translate(f.x,f.y);c.rotate(f.r);box(c,-s/2,-s/2,s,COLORS[f.c]||'#ccc',{star:f.c===7,tape:f.c===8?1:0});c.restore();}
 for(const p of parts){c.globalAlpha=Math.max(0,p.life);c.fillStyle=p.color;c.fillRect(p.x,p.y,p.s,p.s);}c.globalAlpha=1;
 for(const f of floats){c.globalAlpha=Math.max(0,1-f.t);c.font=`900 ${f.size||26}px system-ui`;c.textAlign='center';c.lineWidth=5;c.strokeStyle='#241c14';c.strokeText(f.text,f.x,f.y-f.t*50);c.fillStyle=f.color||'#ffd08a';c.fillText(f.text,f.x,f.y-f.t*50);}c.globalAlpha=1;
 if(g.stuck()&&mode==='play'){c.fillStyle='#000a';c.fillRect(bx-10,by+n*s/2-26,n*s+20,52);c.fillStyle='#ffd08a';c.font='700 16px system-ui';c.textAlign='center';c.fillText('Nothing fits! Use a tool to make room.',bx+n*s/2,by+n*s/2+6);}
 c.restore();
}
function previewInfo(){
 if(tool||mode!=='play')return null;let p,x,y;
 if(drag?.moved){p=g.tray[drag.slot];if(!p)return null;const a=anchorFor(p,drag.px,drag.py);x=a.x;y=a.y;}
 else if(kbd){p=g.tray[sel];if(!p)return null;x=cursor.x;y=cursor.y;}
 else if(hover&&g.tray[sel]&&hover.inBoard){p=g.tray[sel];const a=anchorFor(p,hover.px,hover.py);x=a.x;y=a.y;}
 else return null;
 const ok=g.fits(p,x,y);return {p,x,y,ok,lines:ok?g.previewClears(p,x,y):[]};
}

/* ---------- effects ---------- */
const NOTES=[523,587,659,784,880,1047,1175];
function handle(){for(const e of g.events.splice(0)){const s=L.cell;switch(e.kind){
 case 'place':sfx.noise(.07,{freq:700,vol:.14});sfx.tone(160,.08,{type:'sine',vol:.16});for(const [x,y] of e.cells)for(let i=0;i<3;i++)parts.push({x:L.bx+x*s+s/2,y:L.by+y*s+s,vx:(Math.random()-.5)*60,vy:-Math.random()*40,life:.6,s:3,color:'#d9b07a'});break;
 case 'clear':{shake=Math.min(10,3+e.lines.length*2);const f=NOTES[Math.min(NOTES.length-1,e.combo-1)];sfx.chord([f,f*1.25,f*1.5],.35,{type:'triangle',vol:.08,spread:.05});sfx.noise(.2,{freq:2500,vol:.08,filter:'highpass'});
  for(const [x,y,col] of e.cells){flying.push({x:L.bx+x*s+s/2,y:L.by+y*s+s/2,vx:400+Math.random()*300,vy:-200-Math.random()*200,r:0,vr:(Math.random()-.5)*8,c:col,t:0});for(let i=0;i<4;i++)parts.push({x:L.bx+x*s+s/2,y:L.by+y*s+s/2,vx:(Math.random()-.5)*300,vy:(Math.random()-.5)*300,life:1,s:4,color:COLORS[col]||'#ffd08a'});}
  const mid=e.cells[Math.floor(e.cells.length/2)];if(mid)floats.push({x:L.bx+mid[0]*s+s/2,y:L.by+mid[1]*s,t:0,text:'+'+e.gain+(e.combo>1?'  ×'+e.combo:''),size:e.lines.length>1?32:26});
  if(e.lines.length>=2)floats.push({x:L.bx+g.size*s/2,y:L.by+g.size*s/2,t:0,text:['','','DOUBLE DISPATCH!','TRIPLE DISPATCH!','MEGA DISPATCH!'][Math.min(4,e.lines.length)],color:'#fff',size:34});break;}
 case 'tool':sfx.chord([880,1320],.2,{type:'square',vol:.05,spread:.08});floats.push({x:820,y:30,t:0,text:'+1 '+TOOLS[e.tool].name,color:'#bfe8b8',size:20});break;
 case 'rotate':sfx.tone(700,.04,{type:'square',vol:.04});break;
 case 'hammer':case 'bomb':sfx.noise(.25,{freq:500,vol:.18});shake=6;break;
 case 'swap':case 'deal':sfx.tone(392,.08,{type:'triangle',vol:.06});sfx.tone(523,.1,{type:'triangle',vol:.06,delay:.06});break;
 case 'undo':sfx.tone(300,.1,{type:'triangle',vol:.07,slide:.7});break;
 case 'won':setTimeout(won,700);sfx.chord([523,659,784,1047,1319],.7,{type:'triangle',vol:.09,spread:.08});break;
 case 'lost':setTimeout(lost,700);sfx.tone(300,.6,{type:'sawtooth',vol:.07,slide:.5});break;
}}}

/* ---------- HUD ---------- */
function hud(){
 const label={classic:'Classic depot',route:'Route '+(g.def?.n||''),daily:'Daily route'}[g.mode];$('#mode-name').textContent=label;
 let html=g.def?.goals.some(x=>x.kind==='score')?'':`<div>Score<b>${g.score.toLocaleString()}</b></div>`;
 if(g.def){for(const goal of g.def.goals){const have=g.progress(goal),done=have>=goal.need;html+=`<div class="goal ${done?'done':''}">${{score:'Score',lines:'Dispatch lines',stars:'★ Priority boxes',tape:'Taped crates'}[goal.kind]}<b>${Math.min(have,goal.need).toLocaleString()} / ${goal.need.toLocaleString()}</b></div>`;}}
 else html+=`<div>Lines<b>${g.lines}</b></div><div>Streak<b>×${g.combo}</b></div><div>Best<b>${(g.mode==='daily'?(save.daily?.date===today?save.daily.best:0):save.best).toLocaleString()}</b></div>`;
 $('#hud').innerHTML=html;
 for(const k of ['hammer','bomb','swap']){$('#n-'+k).textContent=g.tools[k];$('#t-'+k).disabled=g.tools[k]<=0||mode!=='play';$('#t-'+k).classList.toggle('active',tool===k);}
 $('#undo').disabled=!g.undo||g.mode!=='classic'||mode!=='play';$('#undo').hidden=g.mode!=='classic';
}

/* ---------- modes ---------- */
function show(html){overlay.innerHTML=`<div class="card">${html}</div>`;overlay.hidden=false;}
function hide(){overlay.hidden=true;canvas.focus();}
function menu(){mode='menu';const ds=save.daily?.date===today?save.daily.best:0;const totalStars=Object.values(save.stars).reduce((a,b)=>a+(Number(b)||0),0);
 show(`<p class="eyebrow">The depot</p><h2>Parcel Panic</h2><p>Fit parcels into the van. Fill a row or column to dispatch it. Chain dispatches for streak multipliers and earn tools along the way. No timer — just a good fit.</p>
 <div class="modes"><div class="mode"><b>Classic</b><p>Endless packing. Parcels get bulkier the longer you last.</p><small>Best ${save.best.toLocaleString()}</small><div class="row"><button class="primary" id="m-classic">${save.classic?'Continue':'Start'}</button>${save.classic?'<button id="m-new">New van</button>':''}</div></div>
 <div class="mode"><b>Routes</b><p>${CAMPAIGN} delivery jobs with goals: priority boxes, taped crates, dispatch quotas and limited parcels.</p><small>${Math.min(CAMPAIGN,save.level-1)} / ${CAMPAIGN} cleared · ${totalStars} ★</small><div class="row"><button class="primary" id="m-routes">Choose a route</button></div></div>
 <div class="mode"><b>Daily route</b><p>Everyone gets the same 45 parcels today. How high can you score?</p><small>Today’s best ${ds.toLocaleString()}</small><div class="row"><button class="primary" id="m-daily">Play today’s route</button></div></div></div>`);
 $('#m-classic').onclick=()=>{if(save.classic){try{g=Packing.load(save.classic);}catch{g=new Packing({mode:'classic'});}}else g=new Packing({mode:'classic'});begin();};
 $('#m-new')&&($('#m-new').onclick=()=>{g=new Packing({mode:'classic'});begin();});
 $('#m-routes').onclick=routes;$('#m-daily').onclick=()=>{g=new Packing({mode:'daily',seed:today,limit:45,tools:{hammer:1,swap:1,bomb:1}});begin();};
}
function routes(){let html=`<p class="eyebrow">Routes</p><h2>Choose a route</h2><p>Stars depend on how many parcels you have left when you finish.</p><div class="grid">`;
 for(let n=1;n<=CAMPAIGN;n++){const s=Number(save.stars[n])||0;html+=`<button data-n="${n}" class="${n===save.level?'next':''}" ${n<=save.level?'':'disabled'}>${n}<small>${'★'.repeat(s)}</small></button>`;}
 html+=`</div><div class="row"><button id="back">Back</button></div>`;show(html);overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>startRoute(Number(b.dataset.n)));$('#back').onclick=menu;}
function startRoute(n){const def=route(n);g=new Packing({mode:'route',route:def,seed:n*7919,tools:{hammer:1,swap:1,bomb:0}});mode='brief';
 const goalText=def.goals.map(x=>({score:`Score ${x.need.toLocaleString()} points`,lines:`Dispatch ${x.need} lines`,stars:`Deliver ${x.need} ★ priority boxes (clear their row or column)`,tape:`Tear open ${x.need} taped crates (each needs two dispatches)`}[x.kind])).join('</li><li>');
 show(`<p class="eyebrow">Route ${n}</p><h2>Today’s delivery</h2><ul><li>${goalText}</li></ul><p>You have <b>${def.pieces}</b> parcels.${def.pillars.length?' Grey wheel wells never move, but they count toward full lines.':''}${def.stamps.length?' Clear a red BONUS stamp to earn a tool.':''}</p><div class="row"><button class="primary" id="go">Start route</button><button id="back">Back</button></div>`);
 $('#go').onclick=begin;$('#back').onclick=routes;}
function begin(){sfx.unlock();mode='play';sel=g.tray.findIndex(Boolean);tool=null;drag=null;parts=[];floats=[];flying=[];save.plays++;persist();hide();hud();}
function record(){if(g.mode==='classic'){save.best=Math.max(save.best,g.score);save.classic=g.status==='playing'?g.serialize():null;}if(g.mode==='daily'){save.best=Math.max(save.best,g.score);if(save.daily?.date!==today)save.daily={date:today,best:0};save.daily.best=Math.max(save.daily.best,g.score);}persist();}
function won(){mode='done';const n=g.def.n,s=g.starsEarned;save.stars[n]=Math.max(Number(save.stars[n])||0,s);if(n>=save.level)save.level=Math.min(CAMPAIGN,n)+1;persist();
 show(`<p class="eyebrow">Route ${n} delivered</p><h2>${s===3?'Perfectly packed!':'Delivered!'}</h2><div class="big-stars">${'★'.repeat(s)}<i>${'★'.repeat(3-s)}</i></div><div class="stats"><div><small>Score</small><b>${g.score.toLocaleString()}</b></div><div><small>Parcels left</small><b>${g.limit-g.placed}</b></div><div><small>Best streak</small><b>×${g.bestCombo}</b></div></div><div class="row">${n<CAMPAIGN?'<button class="primary" id="next">Next route</button>':''}<button id="again">Replay</button><button id="list">Routes</button></div>${n===CAMPAIGN?'<p>🎉 Every route delivered. The depot is yours.</p>':''}`);
 $('#next')&&($('#next').onclick=()=>startRoute(n+1));$('#again').onclick=()=>startRoute(n);$('#list').onclick=routes;}
function lost(){mode='done';record();
 if(g.mode==='route'){show(`<p class="eyebrow">Route ${g.def.n}</p><h2>Not quite.</h2><p>${g.reason||''} Try a different packing order — keep a gap for long parcels.</p><div class="row"><button class="primary" id="again">Try again</button><button id="list">Routes</button></div>`);$('#again').onclick=()=>startRoute(g.def.n);$('#list').onclick=routes;}
 else{show(`<p class="eyebrow">${g.mode==='daily'?'Daily route':'Classic'}</p><h2>The van is full.</h2><div class="stats"><div><small>Score</small><b>${g.score.toLocaleString()}</b></div><div><small>Lines</small><b>${g.lines}</b></div><div><small>Best streak</small><b>×${g.bestCombo}</b></div></div><p>${g.score>=save.best&&g.score>0?'🏆 A new best!':'Best: '+save.best.toLocaleString()}</p><div class="row"><button class="primary" id="again">${g.mode==='daily'?'Retry today’s route':'New van'}</button><button id="m">Modes</button></div>`);
  $('#again').onclick=()=>{g=g.mode==='daily'?new Packing({mode:'daily',seed:today,limit:45,tools:{hammer:1,swap:1,bomb:1}}):new Packing({mode:'classic'});begin();};$('#m').onclick=menu;}}

/* ---------- input ---------- */
function pt(e){const r=canvas.getBoundingClientRect();return {px:(e.clientX-r.left)/r.width*W,py:(e.clientY-r.top)/r.height*H};}
function trayAt(px,py){return L.tray.findIndex(t=>px>=t.x&&px<=t.x+t.w&&py>=t.y&&py<=t.y+t.h);}
function tryPlace(slot,x,y){if(g.place(slot,x,y)){sel=g.tray.findIndex(Boolean);record();hud();return true;}sfx.tone(150,.1,{type:'square',vol:.05});return false;}
canvas.addEventListener('pointerdown',e=>{sfx.unlock();if(mode!=='play')return;kbd=false;const p=pt(e),b=boardCell(p.px,p.py),inBoard=b.x>=0&&b.y>=0&&b.x<g.size&&b.y<g.size;
 if(e.button===2){if(g.tray[sel])g.rotate(sel);return;}
 if(tool){if(inBoard){const ok=tool==='hammer'?g.useHammer(b.x,b.y):g.useBomb(b.x,b.y);if(ok){tool=null;record();}else sfx.tone(150,.1,{type:'square',vol:.05});hud();}else{tool=null;hud();}return;}
 const slot=trayAt(p.px,p.py);if(slot>=0&&g.tray[slot]){sel=slot;drag={slot,px:p.px,py:p.py,sx:p.px,sy:p.py,moved:false,touch:e.pointerType==='touch'};canvas.setPointerCapture(e.pointerId);sfx.tone(500,.04,{type:'triangle',vol:.05});return;}
 if(inBoard&&g.tray[sel]){const a=anchorFor(g.tray[sel],p.px,p.py);tryPlace(sel,a.x,a.y);}
});
canvas.addEventListener('pointermove',e=>{const p=pt(e),b=boardCell(p.px,p.py);hover={...b,...p,inBoard:b.x>=0&&b.y>=0&&b.x<g?.size&&b.y<g?.size};if(drag){drag.px=p.px;drag.py=p.py-(drag.touch?L.cell*1.2:0);if(Math.hypot(p.px-drag.sx,p.py-drag.sy)>8)drag.moved=true;}});
canvas.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(d.moved){const p=g.tray[d.slot];if(p){const a=anchorFor(p,d.px,d.py);if(g.fits(p,a.x,a.y))tryPlace(d.slot,a.x,a.y);}}});
canvas.addEventListener('pointerleave',()=>{if(!drag)hover=null;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{if(mode==='play'&&g.tray[sel]){e.preventDefault();g.rotate(sel,e.deltaY>0?1:-1);}},{passive:false});
addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;sfx.unlock();if(mode!=='play')return;const k=e.code;
 if(['Digit1','Digit2','Digit3'].includes(k)){const s=Number(k.slice(5))-1;if(g.tray[s])sel=s;}
 else if(k==='KeyR'){if(g.tray[sel])g.rotate(sel);}
 else if(k.startsWith('Arrow')){e.preventDefault();kbd=true;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[k];cursor.x=Math.max(-2,Math.min(g.size-1,cursor.x+d[0]));cursor.y=Math.max(-2,Math.min(g.size-1,cursor.y+d[1]));}
 else if(k==='Enter'||k==='Space'){e.preventDefault();if(tool){const ok=tool==='hammer'?g.useHammer(cursor.x,cursor.y):g.useBomb(cursor.x,cursor.y);if(ok){tool=null;record();}}else if(g.tray[sel])tryPlace(sel,cursor.x,cursor.y);}
 else if(k==='KeyU'&&g.mode==='classic'){g.restoreUndo();sel=g.tray.findIndex(Boolean);}
 else if(k==='KeyH'&&g.tools.hammer>0)tool=tool==='hammer'?null:'hammer';else if(k==='KeyB'&&g.tools.bomb>0)tool=tool==='bomb'?null:'bomb';else if(k==='KeyN'){if(g.useSwap())record();}
 else if(k==='Escape'){tool=null;drag=null;}hud();});
$('#rotate').onclick=()=>{if(g.tray[sel])g.rotate(sel);};$('#t-hammer').onclick=()=>{tool=tool==='hammer'?null:'hammer';hud();};$('#t-bomb').onclick=()=>{tool=tool==='bomb'?null:'bomb';hud();};$('#t-swap').onclick=()=>{if(g.useSwap())record();hud();};$('#undo').onclick=()=>{g.restoreUndo();sel=g.tray.findIndex(Boolean);hud();};
$('#menu-btn').onclick=()=>{if(mode==='play')record();menu();};
$('#sound').onclick=()=>{sfx.unlock();sfx.setMuted(!sfx.muted);sync();};$('#music').onclick=()=>{sfx.unlock();sfx.setMusic(!sfx.music);sync();};
function sync(){$('#sound').setAttribute('aria-pressed',String(!sfx.muted));$('#music').setAttribute('aria-pressed',String(sfx.music));}

function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;shake=Math.max(0,shake-dt*30);
 if(g){const before=g.events.length;handle();if(before)hud();
  for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.life-=dt*1.5;}parts=parts.filter(p=>p.life>0);
  for(const f of flying){f.t+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=900*dt;f.r+=f.vr*dt;}flying=flying.filter(f=>f.t<1.2);
  for(const f of floats)f.t+=dt*.8;floats=floats.filter(f=>f.t<1);draw();}
 if(mode==='play')sfx.play(SONG);requestAnimationFrame(frame);}
addEventListener('visibilitychange',()=>{sfx.pause(document.hidden);if(document.hidden&&g&&mode==='play')record();});addEventListener('pagehide',()=>g&&mode==='play'&&record());
sync();g=new Packing({mode:'classic',seed:1});menu();hud();requestAnimationFrame(frame);
window.__pp=()=>g;
