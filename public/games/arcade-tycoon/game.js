import {Tycoon,SAVE_KEY,SETTINGS_KEY,TYPES,LOCATIONS,STAFF,IMPROVEMENTS,CAMPAIGNS,EVENTS,MILESTONES,KINDS,DAY_LENGTH} from './model.js';
import {drawItem,drawPerson,drawThought,shade} from './art.js';
import {Sfx} from './sfx.js';

const $=s=>document.querySelector(s),money=v=>'$'+Math.floor(v).toLocaleString();
const sfx=new Sfx(SETTINGS_KEY);
const SONG={bpm:112,wave:'square',vol:.018,bassWave:'triangle',bassVol:.05,hat:true,hold:1.2,
 steps:[[72],[],[76],[79],[],[76],[74],[],[72],[],[76],[79],[81],[],[79],[],[69],[],[72],[76],[],[72],[74],[],[71],[],[74],[77],[79],[],[77],[]],
 bass:[48,null,48,null,55,null,55,null,48,null,48,null,53,null,55,null,45,null,45,null,52,null,52,null,43,null,43,null,47,null,50,null]};

let game,storageOK=true;
try{const raw=localStorage.getItem(SAVE_KEY);game=raw?Tycoon.load(raw):new Tycoon();}
catch{try{const raw=localStorage.getItem(SAVE_KEY);if(raw)localStorage.setItem('arcade-tycoon-unreadable-backup-'+Date.now(),raw);}catch{storageOK=false;}game=new Tycoon();game.note('Your previous save could not be opened, so a backup was kept and a fresh arcade started.');}
game.open=false;
function save(){if(!storageOK)return;try{localStorage.setItem(SAVE_KEY,game.serialize());}catch{storageOK=false;}}

const canvas=$('#floor'),ctx=canvas.getContext('2d');
let shownLevel=-1,speed=1,cat='games',tool=null,rot=0,moving=null,selected=null,hover=null,view={s:40,ox:0,oy:0},time=0,last=performance.now(),uiTimer=0,saveTimer=0,floats=[];

/* ---------- toasts ---------- */
function toast(text,kind=''){const el=document.createElement('div');el.className='toast '+kind;el.textContent=text;$('#toasts').append(el);setTimeout(()=>el.remove(),3800);while($('#toasts').children.length>4)$('#toasts').firstChild.remove();}
function attempt(fn,ok){try{const r=fn();if(ok)toast(ok,'good');sfx.tone(880,.08,{type:'triangle',vol:.12});sfx.tone(1320,.1,{type:'triangle',vol:.1,delay:.06});refreshAll();return r||true;}catch(e){toast(e.message,'bad');sfx.tone(180,.15,{type:'sawtooth',vol:.08});return false;}}

/* ---------- shop ---------- */
function icon(type){const cv=document.createElement('canvas'),t=TYPES[type],ww=t.w||1;cv.width=76;cv.height=76;const c=cv.getContext('2d'),s=76/Math.max(ww,1);c.translate(0,(76-s)/2);drawItem(c,type,s,{time:1.3});return cv;}
const icons={};
function buildShop(){
 const box=$('#shop');box.textContent='';
 for(const [key,t] of Object.entries(TYPES)){if(t.cat!==cat)continue;const locked=!game.unlocked(key),b=document.createElement('button');b.className='shop-item'+(tool===key?' on':'')+(locked?' locked':'');b.dataset.type=key;
  icons[key]??=icon(key);const ic=icons[key].cloneNode();ic.getContext('2d').drawImage(icons[key],0,0);b.append(ic);
  const info=document.createElement('div');info.innerHTML=`<b>${t.name}</b><small>${locked?'Unlocks at '+LOCATIONS[t.unlock].name:t.desc}</small>`+(t.price&&t.cat!=='decor'?`<small>Plays at $${t.price} · ${t.seats>1?t.seats+' players':'1 player'}</small>`:'');b.append(info);
  const p=document.createElement('span');p.className='price';p.textContent=money(t.cost);b.append(p);
  b.disabled=locked;b.onclick=()=>{sfx.unlock();tool=tool===key?null:key;moving=null;rot=0;buildShop();};box.append(b);}
 refreshShopAfford();
}
function refreshShopAfford(){for(const b of document.querySelectorAll('.shop-item')){const t=TYPES[b.dataset.type];b.querySelector('.price').style.color=game.cash>=t.cost?'':'#ff8a8a';}}
document.querySelectorAll('.build .tabs button').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;document.querySelectorAll('.build .tabs button').forEach(x=>x.classList.toggle('on',x===b));buildShop();});

