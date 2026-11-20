import {box,text,circle} from './runtime.js';

// The world stays in metres of canvas space; the camera never changes the simulation.
const W=960,H=560,TAU=Math.PI*2;
const PAINT=[['#c67d58','#edb785'],['#5d9291','#a5d4c1'],['#9b9c6d','#d9ce9b'],['#6983a5','#a9c5d7'],['#a4676c','#e3a396'],['#65817b','#9eb9a7']];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const weatherNames=['BLUEWATER PIER','THE BREAKWATER','NIGHT FREIGHT','CROSSWIND QUAY','LAST BOAT HOME'];

function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function rounded(c,x,y,w,h,r,fill,stroke){box(c,x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}

function backdrop(c,t,stage){
 const night=(stage-1)%5===2,rough=stage>=5,sky=c.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,night?'#0b1727':'#233e50');sky.addColorStop(.57,night?'#273b50':'#819397');sky.addColorStop(1,'#163d4b');c.fillStyle=sky;c.fillRect(0,0,W,H);
 const sun=c.createRadialGradient(731,198,8,731,198,190);sun.addColorStop(0,night?'#a7c9e526':'#f4d2a241');sun.addColorStop(1,'#f4d2a200');c.fillStyle=sun;c.fillRect(490,0,460,370);
 circle(c,731,198,night?17:31);c.fillStyle=night?'#d4e5e5':'#ead2b2';c.fill();
 c.fillStyle=night?'#94b9c315':'#e3e4d426';
 for(let i=0;i<7;i++){const x=(i*179+t*(i%2?2:-1.5)+1100)%1170-120,y=65+(i*43)%130;c.beginPath();c.ellipse(x,y,100+(i%3)*35,10+(i%3)*4,-.04,0,TAU);c.fill();}
 // Shipyard silhouettes, chimney steam, ladders, and lit warehouse windows.
 for(let i=0;i<11;i++){
  const x=i*99-17,h=45+(i*37)%94,y=338-h;c.fillStyle=i%2?'#274754':'#32505b';c.fillRect(x,y,84,h);
  poly(c,[[x-4,y],[x+42,y-15],[x+88,y]],'#3e5a62');
  for(let dx=10;dx<80;dx+=19)for(let dy=14;dy<h-8;dy+=19){c.fillStyle=(dx+dy+i)%4===0?'#d8c69b8c':'#a2c3c02b';c.fillRect(x+dx,y+dy,9,7);}
  if(i%3===0){c.fillStyle='#28434f';c.fillRect(x+58,y-34,9,35);c.fillStyle='#c5d0c115';for(let j=0;j<4;j++){c.beginPath();c.ellipse(x+62+j*7+Math.sin(t*.2+j)*5,y-43-j*13,9+j*5,8+j*2,.2,0,TAU);c.fill();}}
 }
 for(const [x,y,flip]of[[140,196,1],[784,221,-1]]){
  line(c,x,338,x,y,'#345360',7);line(c,x-41*flip,y-5,x+114*flip,y-37,'#345360',5);line(c,x,y-20,x+114*flip,y-37,'#7992964d',1);line(c,x+90*flip,y-31,x+90*flip,y+47,'#66838a77',1);
  poly(c,[[x-10,y+6],[x+10,y+6],[x+13,338],[x-14,338]],'#294957');
 }
 c.fillStyle='#1a3847';c.fillRect(0,338,W,12);c.fillStyle='#a1b7ac';c.fillRect(0,338,W,2);
 for(let x=13;x<W;x+=42){c.fillStyle='#152f3f';c.fillRect(x,350,10,21);line(c,x,352,x+10,352,'#657f82',2);}
 const sea=c.createLinearGradient(0,350,0,H);sea.addColorStop(0,'#3b626c');sea.addColorStop(1,'#112d40');c.fillStyle=sea;c.fillRect(0,350,W,210);
 // Small broken horizontal reflections are inexpensive and keep the water readable.
 for(let i=0;i<26;i++){
  const y=354+i*8.2;c.strokeStyle=i%3===0?'#b5d0ca35':'#73a3af20';c.lineWidth=i<10?1:1.5;c.beginPath();
  for(let x=-20;x<=980;x+=16){const yy=y+Math.sin(x*.016+t*.9+i*.7)*(rough?2.8:1.8);x===-20?c.moveTo(x,yy):c.lineTo(x,yy);}c.stroke();
 }
 for(let i=0;i<14;i++){const y=357+i*11,w=13+i*1.8,x=731+Math.sin(i*3.6+t*.45)*i*2;line(c,x-w,y,x+w,y,night?'#bacbdb16':'#efd9b126',1.5);}
 const fog=c.createLinearGradient(0,300,0,390);fog.addColorStop(0,'#a9c3c900');fog.addColorStop(.5,'#9bb6b21b');fog.addColorStop(1,'#a9c3c900');c.fillStyle=fog;c.fillRect(0,300,W,90);
}

