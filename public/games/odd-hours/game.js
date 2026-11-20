import {Watch,ROOMS,CATEGORIES,NIGHTS,REPORT_TIME,nightConfig} from './model.js';
import {drawRoom,postFx,W,H} from './scene.js';
import {Sfx} from './sfx.js';

const KEY='odd-hours-prototype-v1',$=s=>document.querySelector(s);
let save={v:1,best:0,plays:0,level:1,nights:{}};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s==='object'){for(const k of ['best','plays','level'])if(Number.isFinite(s[k]))save[k]=Math.max(k==='level'?1:0,Math.floor(s[k]));if(s.nights&&typeof s.nights==='object')save.nights=s.nights;}}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(save));}catch{}};
const sfx=new Sfx('odd-hours-settings-v1');
const DRONE={bpm:40,wave:'sine',vol:.035,bassWave:'sine',bassVol:.07,hold:5,steps:[[50],[],[],[],[53],[],[],[],[49],[],[],[],[52],[],[57],[]],bass:[26,null,null,null,null,null,null,null,25,null,null,null,null,null,null,null]};
const canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay');
let w=null,mode='menu',time=0,last=performance.now(),staticT=0,flash=0;

function show(html){overlay.innerHTML=`<div class="card">${html}</div>`;overlay.hidden=false;}
function hide(){overlay.hidden=true;canvas.focus();}
const nightLabel=n=>n>NIGHTS.length?'Overtime '+(n-NIGHTS.length):'Night '+n;
function menu(){mode='menu';sfx.stop();const top=save.level;
 let grid='';for(let n=1;n<=Math.max(NIGHTS.length+1,top);n++){const open=n<=top;grid+=`<button data-n="${n}" ${open?'':'disabled'}>${nightLabel(n)}<small>${save.nights[n]?'✓ survived':open?nightConfig(n).cams+' cameras':'locked'}</small></button>`;if(n>NIGHTS.length+12)break;}
 show(`<p class="eyebrow">Municipal Museum · Night security</p><h2>Odd Hours</h2><p>The museum is closed. Your shift is not. Watch the cameras from midnight to 6 AM. When something in a room changes — an object goes missing, moves, appears, or something is watching — switch to that camera and file the right kind of report.</p>
 <ul><li>Anomalies only appear in rooms you are <b>not</b> looking at. Learn each room early.</li><li>If too many anomalies pile up, you lose the shift. Five false reports also end it.</li><li>Archive photos show how the current room should look. You only get a few each night.</li></ul>
 <div class="nights">${grid}</div><p style="font-size:13px">Best score: ${save.best.toLocaleString()}</p>`);
 overlay.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>start(Number(b.dataset.n)));}
function start(n){sfx.unlock();w=new Watch(n);mode='play';save.plays++;persist();hide();buildCams();buildReport();staticT=.4;
 const c=w.cfg;show(`<p class="eyebrow">${nightLabel(n)}</p><h2>${['Orientation','Settling in','The east wing opens','Something in the walls','The full collection','Restless','The last night'][n-1]||'Overtime'}</h2><p>${c.cams} cameras. Up to ${c.max-1} anomalies can stay open at once — the ${['first','second','third','fourth','fifth','sixth'][c.max-1]} ends your shift.${n===1?' Take a minute to memorize every room before the first change happens.':''}${n>=4?' Changes are getting subtler.':''}</p><div class="row"><button class="primary" id="go">Clock in</button></div>`);mode='brief';$('#go').onclick=()=>{mode='play';hide();};}