/* ---------- layout & drawing ---------- */
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,r.width*dpr);canvas.height=Math.max(1,r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const W=r.width,H=r.height,s=Math.max(14,Math.min((W-24)/game.w,(H-24)/(game.h+1.6)));view={s,ox:(W-game.w*s)/2,oy:(H-(game.h+1.6)*s)/2+s*1.1,W,H};}
new ResizeObserver(resize).observe(canvas);
function tileAt(e){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left-view.ox)/view.s,y=(e.clientY-r.top-view.oy)/view.s;return {x:Math.floor(x),y:Math.floor(y),fx:x,fy:y};}

function draw(){
 const {s,ox,oy,W,H}=view,c=ctx;c.clearRect(0,0,W,H);
 const bg=c.createRadialGradient(W/2,H/2,50,W/2,H/2,Math.max(W,H));bg.addColorStop(0,'#1a2440');bg.addColorStop(1,'#0b101d');c.fillStyle=bg;c.fillRect(0,0,W,H);
 c.save();c.translate(ox,oy);
 const theme=['#2a2350','#23324f','#203d4a','#3a2a3e','#272a52','#3b2a20'][game.level];
 // back wall
 const wh=s*1.1;const wg=c.createLinearGradient(0,-wh,0,0);wg.addColorStop(0,shade(theme,-.35));wg.addColorStop(1,shade(theme,.08));c.fillStyle=wg;c.fillRect(-s*.15,-wh,game.w*s+s*.3,wh);
 for(let i=0;i<game.w;i+=2){const hue=(i*47+game.level*60)%360,glow=.5+.5*Math.sin(time*2+i);c.fillStyle=`hsla(${hue},80%,${55+glow*15}%,.9)`;c.beginPath();c.roundRect(i*s+s*.35,-wh*.78,s*1.3,wh*.42,6);c.fill();c.fillStyle='#0b0f1a';c.font=`800 ${s*.2}px system-ui`;c.textAlign='center';c.fillText(['PLAY','WIN','HI-SCORE','1UP','BONUS','INSERT ¢','GAME ON','TICKETS','LEVEL UP'][(i/2+game.level)%9],i*s+s,-wh*.5);}
 c.fillStyle='#0008';c.fillRect(-s*.15,-s*.12,game.w*s+s*.3,s*.12);
 // floor carpet
 for(let y=0;y<game.h;y++)for(let x=0;x<game.w;x++){c.fillStyle=(x+y)%2?shade(theme,-.12):shade(theme,-.02);c.fillRect(x*s,y*s,s,s);c.fillStyle='rgba(255,255,255,.035)';const k=(x*7+y*13)%5;c.beginPath();c.arc(x*s+s*(.2+k*.15),y*s+s*(.3+((k*3)%5)*.12),s*.05,0,7);c.fill();c.strokeStyle=`hsla(${(x*40+y*30)%360},80%,70%,.05)`;c.beginPath();c.moveTo(x*s,y*s+s*.5);c.lineTo(x*s+s*.5,y*s);c.stroke();}
 c.strokeStyle='#0006';c.lineWidth=1;for(let x=0;x<=game.w;x++){c.beginPath();c.moveTo(x*s,0);c.lineTo(x*s,game.h*s);c.stroke();}for(let y=0;y<=game.h;y++){c.beginPath();c.moveTo(0,y*s);c.lineTo(game.w*s,y*s);c.stroke();}
 // door
 const d=game.door;c.fillStyle=game.open?'#ffd27a33':'#ffffff10';c.fillRect(d.x*s,d.y*s,s,s);c.fillStyle=game.open?'#ffd27a':'#556';c.fillRect(d.x*s-s*.1,game.h*s,s*1.2,s*.12);c.fillStyle='#fff8';c.font=`700 ${s*.18}px system-ui`;c.textAlign='center';c.fillText(game.open?'OPEN':'CLOSED',d.x*s+s/2,game.h*s+s*.36);
 c.strokeStyle='#ffffff22';c.lineWidth=3;c.strokeRect(-1.5,-1.5,game.w*s+3,game.h*s+3);
 // litter
 for(const l of game.litter){c.fillStyle='#d9d3c0';c.beginPath();c.ellipse(l.x*s,l.y*s,s*.07,s*.05,l.id,0,7);c.fill();c.fillStyle='#c0543a';c.fillRect(l.x*s-s*.02,l.y*s-s*.06,s*.08,s*.05);}
 // items + people sorted by y for depth
 const draws=[];
 for(const it of game.items){const t=TYPES[it.type];draws.push({y:it.y+(it.rot?(t.w||1):1)-.01,f:()=>{c.save();c.translate(it.x*s,it.y*s);drawItem(c,it.type,s,{rot:it.rot,time:time+it.id*.7,broken:it.broken,busy:it.users.length>0});if(it===selected?.ref){c.strokeStyle='#ffd27a';c.lineWidth=2.5;c.setLineDash([6,4]);c.strokeRect(1,1,(it.rot?1:(t.w||1))*s-2,(it.rot?(t.w||1):1)*s-2);c.setLineDash([]);}
  if(!it.broken&&t.cat!=='decor'&&it.condition<40){c.fillStyle='#ff9a3c';c.fillRect(s*.1,s*.04,s*.8*it.condition/100,s*.05);}
  if(it.level>1){c.fillStyle='#ffd27a';c.font=`800 ${s*.17}px system-ui`;c.textAlign='left';c.fillText('★'.repeat(it.level-1),s*.06,s*.98);}
  c.restore();}});}
 for(const p of game.customers)draws.push({y:p.y,f:()=>{drawPerson(c,p,s,time,{kid:p.kind==='kid',shirt:p.shirt,still:p.state==='queue'||p.state==='play'||p.state==='think',critic:p.critic,selected:selected?.ref===p});}});
 for(const p of game.staff)draws.push({y:p.y,f:()=>{drawPerson(c,p,s,time,{shirt:{mechanic:'#ff9a3c',janitor:'#4fa25a',host:'#ff7ad9',mascot:'#ffd27a'}[p.role],hat:{mechanic:'#c25a12',janitor:'#2f6b38',host:'#b03a8a'}[p.role],mascot:p.role==='mascot',still:!p.path.length,selected:selected?.ref===p});if(p.working){c.font=`${s*.25}px system-ui`;c.textAlign='center';c.fillText(p.role==='mechanic'?'🔧':'🧹',p.x*s+s*.25,p.y*s-s*.3+Math.sin(time*12)*2);}}});
 draws.sort((a,b)=>a.y-b.y).forEach(d=>d.f());
 for(const p of game.customers){if(p.thoughtTime>0&&p.thought)drawThought(c,p.x,p.y,s,p.thought);else if(p.state!=='play'){const need=['hunger','thirst','bladder'].find(n=>p[n]>85)||(p.energy<15?'energy':null);if(need&&Math.sin(time*2+p.id)>.6)drawThought(c,p.x,p.y,s,need);}}
 // placement ghost
 const placing=tool||moving;if(placing&&hover){const type=moving?moving.type:tool,why=game.canPlace(type,hover.x,hover.y,rot,moving||null),t=TYPES[type],w=(rot?1:(t.w||1)),h=(rot?(t.w||1):1);c.save();c.globalAlpha=.65;c.translate(hover.x*s,hover.y*s);drawItem(c,type,s,{rot,time});c.globalAlpha=1;c.fillStyle=why||(!moving&&game.cash<t.cost)?'rgba(255,80,80,.3)':'rgba(120,255,170,.25)';c.fillRect(0,0,w*s,h*s);c.restore();
  if(why){c.fillStyle='#000a';const tw=c.measureText(why).width;c.font=`600 13px system-ui`;c.fillRect(hover.x*s-4,hover.y*s-24,c.measureText(why).width+12,20);c.fillStyle='#ffb0b0';c.textAlign='left';c.fillText(why,hover.x*s+2,hover.y*s-9);}}
 // floating coins
 for(const f of floats){c.globalAlpha=Math.max(0,1-f.t/1.4);c.fillStyle=f.color||'#ffd27a';c.font=`800 ${Math.max(11,s*.26)}px system-ui`;c.textAlign='center';c.strokeStyle='#0009';c.lineWidth=3;c.strokeText(f.text,f.x*s,f.y*s-f.t*s*.6);c.fillText(f.text,f.x*s,f.y*s-f.t*s*.6);}c.globalAlpha=1;
 c.restore();
 if(!game.open&&!game.customers.length&&game.items.some(i=>TYPES[i.type].cat==='games')){c.fillStyle='#0007';c.fillRect(0,H-34,W,34);c.fillStyle='#ffe3a3';c.font='600 14px system-ui';c.textAlign='center';c.fillText('Doors closed — time is stopped. Open the doors to start the day.',W/2,H-12);}
}

