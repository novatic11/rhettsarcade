// Odd Hours 2.0 — anomaly watch logic. Pure; scenes are data, drawing lives in scene.js.
export const CATEGORIES=[
 {id:'missing',name:'Missing object',key:'M'},{id:'moved',name:'Moved object',key:'V'},{id:'extra',name:'Extra object',key:'X'},
 {id:'altered',name:'Altered object',key:'A'},{id:'intruder',name:'Intruder',key:'I'},{id:'light',name:'Lighting',key:'L'},{id:'watcher',name:'Something watching',key:'W'}
];
// Objects: t type, x/y floor anchor, s scale, c color, v variant, txt label. Movable objects can be moved/hidden.
export const ROOMS=[
 {name:'Front Lobby',wall:'#4a5560',floor:'#3a332c',objects:[
  {t:'door',x:120,y:330,s:1},{t:'sign',x:480,y:90,s:1,txt:'MUNICIPAL MUSEUM',c:'#c9a75e'},{t:'desk',x:480,y:420,s:1},{t:'computer',x:450,y:352,s:.8},{t:'clock',x:760,y:120,s:1,v:3},{t:'plant',x:230,y:420,s:1},{t:'plant',x:860,y:430,s:1.1},{t:'bench',x:700,y:470,s:1},{t:'stanchion',x:330,y:470,s:1},{t:'poster',x:300,y:170,s:1,c:'#7a9cc6',txt:'DINOSAURS'},{t:'lamp',x:600,y:330,s:1},{t:'bin',x:560,y:470,s:1}]},
 {name:'Portrait Gallery',wall:'#5a3f3f',floor:'#3b2c26',objects:[
  {t:'portrait',x:170,y:170,s:1,c:'#2f5a7a',v:0},{t:'portrait',x:390,y:160,s:1.15,c:'#6a2f3a',v:1},{t:'portrait',x:610,y:170,s:1,c:'#3a6a3f',v:2},{t:'portrait',x:830,y:165,s:1.05,c:'#5a4a7a',v:3},{t:'sconce',x:280,y:110,s:1},{t:'sconce',x:720,y:110,s:1},{t:'bench',x:480,y:470,s:1.2},{t:'stanchion',x:250,y:440,s:1},{t:'stanchion',x:720,y:440,s:1},{t:'bust',x:880,y:420,s:1},{t:'rug',x:480,y:510,s:1,c:'#7a2f2f'}]},
 {name:'Sculpture Hall',wall:'#626a70',floor:'#4a4a48',objects:[
  {t:'column',x:90,y:330,s:1},{t:'column',x:910,y:330,s:1},{t:'window',x:480,y:130,s:1},{t:'statue',x:250,y:430,s:1,v:0},{t:'statue',x:480,y:420,s:1.15,v:1},{t:'statue',x:710,y:430,s:1,v:2},{t:'vase',x:840,y:470,s:1,c:'#3a6aa0'},{t:'chandelier',x:480,y:20,s:1},{t:'plant',x:150,y:480,s:.9},{t:'sign',x:230,y:70,s:.5,txt:'PLEASE DO NOT TOUCH',c:'#ddd'}]},
 {name:'Natural History',wall:'#4a5a4a',floor:'#3e3a30',objects:[
  {t:'skull',x:300,y:420,s:1.2},{t:'skeleton',x:680,y:430,s:1},{t:'case',x:880,y:450,s:.9,c:'#7ad0e0'},{t:'globe',x:120,y:440,s:1},{t:'sign',x:780,y:250,s:.6,txt:'CRETACEOUS',c:'#e0c080'},{t:'poster',x:520,y:150,s:1.1,c:'#7a9c6a',txt:'FOSSILS'},{t:'clock',x:850,y:120,s:.8,v:9},{t:'plant',x:500,y:480,s:.8},{t:'lamp',x:200,y:330,s:1}]},
 {name:'Ancient Wing',wall:'#6a5636',floor:'#4a3a24',objects:[
  {t:'sarcophagus',x:480,y:440,s:1},{t:'mask',x:200,y:180,s:1,c:'#d9a640'},{t:'mask',x:760,y:180,s:1,c:'#40a0a0'},{t:'vase',x:150,y:450,s:1.2,c:'#b0603a'},{t:'vase',x:820,y:455,s:1,c:'#7a4a2a'},{t:'torch',x:330,y:220,s:1},{t:'torch',x:630,y:220,s:1},{t:'case',x:300,y:470,s:.8,c:'#f05a7a'},{t:'sign',x:480,y:90,s:.8,txt:'ANCIENT WORLDS',c:'#e8c070'}]},
 {name:'Gift Shop',wall:'#5a4a66',floor:'#3a3440',objects:[
  {t:'shelf',x:200,y:330,s:1},{t:'shelf',x:760,y:330,s:1},{t:'bear',x:170,y:250,s:1,c:'#a0703a'},{t:'bear',x:240,y:250,s:.8,c:'#e0a0b0'},{t:'globe',x:780,y:255,s:.5},{t:'register',x:480,y:420,s:1},{t:'balloon',x:620,y:230,s:1,c:'#e04a5a'},{t:'sign',x:480,y:90,s:1,txt:'GIFTS',c:'#f0c0e0'},{t:'rack',x:360,y:470,s:1},{t:'plant',x:900,y:470,s:1}]},
 {name:'Planetarium',wall:'#262a44',floor:'#2a2a36',objects:[
  {t:'planets',x:480,y:40,s:1},{t:'telescope',x:300,y:450,s:1},{t:'chart',x:700,y:170,s:1},{t:'bench',x:620,y:480,s:1},{t:'door',x:880,y:330,s:1},{t:'window',x:180,y:140,s:.8},{t:'clock',x:470,y:265,s:.6,v:0},{t:'lamp',x:60,y:330,s:1}]},
 {name:'Archive Basement',wall:'#3e3e38',floor:'#2e2c28',objects:[
  {t:'bookshelf',x:180,y:330,s:1},{t:'bookshelf',x:420,y:330,s:1},{t:'cabinet',x:650,y:330,s:1},{t:'box',x:780,y:470,s:1},{t:'box',x:840,y:430,s:.8},{t:'desklamp',x:770,y:330,s:.8},{t:'pipe',x:480,y:30,s:1},{t:'door',x:900,y:330,s:1},{t:'sign',x:180,y:60,s:.6,txt:'RECORDS 1890–1960',c:'#ccc'},{t:'chair',x:560,y:470,s:1}]}
];
const EXTRAS=['chair','doll','bucket','balloon','handprint','bear','vase','box','umbrella','shoe'];
const INTRUDERS=['visitor','tall','child','guard'];
export const NIGHTS=[
 {cams:4,gap:[38,52],max:4,subtle:0},{cams:5,gap:[32,46],max:4,subtle:.15},{cams:6,gap:[28,40],max:4,subtle:.3},{cams:7,gap:[25,36],max:5,subtle:.45},
 {cams:8,gap:[22,32],max:5,subtle:.55},{cams:8,gap:[19,28],max:5,subtle:.7},{cams:8,gap:[16,24],max:5,subtle:.85}
];
export const NIGHT_LENGTH=300,REPORT_TIME=3;
export function rng(seed){let s=(seed>>>0)||1;return ()=>{s=(Math.imul(s^s>>>15,2246822519)+0x9e3779b9)>>>0;s^=s<<7;s>>>=0;return s/4294967296;};}
export const nightConfig=n=>n<=NIGHTS.length?NIGHTS[n-1]:{cams:8,gap:[Math.max(9,15-(n-8)),Math.max(14,22-(n-8))],max:6,subtle:.95};