function cargo(c,b,time=0,held=false){
 const w=b.w||40,h=b.h||28,index=typeof b.color==='number'?b.color:0,paint=PAINT[((index%PAINT.length)+PAINT.length)%PAINT.length],heavy=(b.mass||1)>1.3;
 c.save();c.translate(b.x||0,b.y||0);c.rotate(b.rotation||0);
 const color=typeof b.color==='string'?b.color:paint[0],g=c.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,paint[1]);g.addColorStop(.13,color);g.addColorStop(1,color);
 rounded(c,-w/2+2,-h/2+4,w,h,2,'#05152051');rounded(c,-w/2,-h/2,w,h,2,g,'#172e3a');
 c.fillStyle='#122a374d';c.fillRect(-w/2+2,h/2-5,w-4,3);line(c,-w/2+2,-h/2+2,w/2-2,-h/2+2,paint[1]+'bc');
 // Pressed steel ribs, corner castings, and a different stencil on each container.
 for(let x=-w/2+6;x<w/2-3;x+=6){line(c,x,-h/2+4,x,h/2-5,'#102c3d50',1.3);line(c,x+1,-h/2+4,x+1,h/2-5,'#ecedd829',.7);}
 for(const x of[-w/2+2,w/2-5])for(const y of[-h/2+2,h/2-5]){c.fillStyle='#162c34';c.fillRect(x,y,3,3);c.fillStyle='#bfd3ca77';c.fillRect(x,y,2,1);}
 c.fillStyle=heavy?'#e7c569':'#e2e6cf';c.fillRect(-6,-h/2+6,12,8);line(c,-3,-h/2+9,3,-h/2+9,'#314953',1);line(c,-3,-h/2+11,1,-h/2+11,'#314953',1);
 if(heavy){poly(c,[[-w/2+5,h/2-7],[-w/2+8,h/2-12],[-w/2+11,h/2-7]],'#e4cc8b');text(c,'HEAVY',w/2-6,h/2-6,4,'#e4d6ba','right');}
 else if(index%3===1){line(c,w/2-10,h/2-10,w/2-6,h/2-10,'#dce7d0',1);line(c,w/2-8,h/2-12,w/2-8,h/2-7,'#dce7d0',1);}
 if(held){line(c,-w/2+4,-h/2,0,-h/2-13,'#b1c8c9',1.5);line(c,w/2-4,-h/2,0,-h/2-13,'#b1c8c9',1.5);rounded(c,-w/2-2,-h/2-3,w+4,4,1,'#354e58','#91a9a5');}
 c.restore();
}