function buildCams(){const box=$('#cams');box.innerHTML='';ROOMS.forEach((r,i)=>{const b=document.createElement('button');b.textContent=`CAM ${i+1} · ${r.name}`;b.disabled=i>=w.cams;b.classList.toggle('locked',i>=w.cams);b.onclick=()=>{sfx.unlock();w.switchCam(i);};box.append(b);});}
function buildReport(){const box=$('#report');box.innerHTML='';for(const c of CATEGORIES){const b=document.createElement('button');b.innerHTML=`<span>${c.name}</span><kbd>${c.key}</kbd>`;b.dataset.cat=c.id;b.onclick=()=>{sfx.unlock();if(mode==='play')w.file(c.id);};box.append(b);}}
function ui(){
 if(!w)return;$('#night-name').textContent=nightLabel(w.night);$('#clock').textContent=w.clock();$('#clock-bar').style.width=(w.time/w.length*100)+'%';$('#found').textContent=w.found;$('#wrong').textContent=w.wrong+' / '+w.maxWrong;$('#peeks').textContent=w.peeks;$('#score').textContent=w.score.toLocaleString();
 [...$('#cams').children].forEach((b,i)=>b.classList.toggle('on',i===w.camera));
 const busy=!!w.report||mode!=='play';$('#report').querySelectorAll('button').forEach(b=>b.disabled=busy);$('#peek').disabled=mode!=='play'||(!w.peeking&&w.peeks<=0);$('#peek').textContent=w.peeking?'📺 Back to live':'📷 Archive photo';
 $('#filing').textContent=w.report?'Filing '+CATEGORIES.find(c=>c.id===w.report.cat).name.toLowerCase()+' for CAM '+(w.report.room+1)+'… '+Math.ceil(REPORT_TIME-w.report.t)+'s':'';
}
function draw(){
 const c=ctx,room=w.rooms[w.camera],def=ROOMS[w.camera],ref=w.peeking;
 c.save();
 if(ref)drawRoom(c,def,def.objects,[],time,{lightRoom:{light:null}});else drawRoom(c,def,room.objects,room.extras,time,{lightRoom:room});
 postFx(c,ref?null:room.light,time,{reference:ref,static:staticT>0});
 // overlay text
 c.font='700 18px "Courier New",monospace';c.fillStyle='#e8f0ec';c.textAlign='left';c.fillText(`CAM ${w.camera+1}  ${def.name.toUpperCase()}`,22,34);
 if(ref){c.fillStyle='#ffe0a0';c.fillText('ARCHIVE PHOTO · REFERENCE',22,60);}else if(Math.sin(time*4)>0){c.fillStyle='#ff4a4a';c.beginPath();c.arc(W-90,28,7,0,7);c.fill();c.fillStyle='#e8f0ec';c.fillText('REC',W-76,34);}
 c.textAlign='right';c.fillStyle='#e8f0ec';c.fillText(w.clock(),W-22,H-20);c.textAlign='left';c.fillText(nightLabel(w.night).toUpperCase(),22,H-20);
 if(w.messageTime>0&&w.message&&mode==='play'){c.font='600 15px system-ui';const tw=c.measureText(w.message).width+28;c.fillStyle='#000c';c.beginPath();c.roundRect(W/2-tw/2,H-70,tw,32,8);c.fill();c.fillStyle='#dfeae6';c.textAlign='center';c.fillText(w.message,W/2,H-49);}
 if(w.report){const p=w.report.t/REPORT_TIME;c.fillStyle='#000a';c.fillRect(W/2-150,70,300,40);c.fillStyle='#7fd8c0';c.fillRect(W/2-146,96,292*p,8);c.font='600 14px "Courier New",monospace';c.textAlign='center';c.fillText('FILING REPORT…',W/2,90);}
 if(flash>0){c.fillStyle=`rgba(255,${flash>.5?60:255},${flash>.5?60:255},${flash*.3})`;c.fillRect(0,0,W,H);}
 c.restore();
}
function events(){for(const e of w.events.splice(0)){switch(e.kind){
 case 'switch':staticT=.18;sfx.noise(.12,{freq:3000,vol:.06,filter:'highpass'});break;
 case 'peek':sfx.tone(1200,.05,{type:'square',vol:.04});sfx.noise(.15,{freq:5000,vol:.05,filter:'highpass',delay:.04});break;
 case 'spawn':if(Math.random()<.5)sfx.tone(60+Math.random()*30,1.2,{type:'sine',vol:.05,attack:.4});break;
 case 'filing':sfx.tone(700,.06,{type:'square',vol:.04});sfx.tone(900,.06,{type:'square',vol:.04,delay:.1});break;
 case 'fixed':staticT=.35;flash=.4;sfx.noise(.4,{freq:2000,vol:.1});sfx.chord([523,784],.3,{type:'triangle',vol:.07,spread:.06});break;
 case 'wrong':flash=.9;sfx.tone(180,.4,{type:'sawtooth',vol:.07});break;
 case 'warning':for(let i=0;i<3;i++)sfx.tone(440,.25,{type:'sine',vol:.06,delay:i*.4,slide:.8});break;
 case 'win':setTimeout(()=>finish(true),600);sfx.chord([392,523,659,784],1.2,{type:'sine',vol:.08,spread:.2});break;
 case 'lose':staticT=1.5;setTimeout(()=>finish(false),1500);sfx.noise(1.4,{freq:1200,vol:.16});break;
}}}
function finish(won){mode='done';sfx.stop();save.best=Math.max(save.best,w.score);if(won){save.nights[w.night]=true;save.level=Math.max(save.level,w.night+1);}persist();
 const missed=w.active.map(a=>`CAM ${a.room+1} — ${CATEGORIES.find(c=>c.id===a.cat).name.toLowerCase()}`);
 show(`<p class="eyebrow">${nightLabel(w.night)} · ${won?'shift complete':'shift ended'}</p><h2>${won?'You made it to morning.':'Clocking out early.'}</h2><p>${w.message}</p><div class="stats"><div><small>Anomalies reported</small><b>${w.found}</b></div><div><small>False reports</small><b>${w.wrong}</b></div><div><small>Score</small><b>${w.score.toLocaleString()}</b></div></div>${missed.length?`<p style="font-size:13px">Still unreported: ${missed.join(' · ')}</p>`:''}
 <div class="row">${won?`<button class="primary" id="next">${nightLabel(w.night+1)}</button>`:''}<button ${won?'':'class="primary"'} id="again">${won?'Replay night':'Try again'}</button><button id="nights">All nights</button></div>${won&&w.night===NIGHTS.length?'<p>🌅 Seven nights survived. Overtime shifts are now open — how long can you last?</p>':''}`);
 $('#next')&&($('#next').onclick=()=>start(w.night+1));$('#again').onclick=()=>start(w.night);$('#nights').onclick=menu;}