/* ---------- input ---------- */
canvas.addEventListener('pointermove',e=>{const t=tileAt(e);hover=game.inside(t.x,t.y)?t:null;});
canvas.addEventListener('pointerleave',()=>hover=null);
canvas.addEventListener('pointerdown',e=>{
 sfx.unlock();canvas.focus();const t=tileAt(e);if(e.button===2){tool=null;moving=null;buildShop();return;}
 if(tool){if(!game.inside(t.x,t.y))return;const it=attempt(()=>game.place(tool,t.x,t.y,rot));if(it){sfx.noise(.08,{freq:900,vol:.15});floats.push({x:t.x+.5,y:t.y+.3,t:0,text:'-'+money(TYPES[tool].cost),color:'#ff9a9a'});if(!e.shiftKey&&game.cash<TYPES[tool].cost){tool=null;buildShop();}}return;}
 if(moving){if(attempt(()=>game.move(moving.id,t.x,t.y,rot),'Moved.')){moving=null;}return;}
 // select: people first, then items
 const near=(list)=>list.find(p=>Math.hypot(p.x-t.fx,p.y-.15-t.fy)<.38);
 const person=near(game.staff)||near(game.customers);if(person){selected={kind:game.staff.includes(person)?'staff':'customer',ref:person};renderInspect();return;}
 const it=game.itemAt(t.x,t.y);selected=it?{kind:'item',ref:it}:null;renderInspect();
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.target.closest?.('dialog'))return;if(e.key==='Escape'){tool=null;moving=null;selected=null;buildShop();renderInspect();}if(e.key==='r'||e.key==='R')rot=rot?0:1;if(e.key===' '&&document.activeElement===canvas){e.preventDefault();setSpeed(speed?0:1);}});