function gantry(c,g,t){
 const a=g.anchorY??62,top=a-39,bottom=470;
 // Weathered braced uprights and the moving crosshead follow the tower upward.
 for(const x of[41,919]){
  c.fillStyle='#152c3b';c.fillRect(x-12,Math.min(-2000,top-100),24,bottom-Math.min(-2000,top-100));
  c.fillStyle='#536c74';c.fillRect(x-10,top-60,3,bottom-top+60);c.fillStyle='#0b2131';c.fillRect(x+5,top-60,6,bottom-top+60);
  c.strokeStyle='#72919480';c.lineWidth=1.5;c.beginPath();for(let y=Math.floor((top-60)/45)*45;y<bottom;y+=45){c.moveTo(x-8,y);c.lineTo(x+8,y+35);c.lineTo(x-8,y+35);}c.stroke();
  for(let y=Math.floor(top/90)*90;y<bottom;y+=90){c.fillStyle='#b3c5b2';circle(c,x-6,y,1.5);c.fill();circle(c,x+7,y,1.5);c.fill();}
  rounded(c,x-24,438,48,15,3,'#1b3341','#55727c');
 }
 const rail=c.createLinearGradient(0,top,0,top+28);rail.addColorStop(0,'#748d94');rail.addColorStop(.12,'#405d6c');rail.addColorStop(1,'#1e3747');rounded(c,31,top,898,28,2,rail,'#8da4a4');
 c.strokeStyle='#839b9d66';c.lineWidth=1.3;c.beginPath();for(let x=42;x<914;x+=43){c.moveTo(x,top+3);c.lineTo(x+38,top+24);c.lineTo(x+38,top+3);}c.stroke();
 line(c,35,top+27,925,top+27,'#0b202f',3);line(c,35,top+2,925,top+2,'#b8c8ba',1);
 // A tiny windsock makes wind direction visible before the first drop.
 line(c,868,top-6,868,top-45,'#a0b8b8',1.6);const wind=clamp((g.wind||0)/30,-1,1),end=868+wind*31+Math.sin(t*5)*2;
 poly(c,[[868,top-43],[end,top-37],[end,top-32],[868,top-32]],'#b9ac7b');line(c,868,top-38,end,top-34,'#e7d4a1',2);
 const x=g.x??480;rounded(c,x-24,a-30,48,28,4,'#385a69','#a5bec0');rounded(c,x-17,a-27,34,7,1,'#102d3b');
 for(const dx of[-17,17]){circle(c,x+dx,a-1,5);c.fillStyle='#0a1f2c';c.fill();circle(c,x+dx,a-1,2);c.fillStyle='#829e9f';c.fill();}
 circle(c,x,a-15,7);c.fillStyle='#a9d4d9';c.fill();circle(c,x,a-15,3.5);c.fillStyle='#355a67';c.fill();
 c.strokeStyle='#b8c9c0';c.lineWidth=2;c.beginPath();c.arc(x,a-15,5,t*-1.8,t*-1.8+2.5);c.stroke();
 const hook=g.hook||{x,y:a+145},held=!!g.held;
 line(c,x-4,a-1,hook.x-3,hook.y-(held?26:9),'#617b80',1.5);line(c,x+2,a-1,hook.x+2,hook.y-(held?26:9),'#c2d1bd',1.5);
 if(!held){line(c,hook.x,hook.y-9,hook.x,hook.y,'#c9d8cb',3);c.strokeStyle='#c9d8cb';c.lineWidth=3;c.beginPath();c.arc(hook.x+3,hook.y+1,4,-.6,Math.PI*1.3);c.stroke();}
}

function ship(c,g,t){
 const x=g.bargeX??480,roll=g.roll||0,wake=Math.min(1,Math.abs(g.bargeV||0)/80);
 // Reflection follows the leaning hull and breaks into strips rather than a blur filter.
 for(let i=0;i<7;i++){const y=495+i*6,half=108-i*11;c.globalAlpha=.11-i*.012;line(c,x-half+Math.sin(t+i)*4,y,x+half+Math.sin(t+i)*4,y,'#92b4bd',3.5);}c.globalAlpha=1;
 c.strokeStyle='#b0d6d048';c.lineWidth=1.5;c.beginPath();c.ellipse(x,504,141+wake*12,7+Math.sin(t)*1.5,0,0,TAU);c.stroke();
 c.save();c.translate(x,460);c.rotate(roll);
 const hull=c.createLinearGradient(0,1,0,52);hull.addColorStop(0,'#3c6275');hull.addColorStop(.17,'#142f43');hull.addColorStop(.7,'#102a3d');hull.addColorStop(1,'#091f31');
 poly(c,[[-136,1],[136,1],[128,22],[108,48],[-111,48],[-129,23]],hull,'#738e98',1.2);
 poly(c,[[-129,23],[128,23],[121,32],[-124,32]],'#819d9d');line(c,-122,33,119,33,'#a2b8af',1);
 for(let ix=-108;ix<=108;ix+=27)line(c,ix,10,ix,22,'#77909b24',1);
 rounded(c,-132,-4,264,9,2,'#a8b4a3','#d0d3b6');c.fillStyle='#4d676c';c.fillRect(-125,4,250,4);
 for(let ix=-121;ix<128;ix+=10){line(c,ix,-3,ix+5,4,ix%20?'#717f71':'#c3c1a2',2);}
 text(c,'BLUEWATER   /   CS–08',0,44,6.2,'#b2c2bb','center');
 for(const ix of[-112,-84,83,111]){circle(c,ix,15,3.5);c.fillStyle='#081e2b';c.fill();circle(c,ix-.6,14.5,1.5);c.fillStyle='#8ba9ad';c.fill();}
 for(const ix of[-121,121]){rounded(c,ix-3,-6,6,12,1,'#4b666a','#b3bda6');rounded(c,ix-6,-8,12,4,1,'#b6b797');}
 // Navigation lights and paired rubber fenders make the deck edge unmistakable.
 for(const [ix,color]of[[-128,'#d49b75'],[128,'#8fc5ac']]){circle(c,ix,-2,2);c.fillStyle=color;c.fill();}
 for(const ix of[-111,110]){c.strokeStyle='#0a1c27';c.lineWidth=3;c.beginPath();c.ellipse(ix,27,5,9,0,0,TAU);c.stroke();}
 for(const b of g.stack||[])cargo(c,{...b,rotation:(b.rotation||0)-roll},t);
 c.restore();
 if(wake>.05){c.globalAlpha=.25*wake;for(let i=0;i<8;i++){const dir=(g.bargeV||0)>0?-1:1,dx=dir*(135+i*8),yy=501+Math.sin(t*3+i)*2;line(c,x+dx,yy,x+dx+dir*7,yy,'#c2d3c4',1.5);}c.globalAlpha=1;}
}

