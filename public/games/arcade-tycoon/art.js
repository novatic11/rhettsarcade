// Procedural art for Arcade Tycoon. Everything is drawn in tile units via ctx transforms.
import {TYPES} from './model.js';
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=v=>Math.max(0,Math.min(255,Math.round(f>0?v+(255-v)*f:v*(1+f))));return `rgb(${m(r)},${m(g)},${m(b)})`;};
export {shade};

// Draws an item whose footprint is w×h tiles at the current origin (tile size = s pixels).
export function drawItem(c,type,s,o={}){
 const t=TYPES[type],w=(o.rot?1:(t.w||1))*s,h=(o.rot?(t.w||1):1)*s,col=t.color,time=o.time||0,on=!o.broken,busy=o.busy;
 c.save();
 // shadow
 c.fillStyle='rgba(0,0,0,.28)';rr(c,s*.08,s*.16,w-s*.08,h-s*.1,s*.12);c.fill();
 const body=(x,y,ww,hh,r=s*.12,fill=col)=>{const g=c.createLinearGradient(0,y,0,y+hh);g.addColorStop(0,shade(fill,.25));g.addColorStop(1,shade(fill,-.3));c.fillStyle=g;rr(c,x,y,ww,hh,r);c.fill();c.strokeStyle=shade(fill,-.5);c.lineWidth=Math.max(1,s*.03);c.stroke();};
 const screen=(x,y,ww,hh,hue)=>{c.fillStyle=on?'#0b1630':'#151515';rr(c,x,y,ww,hh,s*.05);c.fill();if(on){c.save();c.beginPath();c.rect(x,y,ww,hh);c.clip();const k=(time*(busy?3:1))%1;c.fillStyle=`hsla(${hue},90%,62%,.85)`;for(let i=0;i<4;i++){const px=x+((i*.27+k)%1)*ww,py=y+hh*(.25+.5*((i*37)%10)/10);c.fillRect(px,py,ww*.12,hh*.12);}c.fillStyle=`hsla(${hue+60},90%,70%,.35)`;c.fillRect(x,y+hh*.78,ww,hh*.08);c.restore();c.fillStyle='rgba(255,255,255,.12)';c.fillRect(x,y,ww,hh*.18);}};
 switch(type){
  case 'cabinet':case 'drums':case 'photo':case 'coinpush':case 'claw':case 'vr':case 'skeeball':case 'pinball':{
   if(type==='pinball'){body(s*.14,s*.06,w-s*.28,h-s*.12);c.fillStyle=on?'#123':'#222';rr(c,s*.22,s*.14,w-s*.44,h-s*.36,s*.06);c.fill();if(on){c.fillStyle='#ffe07a';for(const [px,py]of [[.38,.3],[.62,.36],[.5,.5]]){c.beginPath();c.arc(px*s,py*s,s*.06,0,7);c.fill();}c.fillStyle='#fff';const bx=.3+.4*Math.abs(Math.sin(time*(busy?4:1)));c.beginPath();c.arc(bx*s,(.4+.15*Math.cos(time*3))*s,s*.035,0,7);c.fill();}c.fillStyle='#ddd';c.fillRect(s*.36,h-s*.24,s*.1,s*.03);c.fillRect(s*.54,h-s*.24,s*.1,s*.03);break;}
   if(type==='claw'){body(s*.12,s*.04,w-s*.24,h-s*.1);c.fillStyle='rgba(180,230,255,.25)';rr(c,s*.2,s*.1,w-s*.4,h*.55,s*.04);c.fill();const hues=['#ff9ac8','#9ae0ff','#ffe07a','#a6f0a0'];for(let i=0;i<5;i++){c.fillStyle=hues[i%4];c.beginPath();c.arc(s*(.28+i*.11),s*.56,s*.07,0,7);c.fill();}const cx=s*(.5+.18*Math.sin(time*(busy?2.5:.6)));c.strokeStyle='#ccc';c.lineWidth=s*.02;c.beginPath();c.moveTo(cx,s*.12);c.lineTo(cx,s*.3);c.stroke();c.beginPath();c.arc(cx,s*.33,s*.05,0,Math.PI);c.stroke();c.fillStyle=shade(col,-.2);c.fillRect(s*.12,h-s*.28,w-s*.24,s*.18);break;}
   if(type==='skeeball'||type==='coinpush'){body(s*.16,s*.04,w-s*.32,h-s*.08);c.fillStyle=type==='skeeball'?'#5b3a22':'#3a3a52';rr(c,s*.24,s*.12,w-s*.48,h-s*.3,s*.08);c.fill();if(type==='skeeball'){for(const [r,yy]of [[.1,.26],[.07,.4]]){c.strokeStyle='#ffd27a';c.lineWidth=s*.025;c.beginPath();c.arc(s*.5,yy*s,r*s,0,7);c.stroke();}}else{c.fillStyle='#ffd27a';for(let i=0;i<9;i++){c.beginPath();c.arc(s*(.3+(i%3)*.2+.02*Math.sin(time+i)),s*(.3+Math.floor(i/3)*.12),s*.045,0,7);c.fill();}}c.fillStyle='#f6e7b0';c.font=`700 ${s*.11}px system-ui`;c.textAlign='center';c.fillText('TIX',s*.5,h-s*.12);break;}
   body(s*.14,s*.04,w-s*.28,h-s*.1);
   const hue={cabinet:200,drums:20,photo:55,vr:160}[type]??200;
   screen(s*.22,s*.12,w-s*.44,s*.36,hue);
   if(type==='drums'){for(let i=0;i<3;i++){c.fillStyle=['#ff6b6b','#ffd27a','#7cc6ff'][i];c.beginPath();c.ellipse(s*(.3+i*.2),s*.66,s*.08,s*.05,0,0,7);c.fill();}}
   else if(type==='photo'){c.fillStyle='#b23a48';c.fillRect(s*.16,s*.52,w-s*.32,s*.36);c.fillStyle='#7e2632';for(let i=0;i<4;i++)c.fillRect(s*(.2+i*.16),s*.52,s*.03,s*.36);}
   else if(type==='vr'){c.strokeStyle='#bff';c.lineWidth=s*.03;c.beginPath();c.arc(s*.5,s*.66,s*.2,0,7);c.stroke();c.fillStyle='#223';rr(c,s*.38,s*.6,s*.24,s*.1,s*.04);c.fill();}
   else{c.fillStyle='#222';rr(c,s*.24,s*.56,w-s*.48,s*.2,s*.04);c.fill();c.fillStyle='#e33';c.beginPath();c.arc(s*.36,s*.65,s*.045,0,7);c.fill();c.fillStyle='#ffd23f';c.beginPath();c.arc(s*.56,s*.62,s*.035,0,7);c.fill();c.beginPath();c.arc(s*.66,s*.68,s*.035,0,7);c.fill();}
   break;}
  case 'hockey':{body(s*.06,s*.14,w-s*.12,h-s*.26);c.fillStyle='#e9f6ff';rr(c,s*.16,s*.24,w-s*.32,h-s*.46,s*.08);c.fill();c.strokeStyle='#e45';c.lineWidth=s*.02;c.beginPath();c.moveTo(w/2,s*.24);c.lineTo(w/2,h-s*.22);c.stroke();c.beginPath();c.arc(w/2,h/2,s*.1,0,7);c.stroke();const px=w/2+(w*.3)*Math.sin(time*(busy?5:.4));c.fillStyle='#223';c.beginPath();c.arc(px,h/2+s*.06*Math.cos(time*7),s*.05,0,7);c.fill();break;}
  case 'racer':case 'lightgun':case 'dance':case 'bowling':case 'simulator':{
   if(type==='dance'){body(s*.06,s*.06,w-s*.12,h-s*.12);const k=Math.floor(time*(busy?6:1));for(let i=0;i<8;i++){const x=s*.16+(i%4)*(w-s*.32)/4,y=s*.2+Math.floor(i/4)*s*.32;c.fillStyle=(i+k)%3===0&&on?'#fff3a8':(i%2?'#b79cf2':'#7a5fc9');rr(c,x+s*.02,y,(w-s*.32)/4-s*.04,s*.28,s*.04);c.fill();}break;}
   if(type==='bowling'){body(s*.04,s*.18,w-s*.08,h-s*.34);c.fillStyle='#d8b07a';rr(c,s*.14,s*.3,w-s*.4,h-s*.58,s*.03);c.fill();c.fillStyle='#fff';for(let i=0;i<6;i++){c.beginPath();c.arc(w-s*.42+(i%3)*s*.07,s*.38+Math.floor(i/3)*s*.12,s*.035,0,7);c.fill();}const bx=s*.2+(w-s*.8)*((time*(busy?.8:0))%1);c.fillStyle='#3554a0';c.beginPath();c.arc(bx,h/2,s*.06,0,7);c.fill();break;}
   body(s*.06,s*.04,w-s*.12,h-s*.1);const hue={racer:0,lightgun:200,simulator:230}[type];screen(s*.16,s*.1,w-s*.32,s*.36,hue);
   if(type==='racer'){for(const x of [w*.28,w*.72]){c.strokeStyle='#222';c.lineWidth=s*.05;c.beginPath();c.arc(x,s*.62,s*.1,0,7);c.stroke();}}
   else if(type==='lightgun'){c.fillStyle='#ff9a3c';c.fillRect(w*.25,s*.6,s*.16,s*.08);c.fillStyle='#3cf';c.fillRect(w*.65,s*.6,s*.16,s*.08);}
   else{c.fillStyle='#2a3a6a';rr(c,s*.2,s*.52,w-s*.4,s*.32,s*.1);c.fill();c.fillStyle='#7fa4f2';c.fillRect(w*.3,s*.6,w*.4,s*.04);}
   break;}
  case 'snack':case 'soda':{body(s*.08,s*.06,w-s*.16,h-s*.14);c.fillStyle=type==='snack'?'#c84':'#28a';c.fillRect(s*.08,s*.06,w-s*.16,s*.16);c.fillStyle='#fff';for(let i=0;i<4;i++){c.fillRect(s*(.12+i*.2),s*.06,s*.1,s*.16);}c.fillStyle=type==='snack'?'#ffd27a':'#bfe8ff';c.font=`700 ${s*.13}px system-ui`;c.textAlign='center';c.fillText(type==='snack'?'SNACKS':'SODA',w/2,s*.5);c.fillStyle='#fff8';c.fillRect(s*.18,s*.6,w-s*.36,s*.18);break;}
  case 'restroom':{body(s*.06,s*.06,w-s*.12,h-s*.12,s*.06,'#c8d4dc');c.fillStyle='#5a7080';rr(c,s*.32,s*.24,s*.36,s*.56,s*.04);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(s*.5,s*.4,s*.05,0,7);c.fill();c.fillRect(s*.46,s*.47,s*.08,s*.18);break;}
  case 'prizes':{body(s*.04,s*.1,w-s*.08,h-s*.22);c.fillStyle='#fff3f9';rr(c,s*.12,s*.18,w-s*.24,s*.3,s*.04);c.fill();const hues=['#ff7a9c','#7cd4ff','#ffe07a','#a7f08f','#c4a3ff'];for(let i=0;i<7;i++){c.fillStyle=hues[i%5];c.beginPath();c.arc(s*.22+i*(w-s*.44)/6,s*.33,s*.06,0,7);c.fill();}c.fillStyle='#7a2848';c.font=`700 ${s*.13}px system-ui`;c.textAlign='center';c.fillText('PRIZES',w/2,h-s*.2);break;}
  case 'bench':{c.fillStyle='#6b4a32';rr(c,s*.08,s*.36,w-s*.16,s*.3,s*.06);c.fill();c.fillStyle='#a88466';for(let i=0;i<3;i++)rr(c,s*.1,s*(.38+i*.09),w-s*.2,s*.06,s*.02),c.fill();break;}
  case 'plant':{c.fillStyle='#8a5a3a';rr(c,s*.32,s*.56,s*.36,s*.32,s*.06);c.fill();c.fillStyle='#4fa25a';for(let i=0;i<6;i++){const a=i/6*Math.PI*2+Math.sin(time*.8)*.05;c.beginPath();c.ellipse(s*.5+Math.cos(a)*s*.14,s*.42+Math.sin(a)*s*.12,s*.13,s*.07,a,0,7);c.fill();}c.fillStyle='#7fd18a';c.beginPath();c.arc(s*.5,s*.42,s*.1,0,7);c.fill();break;}
  case 'bin':{c.fillStyle='#55636c';rr(c,s*.3,s*.3,s*.4,s*.52,s*.06);c.fill();c.fillStyle='#7d8c95';rr(c,s*.26,s*.24,s*.48,s*.1,s*.04);c.fill();break;}
  case 'neon':{c.fillStyle='#222833';rr(c,s*.1,s*.24,s*.8,s*.5,s*.08);c.fill();const glow=.6+.4*Math.sin(time*3);c.shadowColor='#ff7ad9';c.shadowBlur=s*.3*glow;c.strokeStyle=`rgba(255,122,217,${.6+.4*glow})`;c.lineWidth=s*.05;c.beginPath();c.arc(s*.38,s*.49,s*.12,0,7);c.stroke();c.strokeStyle=`rgba(122,240,255,${.6+.4*glow})`;c.shadowColor='#7af0ff';c.beginPath();c.moveTo(s*.56,s*.38);c.lineTo(s*.72,s*.6);c.moveTo(s*.72,s*.38);c.lineTo(s*.56,s*.6);c.stroke();c.shadowBlur=0;break;}
  case 'fountain':{c.fillStyle='#4a6a80';c.beginPath();c.arc(s*.5,s*.55,s*.38,0,7);c.fill();c.fillStyle='#3cb4e0';c.beginPath();c.arc(s*.5,s*.55,s*.3,0,7);c.fill();for(let i=0;i<6;i++){const a=i/6*7+time;c.fillStyle=`hsla(${(i*60+time*60)%360},90%,75%,.85)`;c.beginPath();c.arc(s*.5+Math.cos(a)*s*.18,s*.55+Math.sin(a)*s*.12-Math.abs(Math.sin(time*3+i))*s*.12,s*.04,0,7);c.fill();}break;}
  case 'statue':{c.fillStyle='#6b6b78';rr(c,s*.22,s*.62,s*.56,s*.26,s*.04);c.fill();const g=c.createRadialGradient(s*.44,s*.3,s*.02,s*.5,s*.36,s*.28);g.addColorStop(0,'#fff4c0');g.addColorStop(1,'#d39a2a');c.fillStyle=g;c.beginPath();c.arc(s*.5,s*.38,s*.26,0,7);c.fill();c.fillStyle='#5c3a05';c.beginPath();c.arc(s*.42,s*.34,s*.03,0,7);c.arc(s*.58,s*.34,s*.03,0,7);c.fill();c.strokeStyle='#5c3a05';c.lineWidth=s*.025;c.beginPath();c.arc(s*.5,s*.4,s*.1,.2,Math.PI-.2);c.stroke();break;}
  default:body(s*.1,s*.1,w-s*.2,h-s*.2);
 }
 if(o.broken){c.fillStyle='rgba(20,20,20,.45)';rr(c,0,0,w,h,s*.1);c.fill();const k=Math.sin(time*8)>0;c.fillStyle=k?'#ffcc33':'#ff5a3c';c.font=`900 ${s*.38}px system-ui`;c.textAlign='center';c.fillText('⚠',w/2,h/2+s*.12);}
 c.restore();
}