/* ---------- top bar ---------- */
function setSpeed(v){speed=v;document.querySelectorAll('.speed button').forEach(b=>b.classList.toggle('on',Number(b.dataset.speed)===v));sfx.pause(v===0);}
document.querySelectorAll('.speed button').forEach(b=>b.onclick=()=>{sfx.unlock();setSpeed(Number(b.dataset.speed));});
$('#doors').onclick=()=>{sfx.unlock();if(!game.items.some(i=>TYPES[i.type].cat==='games')){toast('Build at least one attraction first.','bad');return;}game.toggleOpen();sfx.chord(game.open?[523,659,784]:[392,330],.25,{type:'triangle',vol:.1,spread:.07});if(game.open&&speed===0)setSpeed(1);refreshAll();};
$('#sound').onclick=()=>{sfx.unlock();sfx.setMuted(!sfx.muted);syncAudioButtons();};
$('#music').onclick=()=>{sfx.unlock();sfx.setMusic(!sfx.music);syncAudioButtons();};
function syncAudioButtons(){$('#sound').setAttribute('aria-pressed',String(!sfx.muted));$('#music').setAttribute('aria-pressed',String(sfx.music));}
$('#help').onclick=()=>$('#help-dialog').showModal();
let bizTab='staff';
$('#business').onclick=()=>{sfx.unlock();renderBiz();$('#biz').showModal();};
document.querySelectorAll('.biz-tabs button').forEach(b=>b.onclick=()=>{bizTab=b.dataset.tab;document.querySelectorAll('.biz-tabs button').forEach(x=>x.classList.toggle('on',x===b));renderBiz();});
$('#biz').addEventListener('close',()=>refreshAll());