function balance(c,g,scale,cam){
 const angle=g.roll||0,offscreen=(460-cam)*scale>501;
 if(!offscreen)return;
 const x=847,y=503;rounded(c,x-73,y-30,146,61,8,'#102737eb','#49616d');
 text(c,'SHIP BALANCE',x,y-13,7,'#b7cac8','center');line(c,x-48,y+12,x+48,y+12,'#718b8f',1);line(c,x,y+8,x,y+17,'#a9c8c8',1);
 c.save();c.translate(x,y+9);c.rotate(clamp(angle,-.7,.7));poly(c,[[-37,-2],[37,-2],[29,9],[-29,9]],Math.abs(angle)>.16?'#bb7d6b':'#84b3b6');line(c,-37,-2,37,-2,'#d7dfca',2);c.restore();
}

export function draw(c,g,t){
 const time=g.time??t,stage=Math.max(1,g.level||1),scale=clamp(g.viewScale||1,.1,1),camera=g.cameraY||0;
 c.save();c.beginPath();c.rect(0,0,W,H);c.clip();backdrop(c,time,stage);
 c.save();c.translate(480,0);c.scale(scale,scale);c.translate(-480,-camera);
 gantry(c,g,time);ship(c,g,time);
 const f=g.forecast;
 if(g.held&&f){
  const hook=g.hook,safe=f.safe!==false,glow=safe?'#b8d7be':'#d7a18c';c.strokeStyle=safe?'#bcdbc44b':'#e2ac974f';c.lineWidth=1;c.setLineDash([3,8]);c.beginPath();c.moveTo(hook.x,hook.y+18);c.quadraticCurveTo((hook.x+f.x)/2+(g.wind||0)*.1,(hook.y+f.y)/2,f.x,f.y);c.stroke();c.setLineDash([]);
  c.strokeStyle=glow;c.lineWidth=1.5;c.beginPath();c.ellipse(f.x,f.y,19,4,0,0,TAU);c.stroke();line(c,f.x-24,f.y,f.x-20,f.y,glow,2);line(c,f.x+20,f.y,f.x+24,f.y,glow,2);
 }
 if(g.held){const supplied=typeof g.held==='object'?g.held:g.cargo||g.heldCrate||{},hook=g.hook;cargo(c,{...supplied,x:hook.x,y:hook.y,rotation:g.angle||0,color:supplied.color??g.delivered??0},time,true);}
 if(g.crate)cargo(c,g.crate,time);
 for(const b of g.debris||[]){c.globalAlpha=clamp((560-b.y)/100,.08,1);cargo(c,b,time);}c.globalAlpha=1;
 for(const p of g.particles||[]){const life=p.life??1;c.globalAlpha=clamp(life,0,1);circle(c,p.x,p.y,p.r??2);c.fillStyle=p.color||'#d4d9ba';c.fill();}c.globalAlpha=1;
 c.restore();
 if(stage>=3){const amount=Math.min(38,5+stage*3);c.strokeStyle='#b2c8cf1f';c.lineWidth=1;c.beginPath();for(let i=0;i<amount;i++){const x=(i*137-time*(45+(g.wind||0)))%1040,y=(i*173+time*310)%630;c.moveTo(x<0?x+1040:x,y-25);c.lineTo((x<0?x+1040:x)-4,y-13);}c.stroke();}
 balance(c,g,scale,camera);
 // Restrained map lettering stays separate from the large readable HTML instruments.
 text(c,weatherNames[(stage-1)%weatherNames.length]+'  ·  HARBOR '+String(stage).padStart(2,'0'),71,Math.min(547,Math.max(492,(460-camera)*scale+65)),8,'#9fbdc4');
 const shade=c.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#05101e18');shade.addColorStop(.7,'#05101e00');shade.addColorStop(1,'#05101e45');c.fillStyle=shade;c.fillRect(0,0,W,H);c.restore();
}
