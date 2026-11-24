import {createQuickTutorial} from './tutorial-ui.js';
import {createGame,startRun,nextRound,updateGame,togglePause,chooseUpgrade,reroll,snapshot,bladePositions,dronePositions,WIDTH,HEIGHT,WEAPON_NAMES,ATTACK_NAMES} from './engine.js';
import {AudioDirector} from './audio.js';
import {upgradeScreen,readyScreen} from './upgrades-ui.js';
const $=s=>document.querySelector(s),canvas=$('#arena'),ctx=canvas.getContext('2d'),game=createGame();
const input={left:false,right:false,thrust:false,dash:false,aimX:940,aimY:300},particles=[];
const weaponColors={railgun:'#baf4ff',flame:'#ffb16b',grenade:'#c9df80',disc:'#e3ff8a',shard:'#c9a4ff',crystal:'#c9a4ff',poison:'#8cf08f',gravity:'#b3a0ff',storm:'#ffe78e',echo:'#e1bdff',drone:'#99ecff'};
let guide=null,tutorialLiftY=470;
let lastTime=0,clock=0,overlayKey='',loadoutKey='',hudTime=0,shake=0,best=0;
const soundtrack=new AudioDirector();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{best=Number(localStorage.getItem('square-off-best'))||0;}catch{}
$('#record').textContent=best?`BEST ROUND ${String(best).padStart(2,'0')}`:'BEST ROUND —';
const fmt=n=>Math.ceil(n).toLocaleString();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function soundButtons(){for(const[id,on,label]of[['sound',soundtrack.effectsOn,'sound effects'],['music',soundtrack.musicOn,'music']]){$('#'+id).textContent=(id==='sound'?'SFX':'MUSIC')+(on?' ON':' OFF');$('#'+id).setAttribute('aria-pressed',String(on));$('#'+id).setAttribute('aria-label',`Turn ${label} ${on?'off':'on'}`);}}
soundButtons();$('#sound').addEventListener('click',()=>{soundtrack.unlock();soundtrack.toggleEffects();soundButtons();soundtrack.cue('confirm');});$('#music').addEventListener('click',()=>{soundtrack.unlock();soundtrack.toggleMusic();soundButtons();});
function clearInput(){input.left=input.right=input.thrust=input.dash=false;}
function begin(){soundtrack.unlock().then(()=>soundtrack.cue('round'));clearInput();particles.length=0;overlayKey='';startRun(game);updateInterface(true);}
function pick(index){chooseUpgrade(game,index);soundtrack.cue('confirm');updateInterface(true);}
function doReroll(){reroll(game);soundtrack.cue('reroll');updateInterface(true);$('#overlay [data-pick]')?.focus();}
function doNext(){soundtrack.unlock().then(()=>soundtrack.cue('round'));clearInput();nextRound(game);updateInterface(true);}
function pause(){if(togglePause(game)){if(game.phase!=='paused')soundtrack.unlock();clearInput();updateInterface(true);}}
$('#pause').addEventListener('click',pause);$('.wordmark').addEventListener('click',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
  const playing=['combat','countdown'].includes(game.phase);
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)&&playing)e.preventDefault();if(e.repeat)return;
  if(e.code==='Escape'||e.code==='KeyP'){pause();return;}
  if((game.phase==='menu'||game.phase==='dead')&&e.code==='Enter'){begin();return;}
  if(game.phase==='ready'&&e.code==='Enter'){doNext();return;}
  if(['upgrade_player','upgrade_boss'].includes(game.phase)){if(['Digit1','Digit2','Digit3'].includes(e.code)){pick(Number(e.code.slice(-1))-1);return;}if(e.code==='KeyR'&&game.rerolls>0){doReroll();return;}}
  if(!playing)return;
  if(e.code==='KeyA'||e.code==='ArrowLeft')input.left=true;
  if(e.code==='KeyD'||e.code==='ArrowRight')input.right=true;
  if(e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp')input.thrust=true;
  if(e.code==='ShiftLeft'||e.code==='ShiftRight')input.dash=true;
});
window.addEventListener('keyup',e=>{if(e.code==='KeyA'||e.code==='ArrowLeft')input.left=false;if(e.code==='KeyD'||e.code==='ArrowRight')input.right=false;if(e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp')input.thrust=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')input.dash=false;});
window.addEventListener('blur',()=>{clearInput();if(['combat','countdown'].includes(game.phase))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&['combat','countdown'].includes(game.phase))pause();soundtrack.setHidden(document.hidden);});
window.addEventListener('pointerdown',()=>soundtrack.unlock(),{once:true});
window.addEventListener('pagehide',()=>soundtrack.dispose(),{once:true});
function setAim(e){guide?.signal("aim");const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/WIDTH,r.height/HEIGHT),left=r.left+(r.width-WIDTH*scale)/2,top=r.top+(r.height-HEIGHT*scale)/2;input.aimX=Math.max(0,Math.min(WIDTH,(e.clientX-left)/scale));input.aimY=Math.max(0,Math.min(HEIGHT,(e.clientY-top)/scale));}
canvas.addEventListener('pointermove',setAim);canvas.addEventListener('pointerdown',e=>{setAim(e);if(e.pointerType==='touch')canvas.setPointerCapture(e.pointerId);});
for(const button of document.querySelectorAll('[data-control]')){button.addEventListener('pointerdown',e=>{e.preventDefault();input[button.dataset.control]=true;button.setPointerCapture(e.pointerId);});for(const type of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>input[button.dataset.control]=false);}
function overlayHTML(){
  const phase=game.phase;
  if(phase==='menu')return `<div class="start-screen"><span class="eyebrow">A BOSS OF YOUR OWN MAKING</span><h1 class="big-title">SQUARE<span>OFF.</span></h1><p>Kill the boss. Upgrade both of you. Repeat.<br>Every choice makes the next fight yours.</p><button class="primary" data-action="start">START RUN</button><button class="quiet-button" data-action="tutorial">TUTORIAL</button><div class="micro-copy">A / D TO MOVE · HOLD SPACE TO RISE · MOUSE TO AIM</div>${best>=5?'<div class="micro-copy so2-link">★ A SECRET CHARACTER IS UNLOCKED IN SQUARE OFF 2</div>':'<div class="micro-copy so2-link">BEAT ROUND 5 TO UNLOCK A SECRET IN SQUARE OFF 2</div>'}</div>`;
  if(phase==='paused')return `<div class="start-screen pause-screen"><span class="eyebrow">TAKE A BREATHER</span><h1>Paused.</h1><p>Your creation can wait.</p><button class="primary" data-action="resume">RESUME</button><div class="micro-copy">ESC / P TO RESUME</div></div>`;
  if(phase==='dead')return `<div class="start-screen"><span class="eyebrow">YOUR CREATION GOT THE BETTER OF YOU</span><h1 class="big-title">SQUARE<span>ONE.</span></h1><div class="results"><div><strong>${game.kills}</strong><span>ROUNDS CLEARED</span></div><div><strong>${game.history.length}</strong><span>UPGRADES CHOSEN</span></div><div><strong>${best}</strong><span>BEST ROUND</span></div></div><button class="primary" data-action="start">NEW RUN</button><div class="micro-copy">BOTH BUILDS RESET · ENTER TO TRY AGAIN</div>${best>=5?'<div class="micro-copy so2-link">★ A SECRET CHARACTER IS UNLOCKED IN SQUARE OFF 2</div>':'<div class="micro-copy so2-link">BEAT ROUND 5 TO UNLOCK A SECRET IN SQUARE OFF 2</div>'}</div>`;
  if(phase==='ready')return readyScreen(game);
  return upgradeScreen(game);
}
function updateInterface(force=false){
  const p=game.player,b=game.boss;
  if(force||clock-hudTime>.08){hudTime=clock;$('#player-hp').textContent=`${fmt(p.hp)} / ${fmt(p.maxHp)}`;$('#boss-hp').textContent=`${fmt(b.hp)} / ${fmt(b.maxHp)}`;$('#player-health').style.width=`${100*p.hp/p.maxHp}%`;$('#boss-health').style.width=`${100*b.hp/b.maxHp}%`;$('#round-number').textContent=String(game.round).padStart(2,'0');}
  const key=game.history.length+':'+game.phase;
  if(key!==loadoutKey){loadoutKey=key;$('#player-loadout').innerHTML=p.weaponList.map(w=>`<span class="chip">${WEAPON_NAMES[w.id].toUpperCase()}${w.level>1?' · '+w.level:''}</span>`).join('')+(p.shieldMax?`<span class="chip">SHIELD ×${p.shieldMax}</span>`:'')+(p.dashUnlocked?'<span class="chip">SHIFT · DASH</span>':'');$('#boss-loadout').innerHTML=b.attackList.map(a=>`<span class="chip">${(a.id==='gun'&&b.burst>1?'Burst cannon':ATTACK_NAMES[a.id]).toUpperCase()}${a.level>1?' · '+a.level:''}</span>`).join('')+(b.split?'<span class="chip">SPLIT</span>':'')+(b.bounces?'<span class="chip">RICOCHET</span>':'');}
  const nextKey=[game.phase,game.choices.map(u=>u.id).join(','),game.rerolls,game.round].join(':');
  if(nextKey!==overlayKey){soundtrack.setPhase(game.phase);const old=overlayKey.split(':')[0];overlayKey=nextKey;const shown=!['combat','countdown'].includes(game.phase);$('#overlay').classList.toggle('hidden',!shown);
    if(shown){$('#overlay').innerHTML=overlayHTML();$('#overlay').scrollTop=0;for(const el of document.querySelectorAll('[data-pick]'))el.addEventListener('click',()=>pick(Number(el.dataset.pick)));for(const el of document.querySelectorAll('[data-action]'))el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='tutorial')guide.offer();if(a==='start')begin();if(a==='next')doNext();if(a==='reroll')doReroll();if(a==='resume')pause();});if(old&&old!==game.phase&&game.phase!=='menu'){$('#overlay button:not(:disabled)')?.focus({preventScroll:true});if(matchMedia('(max-width:650px)').matches&&['upgrade_player','upgrade_boss','ready'].includes(game.phase))$('#overlay').scrollIntoView({block:'start',behavior:'instant'});}}
    $('#pause').disabled=!['combat','countdown','paused'].includes(game.phase);$('#pause').innerHTML=game.phase==='paused'?'RESUME <span>▶</span>':'PAUSE <span>Ⅱ</span>';
    const statuses={menu:'READY WHEN YOU ARE',combat:'NO TIMER · ELIMINATE THE BOSS',countdown:'GET READY',upgrade_player:'INTERMISSION · YOUR CHOICE',upgrade_boss:'INTERMISSION · BOSS CHOICE',ready:'READY FOR THE NEXT ROUND',paused:'PAUSED',dead:'RUN ENDED'};$('#arena-status').textContent=statuses[game.phase];$('#live-status').textContent=game.phase==='combat'?`Round ${game.round} started.`:game.phase==='upgrade_player'?`Round ${game.round} cleared. Health restored. Choose your upgrade.`:game.phase==='upgrade_boss'?'Choose an upgrade for the boss.':game.phase==='dead'?`Run ended. ${game.kills} rounds cleared.`:statuses[game.phase];$('#arena-wrap').classList.toggle('playing',['combat','countdown'].includes(game.phase));
  }
}
function burst(x,y,count,color,speed=160){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=Math.random()*speed;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.5,total:.8,radius:1+Math.random()*2,color});}if(particles.length>450)particles.splice(0,particles.length-450);}
function consumeEvents(){for(const e of game.events){soundtrack.event(e);
  if(e.type==='boss_hit')burst(e.x,e.y,2,'#ffc0ca',60);
  if(e.type==='shoot')burst(e.x,e.y,e.weapon==='railgun'?7:1,weaponColors[e.weapon]||'#d5ff63',e.weapon==='railgun'?150:25);
  if(e.type==='player_hit'){burst(e.x,e.y,16,'#d5ff63',170);shake=reducedMotion?0:4;}
  if(e.type==='shield_hit')burst(e.x,e.y,20,'#8fe4ff',160);
  if(e.type==='heal')burst(e.x,e.y,13,'#b9ffcf',60);
  if(e.type==='blink')burst(e.x,e.y,26,'#ff91aa',180);
  if(e.type==='victory'){burst(e.x,e.y,95,'#ff7187',260);if(!guide?.active&&game.round>best){if(best<5&&game.round>=5)setTimeout(()=>burst(WIDTH/2,HEIGHT/2,80,'#d5ff63',300),200);best=game.round;try{localStorage.setItem('square-off-best',String(best));}catch{}$('#record').textContent=`BEST ROUND ${String(best).padStart(2,'0')}`;}}
  if(e.type==='death')burst(e.x,e.y,50,'#d5ff63',240);
  if(e.type==='explosion')burst(e.x,e.y,22,e.owner==='player'?'#8fe4ff':'#ff7187',220);
  if(e.type==='split')burst(e.x,e.y,5,e.owner==='player'?'#c9a4ff':'#ff7187',75);if(e.type==='dash')burst(e.x,e.y,12,'#d5ff63',100);
  if(e.type==='field')burst(e.x,e.y,16,'#b3a0ff',80);if(e.type==='lightning')burst(e.x,e.y,20,'#ffe78e',150);
}}
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function circle(x,y,r,fill,stroke,width=1){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function face(e,color,x=e.x,y=e.y){const s=e.size;ctx.save();ctx.translate(x,y);ctx.rotate(Math.max(-.075,Math.min(.075,e.vx/5000)));rounded(-s/2,-s/2,s,s,s*.22,e.flash>0?'#f6f8ed':color);ctx.fillStyle='#161b26';for(const dx of[-.17,.17]){ctx.beginPath();ctx.ellipse(s*dx,-s*.025,s*.047,s*.065,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
function playerAttachments(x,y){
  const p=game.player,a=Math.atan2(game.aim.y-y,game.aim.x-x);
  for(let i=0;i<p.weaponList.length;i++){const w=p.weaponList[i],ma=a+(i-(p.weaponList.length-1)/2)*.8,mx=x+Math.cos(ma)*18,my=y+Math.sin(ma)*18;ctx.save();ctx.translate(mx,my);ctx.rotate(a);const electric=['laser','plasma','coil','seeker'].includes(w.id),color=weaponColors[w.id]||(electric?'#8fe4ff':'#a6bf67');rounded(-3,-5,17+Math.min(7,w.level*1.3),10,2,electric?'#397f93':w.id==='rocket'?'#51627d':'#566341',color);
    if(w.id==='railgun'){rounded(9,-3,24,6,2,'#447587',color);line(12,0,34,0,'#e4fcff',1.5);}
    else if(w.id==='disc'||w.id==='gravity'||w.id==='grenade'){circle(16,0,7,'#303d4a',color,2);circle(16,0,3,color);}
    else if(w.id==='shard'){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(11,-8);ctx.lineTo(25,0);ctx.lineTo(11,8);ctx.lineTo(6,0);ctx.closePath();ctx.fill();}
    else if(w.id==='storm'){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(9,0,13,-Math.PI/2,Math.PI/2);ctx.stroke();line(9,-13,9,13,color,1);line(5,0,26,0,color,2);}
    else if(w.id==='echo'){rounded(12,-7,12,3,1,color);rounded(12,4,12,3,1,color);}
    else if(w.id==='drone'){line(5,-5,5,-11,color,2);circle(5,-12,2,color);}
    else if(w.id==='coil'||w.id==='plasma')circle(16,0,6,electric?'#28596c':'#566341','#8fe4ff',2);
    else if(w.id==='blades'||w.id==='boomerang'){line(11,-7,22,0,'#d5ff63',3);line(22,0,11,7,'#d5ff63',3);}
    else{const n=w.id==='shotgun'||w.id==='poison'?2:Math.min(3,1+w.pellets);for(let j=0;j<n;j++)rounded(11,-2+(j-(n-1)/2)*4,9,3,1,weaponColors[w.id]||(electric?'#8fe4ff':'#d5ff63'));}ctx.restore();}
  rounded(x-8,y+12,6,7,2,'#596446');rounded(x+2,y+12,6,7,2,'#596446');
  const tiers=Math.min(3,Math.floor(game.history.filter(h=>h.side==='player').length/3));for(let i=0;i<tiers;i++){rounded(x-18,y-9+i*7,5,5,1,'#748956');rounded(x+13,y-9+i*7,5,5,1,'#748956');}
  if(input.thrust&&['combat','countdown'].includes(game.phase)){const length=13+Math.sin(clock*60)*5;for(const dx of[-5,5]){ctx.fillStyle='#d5ff6390';ctx.beginPath();ctx.moveTo(x+dx-3,y+18);ctx.lineTo(x+dx,y+18+length);ctx.lineTo(x+dx+3,y+18);ctx.fill();circle(x+dx,y+20,2,'#f4ffd7');}}
}
function bossAttachments(x,y){
  const b=game.boss,n=b.attackList.length,aim=Math.atan2(game.player.y-y,game.player.x-x);
  for(let i=0;i<n;i++){const a=b.attackList[i],mount=n===1?aim:-Math.PI/2+i/n*Math.PI*2,mx=x+Math.cos(mount)*46,my=y+Math.sin(mount)*46;
    if(a.id==='ring'||a.id==='pulse'||a.id==='spiral'){circle(x,y,60+Math.min(15,a.level*3),null,'#ff71872d',2);circle(mx,my,12,'#42303d','#a25b71',2);circle(mx,my,6,null,'#ff91a2',2);if(a.id==='spiral')line(mx-9,my,mx+9,my,'#ff91a2',2);continue;}
    ctx.save();ctx.translate(mx,my);ctx.rotate(a.id==='gun'||a.id==='spread'?aim:mount);rounded(-12,-10,27,20,5,'#4d3342','#aa6476');
    if(a.id==='laser'){rounded(11,-6,18,12,2,'#744151','#ff8da0');line(17,-4,17,4,'#ffb5c1',2);}
    else if(a.id==='missile'){rounded(5,-11,19,8,2,'#bd7489');rounded(5,3,19,8,2,'#bd7489');}
    else if(a.id==='mines'||a.id==='mortar'){circle(5,0,10,'#54313f','#cc7a91',2);circle(5,0,4,'#ff7187');}
    else if(a.id==='boomerang'){line(7,-10,22,0,'#ef9bae',4);line(22,0,7,10,'#ef9bae',4);}
    else if(a.id==='cross'){for(let j=0;j<4;j++){const r=j/4*Math.PI*2;line(4,0,4+Math.cos(r)*19,Math.sin(r)*19,'#cf8297',5);}}
    else if(a.id==='rain'){rounded(3,-9,23,18,3,'#844757');for(let j=0;j<3;j++)circle(9+j*6,0,2,'#ffb5c1');}
    else{const count=a.id==='spread'?3:Math.min(3,1+b.extra);for(let j=0;j<count;j++)rounded(11,-3+(j-(count-1)/2)*8,20,6,2,'#b67587');}ctx.restore();
  }
  const health=game.history.filter(h=>h.id==='b_health').length;for(let i=0;i<Math.min(5,health);i++){rounded(x-44,y-24+i*11,7,8,2,'#b9657d');rounded(x+37,y-24+i*11,7,8,2,'#b9657d');}
  if(b.split)for(const da of[-.4,.4])circle(x+Math.cos(aim+da)*61,y+Math.sin(aim+da)*61,4,null,'#a4536a',1.5);
}
function drawBackground(){
  ctx.fillStyle='#141925';ctx.fillRect(0,0,WIDTH,HEIGHT);const gradient=ctx.createRadialGradient(WIDTH*.55,HEIGHT*.5,30,WIDTH*.55,HEIGHT*.5,700);gradient.addColorStop(0,'#1c2436');gradient.addColorStop(1,'#111722');ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle='#354055';ctx.globalAlpha=.4;for(let x=36;x<WIDTH;x+=48)for(let y=36;y<HEIGHT;y+=48)ctx.fillRect(x,y,1.5,1.5);ctx.globalAlpha=1;rounded(20,20,WIDTH-40,HEIGHT-40,6,null,'#2b3548');
  for(const[x,y,sx,sy]of[[20,20,1,1],[WIDTH-20,20,-1,1],[20,HEIGHT-20,1,-1],[WIDTH-20,HEIGHT-20,-1,-1]]){line(x,y,x+sx*26,y,'#4a5872',2);line(x,y,x,y+sy*26,'#4a5872',2);}
  ctx.font='11px "Courier New", monospace';ctx.fillStyle='#4a566c';ctx.fillText('ARENA / 001',40,HEIGHT-38);ctx.textAlign='right';ctx.fillText('NO CONTACT DAMAGE',WIDTH-40,HEIGHT-38);ctx.textAlign='left';
}
function drawWarnings(){for(const t of game.telegraphs){ctx.save();ctx.globalAlpha=.25+.45*(1-t.time/t.total);
  if(t.id==='laser'){for(let i=0;i<t.barrels;i++){const a=t.angle+(i-(t.barrels-1)/2)*.28;ctx.setLineDash([12,9]);line(t.x,t.y,t.x+Math.cos(a)*1600,t.y+Math.sin(a)*1600,'#ff7187',2);ctx.setLineDash([]);line(t.x,t.y,t.x+Math.cos(a)*1600,t.y+Math.sin(a)*1600,'#ff718718',18+t.width);}}
  else if(t.id==='rain'){for(const x of t.lanes){rounded(x-12,20,24,38,5,'#ff718726','#ff7187');ctx.setLineDash([5,10]);line(x,64,x,160,'#ff7187',1.5);ctx.setLineDash([]);}}
  else if(t.id==='mortar'){circle(t.target.x,t.target.y,27,null,'#ff8da4',2);line(t.target.x-38,t.target.y,t.target.x+38,t.target.y,'#ff8da4',1);line(t.target.x,t.target.y-38,t.target.x,t.target.y+38,'#ff8da4',1);}
  else if(t.id==='teleport'){rounded(t.target.x-42,t.target.y-42,84,84,18,'#ff718710','#ff91a8');line(t.x,t.y,t.target.x,t.target.y,'#ff71872b',2);}
  else if(t.id==='dash'){ctx.setLineDash([8,8]);line(t.x,t.y,t.target.x,t.target.y,'#ff7187',3);ctx.setLineDash([]);circle(t.target.x,t.target.y,18,null,'#ff7187',2);}
  else if(t.id==='ring')circle(t.x,t.y,59+(1-t.time/t.total)*18,null,'#ff8ca0',2);
  else if(t.id==='mines')circle(t.target.x,t.target.y,22,null,'#ff8ca0',2);
  else circle(t.x+Math.cos(t.angle)*56,t.y+Math.sin(t.angle)*56,9+5*(1-t.time/t.total),null,'#ff9eb0',2);ctx.restore();
}}
function drawProjectiles(){for(const q of game.projectiles){if(q.delay>0)continue;const player=q.owner==='player',color=player?(weaponColors[q.kind]||(['rocket','plasma','seeker'].includes(q.kind)?'#8fe4ff':'#d5ff63')):'#ff7187',speed=Math.max(1,Math.hypot(q.vx,q.vy)),tail=q.kind==='rocket'||q.kind==='missile'?22:player?13:7;line(q.x-q.vx/speed*tail,q.y-q.vy/speed*tail,q.x,q.y,player?color+'66':'#ff71874d',q.radius*.8);
  if(q.kind==='flame'){circle(q.x,q.y,q.radius+q.age*12,'#ff8b3c55');circle(q.x,q.y,q.radius*.7,'#ffdc8d');}
  else if(q.kind==='grenade'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.age*7);rounded(-6,-7,12,14,4,'#465638',color);line(-2,-9,3,-12,'#ffe5a0',2);circle(4,-12,2,'#fff3cd');ctx.restore();}
  else if(q.kind==='disc'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.age*18);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;line(Math.cos(a)*8,Math.sin(a)*8,Math.cos(a+.15)*14,Math.sin(a+.15)*14,color,3);}circle(0,0,9,'#495839',color,1.5);circle(0,0,3,color);ctx.restore();}
  else if(q.kind==='shard'||q.kind==='crystal'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(q.radius*1.8,0);ctx.lineTo(0,-q.radius);ctx.lineTo(-q.radius,0);ctx.lineTo(0,q.radius);ctx.closePath();ctx.fill();ctx.restore();}
  else if(q.kind==='gravity'){circle(q.x,q.y,15,null,color+'66',2);circle(q.x,q.y,9,'#4b3d75',color,2);circle(q.x,q.y,3,'#e6dfff');}
  else if(q.kind==='storm'||q.kind==='poison'){const dx=q.vx/speed,dy=q.vy/speed;line(q.x-dx*15,q.y-dy*15,q.x+dx*5,q.y+dy*5,color,2);line(q.x+dx*5,q.y+dy*5,q.x-dx*2-dy*4,q.y-dy*2+dx*4,color,2);line(q.x+dx*5,q.y+dy*5,q.x-dx*2+dy*4,q.y-dy*2-dx*4,color,2);}
  else if(q.kind==='echo'){rounded(q.x-4,q.y-4,8,8,2,color);circle(q.x,q.y,9,null,color+'55',1);}
  else if(q.kind==='boomerang'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.age*13);line(-8,-7,8,0,color,3);line(8,0,-8,7,color,3);ctx.restore();}
  else if(q.kind==='plasma'||q.kind==='mortar'){circle(q.x,q.y,q.radius+6,null,player?'#8fe4ff40':'#ff718740',2);circle(q.x,q.y,q.radius,player?'#347486':'#773b54',color,2);circle(q.x,q.y,q.radius*.35,player?'#daf7ff':'#ffc3d3');}
  else if(q.kind==='needle')line(q.x-q.vx/speed*13,q.y-q.vy/speed*13,q.x,q.y,color,2);
  else if(q.kind==='rocket'||q.kind==='missile'||q.kind==='seeker'){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(Math.atan2(q.vy,q.vx));rounded(-9,-4,17,8,3,color);line(-10,0,-19-Math.sin(clock*50)*4,0,color,3);ctx.restore();}
  else{circle(q.x,q.y,q.radius+2,player?'#d5ff6318':'#ff71871c');circle(q.x,q.y,q.radius,player?color:'#582b3c',player?null:color,2);if(!player)circle(q.x,q.y,1.5,'#ffbdc8');}
}}
function drawBeams(){for(const beam of game.beams){const b=game.boss,ex=b.x+Math.cos(beam.angle)*1600,ey=b.y+Math.sin(beam.angle)*1600;line(b.x,b.y,ex,ey,'#ff71871b',beam.width+18);line(b.x,b.y,ex,ey,'#ff7187',beam.width);line(b.x,b.y,ex,ey,'#ffd4dc',3);}if(game.playerBeam){const a=game.playerBeam,ex=a.x+Math.cos(a.angle)*1500,ey=a.y+Math.sin(a.angle)*1500;line(a.x,a.y,ex,ey,'#8fe4ff1a',9+a.level);line(a.x,a.y,ex,ey,'#8fe4ff',2+a.level*.35);}}
function drawPlayerEffects(){
  for(const f of game.fields){ctx.save();ctx.globalAlpha=Math.min(1,f.life/.3);circle(f.x,f.y,f.radius,'#ab92ff0d','#ab92ff55',1.5);for(let i=0;i<3;i++){const r=f.radius*((clock*.45+i/3)%1);circle(f.x,f.y,r,null,'#ab92ff2b',1);}circle(f.x,f.y,9,'#b8a1ff4d','#d8caff',2);ctx.restore();}
  for(const t of game.traces){ctx.save();ctx.globalAlpha=t.life/t.total;if(t.kind==='railgun'){const x=t.x+Math.cos(t.angle)*t.length,y=t.y+Math.sin(t.angle)*t.length;line(t.x,t.y,x,y,'#baf4ff30',16);line(t.x,t.y,x,y,'#baf4ff',4);line(t.x,t.y,x,y,'#ffffff',1.5);}else{let prev={x:t.x,y:t.y};for(let i=1;i<=10;i++){const p=i/10,next={x:t.x+(t.ex-t.x)*p+(i<10?Math.sin(i*12+clock*50)*14:0),y:t.y+(t.ey-t.y)*p};line(prev.x,prev.y,next.x,next.y,'#ffe78e',4);line(prev.x,prev.y,next.x,next.y,'#fffbee',1.5);prev=next;}}ctx.restore();}
  for(const s of game.strikes)circle(game.boss.x,game.boss.y,53+Math.sin(clock*20)*3,null,'#ffe78e77',1.5);
  if(game.boss.burnTime>0)circle(game.boss.x,game.boss.y,51+Math.sin(clock*17)*3,null,'#ffb16b66',2);
  if(game.boss.poisonTime>0)circle(game.boss.x,game.boss.y,56+Math.sin(clock*9)*3,null,'#8cf08f66',2);
}
function drawMines(){for(const m of game.mines){const armed=m.age>1;circle(m.x,m.y,18+Math.sin(m.age*10)*3,null,armed?'#ff71874d':'#ff718726');circle(m.x,m.y,9,'#4b2b3b',armed?'#ff7187':'#a3617a',2);for(let i=0;i<4;i++){const a=i/4*Math.PI*2;line(m.x+Math.cos(a)*11,m.y+Math.sin(a)*11,m.x+Math.cos(a)*15,m.y+Math.sin(a)*15,'#ff7187',2);}circle(m.x,m.y,3,armed?'#ff9daf':'#a3617a');}}
function drawCharacters(){const idle=['menu','ready','upgrade_player','upgrade_boss'].includes(game.phase),p=game.player,b=game.boss,px=idle?300:p.x,py=idle?440+Math.sin(clock*1.6)*13:p.y,bx=idle?930:b.x,by=idle?290+Math.sin(clock*1.1)*18:b.y;
  if(game.phase!=='dead')for(const w of p.weaponList)if(w.id==='drone')for(const q of dronePositions(game,w)){const x=q.x+px-p.x,y=q.y+py-p.y;line(x-13,y-5,x+13,y-5,'#99ecff77',2);rounded(x-7,y-6,14,12,4,'#4e8595','#99ecff');circle(x-2,y-1,1,'#0f2630');circle(x+3,y-1,1,'#0f2630');}
  if(game.phase==='combat'){for(const w of p.weaponList)if(w.id==='blades')for(const q of bladePositions(game,w)){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.angle+Math.PI/4);rounded(-8,-8,16,16,3,'#586a43','#d5ff63');line(-10,0,10,0,'#d5ff63',2);line(0,-10,0,10,'#d5ff63',2);ctx.restore();}for(const arc of game.arcs){let last={x:arc.x,y:arc.y};for(let i=1;i<=7;i++){const t=i/7,next={x:arc.x+(arc.ex-arc.x)*t+(i<7?Math.sin(clock*36+i)*12:0),y:arc.y+(arc.ey-arc.y)*t+(i<7?Math.cos(clock*43+i)*12:0)};line(last.x,last.y,next.x,next.y,'#8fe4ff',3);last=next;}}}
  if(game.phase!=='dead'){ctx.globalAlpha=p.invulnerable>0&&Math.floor(clock*16)%2===0?.5:1;playerAttachments(px,py);face(p,'#d5ff63',px,py);ctx.globalAlpha=1;if(p.shield>0)circle(px,py,25+Math.sin(clock*3)*2,null,'#8fe4ff9c',1.5);if(p.dashUnlocked&&p.dashCooldown>0){ctx.strokeStyle='#d5ff6350';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px,py,24,-Math.PI/2,-Math.PI/2+(1-p.dashCooldown/p.dashRecharge)*Math.PI*2);ctx.stroke();}}
  if(game.phase!=='dead'||b.hp>0){bossAttachments(bx,by);face(b,'#ff7187',bx,by);}
}
function drawParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;if(p.life<=0){particles.splice(i,1);continue;}ctx.globalAlpha=Math.min(.7,p.life/p.total);circle(p.x,p.y,p.radius,p.color);}ctx.globalAlpha=1;}
function crosshair(){if(game.phase!=='combat')return;const{x,y}=game.aim;circle(x,y,8,null,'#e8f2d594');for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])line(x+dx*11,y+dy*11,x+dx*16,y+dy*16,'#efffe1',1.2);circle(x,y,1.5,'#efffe1');}
function render(dt){ctx.save();if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-dt*25);}drawBackground();drawWarnings();drawMines();drawBeams();drawPlayerEffects();drawCharacters();drawProjectiles();drawParticles(dt);crosshair();
  if(game.phase==='countdown'){ctx.textAlign='center';ctx.font='800 92px "Segoe UI", sans-serif';ctx.fillStyle='#f4f6ed';ctx.fillText(Math.ceil(game.countdown),WIDTH/2,HEIGHT/2);ctx.font='13px "Courier New", monospace';ctx.fillStyle='#b7c4d5';ctx.fillText(`ROUND ${String(game.round).padStart(2,'0')}`,WIDTH/2,HEIGHT/2+40);ctx.textAlign='left';}ctx.restore();
}
function frame(t){const dt=lastTime?Math.min(.035,(t-lastTime)/1000):0;lastTime=t;clock+=dt;if(guide?.active){game.player.invulnerable=1;game.boss.attackList.forEach(a=>a.timer=10);if(guide.step<2||(guide.step===2&&!guide.has("aim")))game.player.weaponList.forEach(w=>w.timer=1);}updateGame(game,guide?.blocking?0:dt,input);guide?.tick();consumeEvents();updateInterface();soundtrack.setMotion(input.thrust,!!game.playerBeam);render(dt);requestAnimationFrame(frame);}
guide=createQuickTutorial({title:'Square Off',readChoice:()=>{try{return localStorage.getItem('square-off-tutorial-v1');}catch{return null;}},remember:value=>{try{localStorage.setItem('square-off-tutorial-v1',value);}catch{}},
 intro:'A safe practice fight: move, rise, aim, and choose upgrades for both sides. About a minute. Skip anytime.',finish:'You aim; your weapons fire automatically. Upgrade yourself AND the boss after each win. The practice is over—your fresh run is ready.',
 onStart:()=>{begin();game.countdown=0;game.phase='combat';game.boss.hp=game.boss.maxHp=80;game.boss.speed=0;},onEnd:(done,wasActive)=>{if(wasActive||(!done&&["menu","dead"].includes(game.phase)))begin();},
 steps:[
 {title:'Slide sideways',text:'Hold A / D or the arrow keys to move. On touch, use ◀ / ▶. Move away from your starting spot.',target:()=>document.getElementById('touch-controls'),check:()=>Math.abs(game.player.x-260)>60},
 {title:'Take flight',text:'Hold Space, W, or ↑ to rise; release to fall. On touch, hold THRUST. Try gaining a little height.',target:()=>document.querySelector('[data-control="thrust"]'),enter:()=>{tutorialLiftY=game.player.y;},check:()=>game.player.y<tutorialLiftY-55},
 {title:'Aim at the big square',text:'Move your mouse toward the boss—or tap it. Your weapon fires automatically. Land a few hits; practice shots can’t hurt you.',target:()=>canvas,check:seen=>seen.has("aim")&&game.totalDamage>=12},
 {title:'Finish the practice boss',text:'Keep your aim on the boss until its health runs out. Keep moving while you shoot.',target:()=>document.getElementById('boss-health'),check:()=>game.phase==='upgrade_player'},
 {title:'Upgrade yourself',text:'Pick one of the three cards. A weapon adds to your arsenal; a stat upgrade makes you stronger.',target:()=>document.getElementById('overlay'),check:()=>game.phase==='upgrade_boss'},
 {title:'Upgrade your enemy',text:'Now pick a boss upgrade. Read carefully—you’ll face whatever you choose in the next fight.',target:()=>document.getElementById('overlay'),check:()=>game.phase==='ready'}
 ]});updateInterface(true);requestAnimationFrame(frame);
const modelContext=document.modelContext;
function emptyToolInput(args){if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).length)throw new Error('This action expects an empty input object.');}
if(modelContext?.registerTool){const lifecycle=new AbortController(),tools=[
  {name:'read_run',title:'Read current run',description:'Read the round, health, arsenals, upgrades, offered choices and audio status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:args=>{emptyToolInput(args);return{...snapshot(game),audio:soundtrack.status()};}},
  {name:'choose_upgrade',title:'Choose offered upgrade',description:'Pick one of the three offered upgrades. Player choice proceeds to boss choice; boss choice prepares the next round.',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:2}},required:['index'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:args=>{if(!args||!Number.isInteger(args.index))throw new Error('index must be an integer from 0 to 2');pick(args.index);return snapshot(game);}},
  {name:'reroll_upgrade_choices',title:'Reroll current choices',description:'Spend the one shared intermission reroll to permanently replace the current three upgrades.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:args=>{emptyToolInput(args);doReroll();return snapshot(game);}},
];for(const tool of tools){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