export class Watch{
 constructor(night=1,random=Math.random){
  this.night=night;this.random=random;this.cfg=nightConfig(night);this.cams=this.cfg.cams;this.camera=0;this.time=0;this.length=NIGHT_LENGTH;
  this.rooms=ROOMS.slice(0,this.cams).map((r,i)=>({id:i,name:r.name,objects:r.objects.map((o,k)=>({...o,id:k})),extras:[],light:null,lastSeen:0}));
  this.active=[];this.score=0;this.found=0;this.wrong=0;this.maxWrong=5;this.status='play';this.report=null;this.events=[];this.peeks=4;this.peeking=false;
  this.next=this.cfg.gap[0]*.6;this.message='Your shift starts at midnight. Switch cameras and learn what each room looks like.';this.messageTime=6;this.history=[];this.nextId=1;
 }
 rand(a,b){return a+(b-a)*this.random();}
 pick(a){return a[Math.floor(this.random()*a.length)%a.length];}
 clock(){const m=Math.floor(this.time/this.length*360);const h=Math.floor(m/60);return (h===0?12:h)+':'+String(m%60).padStart(2,'0')+' AM';}
 switchCam(i){if(i>=0&&i<this.cams&&i!==this.camera){this.camera=i;this.events.push({kind:'switch'});this.peeking=false;}}
 peek(){if(this.peeking){this.peeking=false;return;}if(this.peeks<=0){this.say('No archive photos left tonight.');return;}this.peeks--;this.peeking=true;this.events.push({kind:'peek'});}
 say(m,t=3){this.message=m;this.messageTime=t;}
 spawn(){
  const options=this.rooms.filter(r=>r.id!==this.camera&&this.active.filter(a=>a.room===r.id).length<2);if(!options.length)return null;
  const room=this.pick(options),subtle=this.random()<this.cfg.subtle;
  const cats=['missing','moved','extra','altered','intruder','light','watcher'];
  for(let tries=0;tries<20;tries++){const cat=this.pick(cats),a=this.make(room,cat,subtle);if(a){a.id=this.nextId++;a.room=room.id;a.cat=cat;a.at=this.time;this.active.push(a);this.events.push({kind:'spawn',room:room.id});return a;}}
  return null;
 }
 make(room,cat,subtle){
  const busy=new Set(this.active.filter(a=>a.room===room.id&&a.obj!=null).map(a=>a.obj)),free=room.objects.filter(o=>!busy.has(o.id)&&!o.hidden&&!o.moved);
  const movable=free.filter(o=>!['door','window','column','pipe','planets','chandelier','rug'].includes(o.t));
  if(cat==='missing'){const pool=subtle?movable.filter(o=>o.s<1.1):movable.filter(o=>!['sign','sconce','torch'].includes(o.t));if(!pool.length)return null;const o=this.pick(pool);o.hidden=true;return {obj:o.id,undo:()=>{o.hidden=false;}};}
  if(cat==='moved'){const pool=movable.filter(o=>o.y>300||['portrait','poster','mask','clock','chart'].includes(o.t));if(!pool.length)return null;const o=this.pick(pool),d=(subtle?55:110)*(this.random()<.5?-1:1);const nx=Math.max(70,Math.min(890,o.x+d));if(Math.abs(nx-o.x)<40)return null;const ox=o.x;o.x=nx;o.moved=true;return {obj:o.id,undo:()=>{o.x=ox;o.moved=false;}};}
  if(cat==='altered'){const pool=free.filter(o=>!['door','pipe','column'].includes(o.t));if(!pool.length)return null;const o=this.pick(pool),kinds=[];
   if(o.c)kinds.push('color');kinds.push('size');if(['portrait','sign','poster','mask','chart','bear','statue','bust'].includes(o.t))kinds.push('flip');if(o.t==='portrait'||o.t==='bust'||o.t==='statue')kinds.push('face');if(o.t==='sign'||o.t==='poster')kinds.push('text');if(o.t==='clock')kinds.push('clock');
   const k=this.pick(kinds),save={c:o.c,s:o.s,flip:o.flip,face:o.face,txt:o.txt,v:o.v};
   if(k==='color')o.c=shiftHue(o.c,subtle?60:150);else if(k==='size')o.s*=subtle?(this.random()<.5?.8:1.22):(this.random()<.5?.6:1.5);else if(k==='flip')o.flip=true;else if(k==='face')o.face=this.pick(['eyes','smile','blank','turned']);else if(k==='text')o.txt=this.pick(['DON’T LOOK BACK','STAY AWAKE','WE SEE YOU','GO HOME','IT’S STILL HERE','NO EXIT',o.txt.split('').reverse().join('')]);else if(k==='clock')o.v=(o.v+this.pick([3,5,6,7]))%12;
   o.altered=true;return {obj:o.id,undo:()=>{Object.assign(o,save);o.altered=false;}};}
  if(cat==='extra'){const x=this.rand(140,820),y=this.rand(420,500);if(room.objects.some(o=>!o.hidden&&o.y>380&&Math.abs(o.x-x)<70))return null;const e={t:this.pick(EXTRAS),x,y,s:subtle?.7:1,c:this.pick(['#c04a4a','#4a7ac0','#d0b040','#7a50a0'])};room.extras.push(e);return {undo:()=>{room.extras=room.extras.filter(z=>z!==e);}};}
  if(cat==='intruder'){if(room.extras.some(e=>INTRUDERS.includes(e.t)))return null;const x=this.rand(150,820);if(room.objects.some(o=>!o.hidden&&o.y>380&&Math.abs(o.x-x)<60))return null;const e={t:this.pick(INTRUDERS),x,y:this.rand(430,490),s:subtle?.8:1,c:'#111'};room.extras.push(e);return {undo:()=>{room.extras=room.extras.filter(z=>z!==e);}};}
  if(cat==='light'){if(room.light)return null;room.light=this.pick(subtle?['dim','red','flicker']:['dark','red','flicker','green']);return {undo:()=>{room.light=null;}};}
  if(cat==='watcher'){const existing=room.extras.some(e=>['eyes','shadow','face'].includes(e.t));if(existing)return null;const e={t:this.pick(['eyes','shadow','face']),x:this.rand(120,840),y:this.rand(110,300),s:subtle?.7:1};room.extras.push(e);return {undo:()=>{room.extras=room.extras.filter(z=>z!==e);}};}
  return null;
 }
 file(cat){
  if(this.status!=='play'||this.report)return false;this.report={cat,room:this.camera,t:0};this.events.push({kind:'filing'});return true;
 }
 resolveReport(){
  const {cat,room}=this.report;this.report=null;const hit=this.active.filter(a=>a.room===room&&a.cat===cat).sort((a,b)=>a.at-b.at)[0];
  if(hit){hit.undo();this.active=this.active.filter(a=>a!==hit);this.found++;const fast=Math.max(0,60-(this.time-hit.at));const gain=100+Math.round(fast*2);this.score+=gain;this.history.push({room,cat,ok:true});this.events.push({kind:'fixed',gain});this.say('Anomaly fixed. +'+gain);}
  else{this.wrong++;this.score=Math.max(0,this.score-50);this.history.push({room,cat,ok:false});this.events.push({kind:'wrong'});const other=this.active.some(a=>a.room===room);this.say(other?'No '+CATEGORIES.find(c=>c.id===cat).name.toLowerCase()+' here — but something is off in this room.':'No anomaly found in this room. ('+this.wrong+'/'+this.maxWrong+' false reports)');if(this.wrong>=this.maxWrong)this.end('lose','Too many false reports. Security relieved you of duty.');}
 }
 step(dt){
  if(this.status!=='play')return;this.time+=dt;if(this.messageTime>0)this.messageTime-=dt;
  this.rooms[this.camera].lastSeen=this.time;
  if(this.report){this.report.t+=dt;if(this.report.t>=REPORT_TIME)this.resolveReport();}
  this.next-=dt;if(this.next<=0&&this.time<this.length-8){this.spawn();this.next=this.rand(...this.cfg.gap);}
  if(this.active.length>=this.cfg.max)return this.end('lose','Too many anomalies went unreported. The museum is no longer yours to watch.');
  if(this.active.length===this.cfg.max-1&&!this.warned){this.warned=true;this.events.push({kind:'warning'});this.say('Something feels very wrong. Check every camera.',4);}
  if(this.active.length<this.cfg.max-1)this.warned=false;
  if(this.time>=this.length){this.score+=500+this.peeks*50;this.end('win','6:00 AM. The sun is up and the museum is quiet.');}
 }
 end(status,msg){this.status=status;this.message=msg;this.messageTime=99;this.events.push({kind:status});}
}
export function shiftHue(hex,deg){const n=parseInt(hex.slice(1),16);let r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60;}h=(h+deg)%360;s=Math.max(s,.45);return `hsl(${Math.round(h)},${Math.round(s*100)}%,${Math.round(Math.max(.3,l)*100)}%)`;}