/* ---------- inspector ---------- */
function bar(label,v,color){return `<div class="need">${label}<i><b style="width:${Math.max(0,Math.min(100,v))}%;background:${color}"></b></i></div>`;}
function renderInspect(){
 const box=$('#inspect');if(!selected){const top=game.items.filter(i=>TYPES[i.type].cat==='games').sort((a,b)=>b.earned-a.earned).slice(0,3);
  box.innerHTML=`<h2>${game.loc.name}</h2><p class="sub">${game.loc.blurb}</p><div class="row"><span>Floor</span>${game.w} × ${game.h}</div><div class="row"><span>Attractions</span>${game.items.filter(i=>TYPES[i.type].cat==='games').length} (${game.distinctTypes()} types)</div><div class="row"><span>Staff</span>${game.staff.length} / ${game.staffCap()}</div><div class="row"><span>Visitors served</span>${game.served.toLocaleString()}</div><div class="row"><span>Daily costs</span>${money(game.dailyCosts().total)}</div><div class="row"><span>Today’s income</span>${money(game.today.income)}</div>`+(top.length?`<h3 style="font-size:12px;color:var(--muted);margin:14px 0 4px">TOP EARNERS</h3>`+top.map(i=>`<div class="row"><span>${TYPES[i.type].name}</span>${money(i.earned)}</div>`).join(''):'')+`<p class="sub" style="margin-top:12px">Click a machine, visitor or staff member to inspect them.</p>`;return;}
 const r=selected.ref;
 if(selected.kind==='item'){
  if(!game.items.includes(r)){selected=null;return renderInspect();}
  const t=TYPES[r.type],usable=t.cat!=='decor'||t.seats;
  box.innerHTML=`<h2>${t.name}${r.level>1?' <small style="color:var(--gold)">Lv '+r.level+'</small>':''}</h2><p class="sub">${t.desc}</p>`+
   (usable?bar('Condition',r.condition,r.condition>50?'#8fe3c0':r.condition>25?'#ffd27a':'#ff7a7a')+`<div class="row"><span>Status</span>${r.broken?'⚠ Broken':r.users.length?'In use':'Idle'}</div><div class="row"><span>In line</span>${r.queue.length}</div><div class="row"><span>Plays</span>${r.plays}</div><div class="row"><span>Earned</span>${money(r.earned)}</div>`+(t.price?`<div class="row"><span>Price per play</span>$${(t.price*(1+.15*(r.level-1))*(1+.1*game.up('tokens'))).toFixed(2)}</div>`:''):`<div class="row"><span>Appeal</span>+${t.appeal}</div><p class="sub">${t.bin?'Visitors within 3 tiles rarely litter.':'Machines within 3 tiles become more inviting.'}</p>`)+
   `<div class="actions">`+(usable&&t.cat!=='decor'?`<button id="i-up" ${r.level>=5?'disabled':''}>${r.level>=5?'Max level':'Upgrade '+money(game.upgradeCost(r))}</button><button id="i-fix" ${r.condition>=100&&!r.broken?'disabled':''}>Repair ${money(game.repairCost(r))}</button>`:'')+`<button id="i-move">Move</button><button id="i-sell">Sell +${money(game.sellValue(r))}</button></div>`;
  $('#i-up')&&($('#i-up').onclick=()=>attempt(()=>game.upgrade(r.id),t.name+' upgraded to level '+(r.level+1)+'.'));
  $('#i-fix')&&($('#i-fix').onclick=()=>attempt(()=>game.repair(r.id),'Repaired.'));
  $('#i-move').onclick=()=>{moving=r;rot=r.rot;tool=null;toast('Click a new spot for the '+t.name+'. R rotates, Esc cancels.');};
  $('#i-sell').onclick=()=>{if(attempt(()=>game.sell(r.id),'Sold.')){selected=null;renderInspect();}};
 }else if(selected.kind==='customer'){
  if(!game.customers.includes(r)){selected=null;return renderInspect();}
  const k=KINDS[r.kind],fav=Object.entries(k.likes).sort((a,b)=>b[1]-a[1])[0][0],doing={enter:'Arriving',think:'Deciding what to do',walk:'Heading to '+(game.items.find(i=>i.id===r.target)?TYPES[game.items.find(i=>i.id===r.target).type].name:'something'),queue:'Waiting in line',play:'Playing!',exit:'Heading home'}[r.state];
  box.innerHTML=`<h2>${r.critic?'The Critic':k.name}${r.party?' 🎂':''}</h2><p class="sub">${doing}. Loves ${fav} games.</p>`+bar('Happiness',r.happiness,'#ffd27a')+bar('Hunger',r.hunger,'#ff9a6b')+bar('Thirst',r.thirst,'#7cc6ff')+bar('Restroom',r.bladder,'#c8a6ff')+bar('Energy',r.energy,'#8fe3c0')+`<div class="row"><span>Budget left</span>$${Math.max(0,r.budget-r.spent).toFixed(2)}</div><div class="row"><span>Games played</span>${r.played}</div><div class="row"><span>Tickets</span>${r.tickets}</div>`;
 }else{
  if(!game.staff.includes(r)){selected=null;return renderInspect();}
  const st=STAFF[r.role];box.innerHTML=`<h2>${r.name}</h2><p class="sub">${st.name}. ${st.desc}</p><div class="row"><span>Wage</span>${money(st.wage)}/day</div><div class="row"><span>Doing</span>${r.working?'Working':r.task?'On the way to a job':'Patrolling'}</div><div class="actions"><button id="s-fire">Let go</button></div>`;
  $('#s-fire').onclick=()=>{game.fire(r.id);selected=null;renderInspect();refreshAll();};
 }
}