const SKIN=['#f1c7a3','#d9a57c','#b07a52','#7d5236','#f6d6b8'];
export function drawPerson(c,p,s,time,o={}){
 const bob=o.still?0:Math.abs(Math.sin(time*9+p.id))*s*.04,r=s*(o.kid?.14:.17);
 c.save();c.translate(p.x*s,p.y*s);
 c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(0,r*.9,r*1.1,r*.4,0,0,7);c.fill();
 c.translate(0,-bob);
 c.fillStyle=o.shirt||'#888';c.beginPath();c.roundRect(-r*.95,-r*.2,r*1.9,r*1.3,r*.5);c.fill();
 c.fillStyle=SKIN[p.id%SKIN.length];c.beginPath();c.arc(0,-r*.6,r*.72,0,7);c.fill();
 c.fillStyle=o.hair||['#3a2a1e','#1d1d24','#8a5a2a','#d8b46a','#5a3020'][(p.id>>1)%5];c.beginPath();c.arc(0,-r*.82,r*.66,Math.PI*1.05,Math.PI*1.95);c.fill();
 if(o.hat){c.fillStyle=o.hat;c.fillRect(-r*.75,-r*1.38,r*1.5,r*.32);c.fillRect(-r*.4,-r*1.6,r*.8,r*.3);}
 if(o.mascot){c.fillStyle='#ffd27a';c.beginPath();c.arc(0,-r*.6,r*.95,0,7);c.fill();c.fillStyle='#5c3a05';c.beginPath();c.arc(-r*.3,-r*.7,r*.1,0,7);c.arc(r*.3,-r*.7,r*.1,0,7);c.fill();c.fillStyle='#ffd27a';c.beginPath();c.arc(-r*.75,-r*1.4,r*.3,0,7);c.arc(r*.75,-r*1.4,r*.3,0,7);c.fill();}
 if(o.critic){c.fillStyle='#111';c.fillRect(-r*.5,-r*.72,r*.42,r*.18);c.fillRect(r*.08,-r*.72,r*.42,r*.18);}
 if(o.selected){c.strokeStyle='#ffd27a';c.lineWidth=2;c.beginPath();c.arc(0,-r*.2,r*1.6,0,7);c.stroke();}
 c.restore();
}
export function drawThought(c,x,y,s,kind){
 const icons={money:'💸',bored:'🥱',angry:'😠',broken:'🔧',wait:'⏳',hunger:'🍔',thirst:'🥤',bladder:'🚻',energy:'💤',happy:'😄',tickets:'🎟️'};
 c.save();c.translate(x*s,y*s-s*.55);c.fillStyle='#ffffffe8';c.beginPath();c.roundRect(-s*.2,-s*.2,s*.4,s*.32,s*.12);c.fill();c.beginPath();c.arc(-s*.05,s*.16,s*.04,0,7);c.fill();c.font=`${s*.22}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(icons[kind]||'❔',0,-s*.04);c.restore();
}