function pause(){if(mode==='play'){mode='pause';sfx.pause(true);show(`<p class="eyebrow">Paused</p><h2>Coffee break</h2><p>The cameras are frozen while you’re away.</p><div class="row"><button class="primary" id="resume">Back to the monitors</button><button id="quit">Quit shift</button></div>`);$('#resume').onclick=resume;$('#quit').onclick=()=>{sfx.pause(false);menu();};}else if(mode==='pause')resume();}
function resume(){mode='play';sfx.pause(false);hide();last=performance.now();}
addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;sfx.unlock();if(e.code==='KeyP'||e.code==='Escape'){pause();return;}if(mode!=='play'||!w)return;
 const d=/^Digit([1-8])$/.exec(e.code);if(d)w.switchCam(Number(d[1])-1);
 if(e.code==='ArrowRight'){e.preventDefault();w.switchCam((w.camera+1)%w.cams);}if(e.code==='ArrowLeft'){e.preventDefault();w.switchCam((w.camera+w.cams-1)%w.cams);}
 if(e.code==='Space'){e.preventDefault();w.peek();}
 const cat=CATEGORIES.find(c=>'Key'+c.key===e.code);if(cat)w.file(cat.id);});
$('#peek').onclick=()=>{sfx.unlock();if(mode==='play')w.peek();};$('#pause').onclick=pause;
$('#sound').onclick=()=>{sfx.unlock();sfx.setMuted(!sfx.muted);sync();};$('#music').onclick=()=>{sfx.unlock();sfx.setMusic(!sfx.music);sync();};
function sync(){$('#sound').setAttribute('aria-pressed',String(!sfx.muted));$('#music').setAttribute('aria-pressed',String(sfx.music));}
addEventListener('blur',()=>{if(mode==='play')pause();});
let uiT=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;staticT=Math.max(0,staticT-dt);flash=Math.max(0,flash-dt*1.5);
 if(w){if(mode==='play'){w.step(dt);events();sfx.play(DRONE);}else if(mode==='done'||mode==='brief')events();draw();uiT-=dt;if(uiT<=0){uiT=.15;ui();}}
 requestAnimationFrame(frame);}
sync();w=new Watch(Math.min(save.level,NIGHTS.length));buildCams();buildReport();menu();requestAnimationFrame(frame);
window.__oh=()=>w;