/* ---------- business dialog ---------- */
function renderBiz(){
 const b=$('#biz-body');
 if(bizTab==='staff'){
  b.innerHTML=`<h2>Your team <small style="color:var(--muted);font-size:13px">${game.staff.length} / ${game.staffCap()} at this location</small></h2><div class="cards">`+Object.entries(STAFF).map(([k,s])=>`<div class="card"><b>${s.name}</b><p>${s.desc}</p><p>Hire ${money(s.hire)} · ${money(s.wage)}/day</p><button data-hire="${k}" ${(s.unlock||0)>game.level?'disabled':''}>${(s.unlock||0)>game.level?'Unlocks at '+LOCATIONS[s.unlock].name:'Hire'}</button></div>`).join('')+`</div><h3>On the floor</h3>`+(game.staff.length?game.staff.map(s=>`<div class="staff-row"><span>${s.name} · ${STAFF[s.role].name}</span><button data-fire="${s.id}">Let go</button></div>`).join(''):'<p class="sub">No staff yet.</p>');
  b.querySelectorAll('[data-hire]').forEach(x=>x.onclick=()=>{attempt(()=>game.hire(x.dataset.hire),STAFF[x.dataset.hire].name+' hired.');renderBiz();});
  b.querySelectorAll('[data-fire]').forEach(x=>x.onclick=()=>{game.fire(Number(x.dataset.fire));renderBiz();});
 }else if(bizTab==='improve'){
  b.innerHTML=`<h2>Business improvements</h2><div class="cards">`+Object.entries(IMPROVEMENTS).map(([k,u])=>{const lv=game.up(k),max=lv>=u.costs.length;return `<div class="card"><b>${u.name}</b><span class="lv">${'●'.repeat(lv)}${'○'.repeat(u.costs.length-lv)}</span><p>${u.desc}</p><button data-imp="${k}" ${max?'disabled':''}>${max?'Complete':'Buy '+money(u.costs[lv])}</button></div>`;}).join('')+'</div>';
  b.querySelectorAll('[data-imp]').forEach(x=>x.onclick=()=>{attempt(()=>game.improve(x.dataset.imp),IMPROVEMENTS[x.dataset.imp].name+' installed.');renderBiz();});
 }else if(bizTab==='market'){
  b.innerHTML=`<h2>Marketing</h2>${game.campaign?`<p>Running: <b>${CAMPAIGNS[game.campaign.key].name}</b> (${Math.ceil(game.campaign.left)}s left)</p>`:'<p class="sub">Campaigns only run while the doors are open. Make sure you have room for the crowd.</p>'}<div class="cards">`+Object.entries(CAMPAIGNS).map(([k,cp])=>`<div class="card"><b>${cp.name}</b><p>${cp.desc}</p><button data-camp="${k}" ${cp.unlock>game.level||game.campaign?'disabled':''}>${cp.unlock>game.level?'Unlocks at '+LOCATIONS[cp.unlock].name:'Launch '+money(cp.cost)}</button></div>`).join('')+'</div>';
  b.querySelectorAll('[data-camp]').forEach(x=>x.onclick=()=>{attempt(()=>game.launch(x.dataset.camp),CAMPAIGNS[x.dataset.camp].name+' launched!');renderBiz();});
 }else if(bizTab==='location'){
  const st=game.goalStatus();
  b.innerHTML=`<h2>${game.loc.name}</h2><p class="sub">${game.loc.blurb} Rent ${money(game.loc.rent)}/day.</p>`+LOCATIONS.map((l,i)=>`<div class="goal ${i<=game.level?'done':''}"><span>${i+1}. ${l.name} <small style="color:var(--muted)">${l.w}×${l.h}</small></span><span>${i<game.level?'Moved out':i===game.level?'You are here':''}</span></div>`).join('')+
   (st?`<h3>Moving to ${st.next.name}</h3><p class="sub">${st.next.blurb} Your machines, staff and upgrades come with you, and new attractions unlock.</p>`+st.parts.map(p=>`<div class="progress"><small>${p.label}: ${p.money?money(p.have)+' / '+money(p.need):p.have+' / '+p.need}</small><i><b style="width:${Math.min(100,p.have/p.need*100)}%"></b></i></div>`).join('')+`<button class="primary" id="relocate" ${game.canRelocate()?'':'disabled'}>Move for ${money(st.next.move)}</button>`:'<h3>You built The Grand Arcade.</h3><p>Every venue conquered. Keep perfecting it — there is always another million to earn.</p>');
  $('#relocate')&&($('#relocate').onclick=()=>{const n=attempt(()=>game.relocate());if(n){toast('Welcome to '+n.name+'!','good');sfx.chord([523,659,784,1047],.5,{type:'triangle',vol:.12,spread:.1});resize();buildShop();renderBiz();}});
 }else if(bizTab==='goals'){
  const done=game.claimed.length;b.innerHTML=`<h2>Goals <small style="color:var(--muted);font-size:13px">${done} / ${MILESTONES.length}</small></h2><p class="sub">Rewards are paid automatically.</p>`+MILESTONES.map(m=>`<div class="goal ${game.claimed.includes(m.id)?'done':''}"><span>${m.text}</span><span>${money(m.reward)}</span></div>`).join('');
 }else{
  const h=game.history.slice(-14);b.innerHTML=`<h2>Daily reports</h2>`+(h.length?`<canvas class="chart" id="chart"></canvas><p class="sub">Gold bars: income. Red line: daily costs. Dots: visitor happiness.</p>`+h.slice().reverse().slice(0,7).map(r=>`<div class="goal"><span>Day ${r.day}${r.event?' · '+EVENTS[r.event].name:''}</span><span>${money(r.income)} in · ${money(r.costs)} out · ${r.visitors} visitors · ${r.happy}% happy</span></div>`).join(''):'<p class="sub">Finish your first day to see reports.</p>');
  const cv=$('#chart');if(cv){const r=cv.getBoundingClientRect(),c=cv.getContext('2d');cv.width=r.width*2;cv.height=r.height*2;c.scale(2,2);const W=r.width,H=r.height,max=Math.max(10,...h.map(x=>Math.max(x.income,x.costs)))*1.1,bw=(W-40)/h.length;c.fillStyle='#9aa8c2';c.font='11px system-ui';c.fillText(money(max),4,14);h.forEach((x,i)=>{const bh=(H-30)*x.income/max;c.fillStyle='#ffd27a';c.fillRect(30+i*bw+3,H-20-bh,bw-6,bh);c.fillStyle='#8fe3c0';c.beginPath();c.arc(30+i*bw+bw/2,H-20-(H-30)*x.happy/100,3,0,7);c.fill();c.fillStyle='#9aa8c2';c.fillText(x.day,30+i*bw+bw/2-5,H-6);});c.strokeStyle='#ff7a7a';c.lineWidth=2;c.beginPath();h.forEach((x,i)=>{const y=H-20-(H-30)*x.costs/max;i?c.lineTo(30+i*bw+bw/2,y):c.moveTo(30+i*bw+bw/2,y);});c.stroke();}
 }
}

/* ---------- HUD ---------- */
function refreshAll(){refreshHud();refreshShopAfford();renderInspect();}
function refreshHud(){
 $('#cash').textContent=money(game.cash);$('#earned').textContent=money(game.totalEarned);$('#rep').textContent=Math.round(game.reputation);$('#rep-bar').style.width=game.reputation+'%';
 $('#day').textContent='Day '+game.day;$('#day-bar').style.width=(game.dayTime/DAY_LENGTH*100)+'%';$('#visitors').textContent=game.customers.length+' visitors';$('#location-name').textContent=game.loc.name;
 $('#doors').textContent=game.open?'Close doors':'Open doors';$('#doors').classList.toggle('primary',!game.open);
 const ev=$('#event');ev.hidden=!game.event;if(game.event){ev.textContent='☂ '+EVENTS[game.event.key].name;ev.title=EVENTS[game.event.key].desc;}
 const cp=$('#campaign');cp.hidden=!game.campaign;if(game.campaign)cp.textContent='📣 '+CAMPAIGNS[game.campaign.key].name+' · '+Math.ceil(game.campaign.left)+'s';
 $('#advisor').textContent=game.advisor();
 const log=$('#log');const html=game.log.slice(0,12).map(l=>`<li>${l.replace(/[<>&]/g,'')}</li>`).join('');if(log.dataset.html!==html){log.innerHTML=html;log.dataset.html=html;}
}
function handlePopups(){
 for(const p of game.popups.splice(0)){
  if(p.kind==='coin'){floats.push({x:p.x,y:p.y,t:0,text:p.text});if(floats.length<30)sfx.tone(1568+Math.random()*200,.07,{type:'square',vol:.035});}
  else if(p.kind==='milestone'){toast('🏆 Goal complete: '+p.text+' (+'+money(p.reward)+')','good');sfx.chord([659,784,988,1319],.4,{type:'triangle',vol:.1,spread:.08});}
  else if(p.kind==='broken'){sfx.noise(.25,{freq:500,vol:.12});sfx.tone(220,.3,{type:'sawtooth',vol:.06,slide:.5});}
  else if(p.kind==='fixed'){sfx.tone(988,.08,{type:'triangle',vol:.08});floats.push({x:p.x+.5,y:p.y+.3,t:0,text:'Fixed!',color:'#8fe3c0'});}
  else if(p.kind==='critic')toast(p.good?'⭐ The critic loved it! Reputation up.':'The critic was unimpressed. Reputation down.',p.good?'good':'bad');
  else if(p.kind==='day'){const r=p.report,net=r.income-r.costs;toast(`Day ${r.day} closed · ${money(r.income)} earned · ${money(r.costs)} costs · ${net>=0?'+':''}${money(net)} net · ${r.happy}% happy`,net>=0?'good':'bad');if(game.event)toast('Today: '+EVENTS[game.event.key].name+' — '+EVENTS[game.event.key].desc);save();}
 }
}

/* ---------- loop ---------- */
function frame(now){
 const dt=Math.min(.1,(now-last)/1000);last=now;time+=dt;
 if(speed>0&&!document.querySelector('dialog[open]')){const steps=speed;for(let i=0;i<steps;i++)game.step(dt);}
 for(const f of floats)f.t+=dt;floats=floats.filter(f=>f.t<1.4);
 handlePopups();
 if(game.open&&speed>0)sfx.play(SONG);else sfx.stop();
 if(game.level!==shownLevel){shownLevel=game.level;resize();buildShop();renderInspect();}
 uiTimer-=dt;if(uiTimer<=0){uiTimer=.25;if(!selected&&Math.random()<.25)renderInspect();refreshHud();refreshShopAfford();if(selected&&selected.kind!=='item'||selected?.ref?.users?.length||selected?.ref?.queue?.length)renderInspect();}
 saveTimer-=dt;if(saveTimer<=0){saveTimer=6;save();}
 draw();requestAnimationFrame(frame);
}
addEventListener('visibilitychange',()=>{if(document.hidden){save();sfx.pause(true);}else{last=performance.now();sfx.pause(speed===0);}});
addEventListener('pagehide',save);
syncAudioButtons();buildShop();resize();refreshAll();
if(game.migrated)toast('Arcade Tycoon 2.0 is here! Your lifetime earnings and location carried over; your old machines were refunded as cash.','good');
if(!game.items.length&&game.day===1)$('#help-dialog').showModal();
requestAnimationFrame(frame);
window.__tycoon=game;
