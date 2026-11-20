import {W,H,random,clamp,salvageVisibility} from './model.js';
import {box,label} from './kit.js';
const TAU=Math.PI*2;
const circle=(c,x,y,r)=>{c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU);};
const glow=(c,x,y,r,color)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);};
function stone(c,r,palette){
 c.save();c.translate(r.x,r.y);c.rotate(r.angle);const rng=random(Math.floor(r.shape*98731)),points=[];
 for(let i=0;i<13;i++){const a=i/13*TAU,rr=r.r*(.88+rng()*.14);points.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
 c.fillStyle='#03121d77';c.beginPath();for(const [x,y]of points)c.lineTo(x+7,y+11);c.closePath();c.fill();
 const fill=c.createLinearGradient(-r.r,-r.r,r.r,r.r);fill.addColorStop(0,palette[0]);fill.addColorStop(.42,palette[1]);fill.addColorStop(1,palette[2]);c.fillStyle=fill;c.beginPath();for(const p of points)c.lineTo(...p);c.closePath();c.fill();c.strokeStyle='#a9c9bc27';c.lineWidth=1.2;c.stroke();
 c.save();c.clip();for(let i=0;i<6;i++){const y=-r.r+i*r.r*.38;c.strokeStyle=i%2?'#06172555':'#bdc8ac18';c.lineWidth=i%2?3:1;c.beginPath();c.moveTo(-r.r,y);c.lineTo(-r.r*.1,y-r.r*.16);c.lineTo(r.r,y+r.r*.22);c.stroke();}c.fillStyle='#d2d2b216';c.beginPath();c.moveTo(-r.r,-r.r);c.lineTo(r.r*.12,-r.r*.3);c.lineTo(-r.r*.4,r.r*.1);c.closePath();c.fill();c.restore();c.restore();
}
function wreck(c,r){
 c.save();c.translate(r.x,r.y);c.rotate(r.angle);c.fillStyle='#06162288';c.beginPath();c.ellipse(5,8,r.r+6,r.r*.7,0,0,TAU);c.fill();
 const hull=c.createLinearGradient(0,-r.r,0,r.r);hull.addColorStop(0,'#7f9090');hull.addColorStop(.3,'#495e67');hull.addColorStop(1,'#1b303b');c.fillStyle=hull;c.beginPath();c.moveTo(-r.r*.9,-r.r*.38);c.quadraticCurveTo(r.r*.2,-r.r*.86,r.r,-r.r*.3);c.lineTo(r.r*.7,r.r*.45);c.lineTo(r.r*.12,r.r*.35);c.lineTo(-r.r*.17,r.r*.69);c.lineTo(-r.r,r.r*.3);c.closePath();c.fill();c.strokeStyle='#bcab8a66';c.lineWidth=2;c.stroke();
 for(let i=-2;i<=2;i++){c.strokeStyle='#172c39';c.lineWidth=3;c.beginPath();c.moveTo(i*r.r*.3,-r.r*.4);c.lineTo(i*r.r*.3,r.r*.4);c.stroke();c.strokeStyle='#a7bbb144';c.lineWidth=1;c.stroke();}c.fillStyle='#061721';box(c,-r.r*.5,-r.r*.14,r.r*.7,r.r*.37,3);c.fill();c.fillStyle='#a97b59';c.fillRect(r.r*.3,-r.r*.32,3,r.r*.6);c.restore();
}
function backdrop(sector){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d'),b=sector.biome,rng=random(sector.seed^sector.level*991);const sea=c.createLinearGradient(0,0,0,H);sea.addColorStop(0,b.water[0]);sea.addColorStop(1,b.water[1]);c.fillStyle=sea;c.fillRect(0,0,W,H);
 for(let layer=0;layer<3;layer++){c.fillStyle=['#071c2e20','#071b2b44','#06192877'][layer];for(let j=0;j<7;j++){const x=rng()*W,y=H*(.35+rng()*.65),r=30+rng()*100;c.beginPath();c.moveTo(x-r,y);c.bezierCurveTo(x-r*.9,y-r,x+r*.7,y-r*1.4,x+r,y);c.lineTo(x+r,H);c.lineTo(x-r,H);c.fill();}}
 c.globalCompositeOperation='screen';for(let i=0;i<5;i++){const x=60+i*215+rng()*70,g=c.createLinearGradient(x,0,x+120,H);g.addColorStop(0,'#bbe2cb12');g.addColorStop(.6,'#a4dcd408');g.addColorStop(1,'#a4dcd400');c.fillStyle=g;c.beginPath();c.moveTo(x,-20);c.lineTo(x+40,-20);c.lineTo(x+220,H);c.lineTo(x+80,H);c.closePath();c.fill();}c.globalCompositeOperation='source-over';
 for(let i=0;i<200;i++){const x=rng()*W,y=rng()*H;c.fillStyle=i%3?'#a8d9d20b':'#b3d4b91b';c.fillRect(x,y,1+rng()*2,1+rng()*2);}
 for(const r of sector.rocks){if(r.kind==='wreck')wreck(c,r);else stone(c,r,b.rock);const count=2+Math.floor(rng()*4);for(let j=0;j<count;j++){const x=r.x+(rng()-.5)*r.r,y=r.y+r.r*.75;c.strokeStyle=b.plant+'88';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y);c.lineTo(x-4,y-9);c.lineTo(x-10,y-16);c.moveTo(x-4,y-9);c.lineTo(x+4,y-16);c.stroke();c.fillStyle=b.glow+'66';circle(c,x-10,y-16,1.4);c.fill();}}
 // Painted edge shelves frame the sea without hiding navigable space.
 for(const side of [-1,1]){c.fillStyle='#051522';c.beginPath();const edge=side<0?0:W;c.moveTo(edge,0);c.lineTo(edge+side*-20,0);for(let y=0;y<=H;y+=35)c.lineTo(edge-side*(9+rng()*16),y);c.lineTo(edge,H);c.fill();}
 return canvas;
}
function jelly(c,h,t){
 const x=h.x,y=h.y;c.save();glow(c,x,y,48,'#a0d2de19');c.strokeStyle='#a9c7dc88';c.lineWidth=1.5;
 for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(x+i*5,y+2);c.bezierCurveTo(x+i*6+Math.sin(t*1.8+i)*9,y+20,x+i*8-9,y+29,x+i*7+Math.sin(t*2+i)*10,y+44);c.stroke();}
 const bell=c.createRadialGradient(x-5,y-10,2,x,y,26);bell.addColorStop(0,'#dbe7e1dd');bell.addColorStop(.5,'#9fb5d4aa');bell.addColorStop(1,'#6c98b944');c.fillStyle=bell;c.beginPath();c.moveTo(x-23,y+3);c.bezierCurveTo(x-23,y-27,x+23,y-27,x+23,y+3);c.bezierCurveTo(x+15,y+9,x+10,y-1,x+5,y+6);c.quadraticCurveTo(x,y-1,x-6,y+6);c.quadraticCurveTo(x-15,y-1,x-23,y+3);c.fill();c.strokeStyle='#cce4dfaa';c.lineWidth=1.2;c.stroke();c.fillStyle='#d3c7e9bb';for(let i=-1;i<=1;i++){circle(c,x+i*8,y-7,3);c.fill();}c.restore();
}
function hunter(c,h,t){
 c.save();c.translate(h.x,h.y);c.rotate(h.angle);c.fillStyle='#172936';c.beginPath();c.moveTo(-22,0);c.lineTo(-37,-13+Math.sin(t*9+h.phase)*4);c.lineTo(-33,13+Math.sin(t*9+h.phase)*4);c.closePath();c.fill();const g=c.createLinearGradient(0,-14,0,14);g.addColorStop(0,'#789c9c');g.addColorStop(.45,'#385665');g.addColorStop(1,'#132a39');c.fillStyle=g;c.beginPath();c.ellipse(0,0,27,13,0,0,TAU);c.fill();c.fillStyle='#668b91';c.beginPath();c.moveTo(-8,-9);c.lineTo(-4,-24);c.lineTo(10,-10);c.moveTo(-2,8);c.lineTo(-9,22);c.lineTo(13,10);c.fill();c.strokeStyle=h.mode==='hunt'?'#e8bd8999':'#9ad5cb88';c.lineWidth=2;c.beginPath();c.moveTo(-18,-4);c.quadraticCurveTo(0,-11,20,-4);c.stroke();c.fillStyle=h.mode==='hunt'?'#f6bf8e':'#c2e5d7';circle(c,17,-4,2.5);c.fill();c.strokeStyle='#081723';c.beginPath();c.moveTo(17,6);c.lineTo(25,3);c.stroke();c.restore();
}
function eel(c,h,t){
 if(h.mode==='warn'){c.save();c.translate(h.x,h.y);c.rotate(h.angle);c.strokeStyle='#f0bb9877';c.setLineDash([7,8]);c.lineWidth=1;c.beginPath();c.moveTo(22,0);c.lineTo(170,0);c.stroke();c.restore();}
 c.save();c.translate(h.x,h.y);c.rotate(h.angle);c.lineCap='round';const body=()=>{c.beginPath();c.moveTo(12,0);c.bezierCurveTo(-10,Math.sin(t*4)*10,-37,Math.cos(t*3)*17,-60,Math.sin(t*3)*9);};body();c.strokeStyle='#162c3d';c.lineWidth=19;c.stroke();body();c.strokeStyle='#839ead';c.lineWidth=10;c.stroke();body();c.strokeStyle='#adbdc0';c.lineWidth=2;c.stroke();c.fillStyle='#8cabb3';c.beginPath();c.ellipse(12,0,16,10,0,0,TAU);c.fill();c.fillStyle=h.mode==='warn'||h.mode==='dash'?'#ffd7a0':'#c5d9e9';circle(c,20,-3,3);c.fill();c.restore();
}
function mine(c,h,t){
 if(h.mode==='burst'){c.strokeStyle='#eab49b88';c.lineWidth=3;circle(c,h.x,h.y,76*(1-h.cooldown/.35));c.stroke();return;}
 if(h.mode==='armed'){c.fillStyle='#ec9e7d12';circle(c,h.x,h.y,76);c.fill();c.strokeStyle='#edab8b88';c.lineWidth=1.5;c.setLineDash([5,8]);circle(c,h.x,h.y,76);c.stroke();c.setLineDash([]);}
 c.save();c.translate(h.x,h.y);c.rotate(h.phase);c.strokeStyle='#597782';c.lineWidth=4;for(let i=0;i<8;i++){const a=i/8*TAU;c.beginPath();c.moveTo(Math.cos(a)*11,Math.sin(a)*11);c.lineTo(Math.cos(a)*21,Math.sin(a)*21);c.stroke();}const g=c.createRadialGradient(-5,-6,0,0,0,17);g.addColorStop(0,'#758c90');g.addColorStop(1,'#182e3d');c.fillStyle=g;circle(c,0,0,15);c.fill();c.strokeStyle='#91b7b144';c.lineWidth=1;c.stroke();c.fillStyle=h.mode==='armed'&&Math.sin(t*19)>0?'#ffe1af':'#d29572';circle(c,0,0,4);c.fill();c.restore();
}
function salvage(c,p,t,near){
 const x=p.x,y=p.y+Math.sin(t*2+p.spin)*2.2,color=p.kind==='relic'?'#f2c695':'#a1e9da';glow(c,x,y,34,p.kind==='relic'?'#f4c38c20':'#8de1d125');c.save();c.translate(x,y);
 if(p.kind==='relic'){c.rotate(Math.sin(t+p.spin)*.12);c.fillStyle='#34505b';box(c,-12,-12,24,24,4);c.fill();c.rotate(Math.PI/4);c.fillStyle='#b58e61';box(c,-8,-8,16,16,2);c.fill();c.fillStyle=color;box(c,-4,-4,8,8,1);c.fill();}
 else{c.fillStyle='#172b39';box(c,-15,-11,30,24,4);c.fill();const g=c.createLinearGradient(0,-10,0,10);g.addColorStop(0,'#ced2bd');g.addColorStop(1,'#728d87');c.fillStyle=g;box(c,-13,-10,26,18,3);c.fill();c.fillStyle='#253e49';c.fillRect(-7,-10,4,18);c.fillRect(4,-10,4,18);c.fillStyle=color;c.fillRect(-10,-6,5,4);c.strokeStyle='#cce8da88';c.lineWidth=1;c.strokeRect(-13,-10,26,18);}
 c.strokeStyle=color;c.lineWidth=1.2;c.beginPath();c.moveTo(-20,-9);c.lineTo(-20,-16);c.lineTo(-12,-16);c.moveTo(20,9);c.lineTo(20,16);c.lineTo(12,16);c.stroke();c.restore();if(near)label(c,'E  RECOVER',x,y-24,11,color,'center');
}
function submarine(c,x,y,g,t){
 c.save();c.translate(x,y);c.scale(g.facing,1);c.rotate(g.heading);const speed=Math.hypot(g.vx,g.vy);
 const beam=c.createLinearGradient(19,0,240,0);beam.addColorStop(0,'#efddb54a');beam.addColorStop(.4,'#d5e6cc15');beam.addColorStop(1,'#d5e6cc00');c.fillStyle=beam;c.beginPath();c.moveTo(20,-6);c.lineTo(240,-71);c.quadraticCurveTo(265,0,240,71);c.lineTo(20,6);c.fill();
 for(let i=0;i<7;i++){const u=(t*(.7+speed*.012)+i*.19)%1;c.strokeStyle='#a5d6d5'+Math.floor((1-u)*80).toString(16).padStart(2,'0');c.lineWidth=1;circle(c,-32-u*(30+speed*.3),Math.sin(i*9+t*2)*7-u*12,1+u*3);c.stroke();}
 c.fillStyle='#03142155';c.beginPath();c.ellipse(0,19,35,9,0,0,TAU);c.fill();c.fillStyle='#829798';box(c,-15,-22,20,11,4);c.fill();c.fillStyle='#b8bca3';c.fillRect(-6,-28,4,9);c.fillStyle='#85c9be';circle(c,-4,-29,2);c.fill();
 c.fillStyle='#3c5964';box(c,-34,-10,10,22,4);c.fill();c.strokeStyle='#a7bbb4';c.lineWidth=2;c.beginPath();c.moveTo(-38,-12);c.lineTo(-38,13);c.moveTo(-43,-4+Math.sin(t*(7+speed*.2))*7);c.lineTo(-34,4-Math.sin(t*(7+speed*.2))*7);c.stroke();
 const shell=c.createLinearGradient(0,-16,0,15);shell.addColorStop(0,'#f5d79c');shell.addColorStop(.34,'#d6ad67');shell.addColorStop(.68,'#bd8e4d');shell.addColorStop(1,'#7b6847');c.fillStyle=shell;box(c,-28,-15,59,32,14);c.fill();c.strokeStyle='#eed2a577';c.lineWidth=1;c.stroke();c.fillStyle='#334d5b';box(c,-24,9,45,5,2);c.fill();c.fillStyle='#273e4b';circle(c,15,0,12);c.fill();c.strokeStyle='#b8c7ba';c.lineWidth=2;circle(c,15,0,10);c.stroke();const glass=c.createRadialGradient(11,-5,1,15,0,10);glass.addColorStop(0,'#b1e8dc');glass.addColorStop(.4,'#5f9fa3');glass.addColorStop(1,'#213f55');c.fillStyle=glass;circle(c,15,0,8);c.fill();c.fillStyle='#e3f5deaa';circle(c,12,-4,2.5);c.fill();c.fillStyle='#a7b8ab';for(let i=0;i<3;i++)c.fillRect(-18+i*6,-5,2,8);c.fillStyle='#f1d9ae';box(c,29,-5,5,9,2);c.fill();c.restore();
}
export class OceanRenderer{
 constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');this.cache=new Map();this.fog=document.createElement('canvas');this.fog.width=W;this.fog.height=H;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.resize();}
 resize(){const dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(W*dpr);this.canvas.height=Math.round(H*dpr);this.c.setTransform(dpr,0,0,dpr,0,0);}
 background(s){if(!this.cache.has(s)){if(this.cache.size>=2)this.cache.delete(this.cache.keys().next().value);this.cache.set(s,backdrop(s));}return this.cache.get(s);}
 world(s,g,t,active=true){const c=this.c;c.drawImage(this.background(s),0,0);for(let i=0;i<40;i++){const x=(i*137.3+Math.sin(t*.2+i)*18)%W,y=(i*79.7-t*(3+i%4)+56000)%H;c.fillStyle=i%5?'#aacdc426':'#d5e9d252';circle(c,x,y,i%3===0?1.5:.8);c.fill();}
  for(const r of s.rocks){const x=r.x-r.r*.3,y=r.y+r.r*.5;if(s.level%4===2||s.level%4===0){c.strokeStyle=s.biome.plant+'77';c.lineWidth=3;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(x+i*8,y);c.bezierCurveTo(x+i*12+Math.sin(t+i)*12,y-15,x+i*9-10,y-32,x+i*8+Math.sin(t*1.2+i)*15,y-48);c.stroke();}}}
  for(const p of s.caches){const range=Math.hypot(p.x-g.x,p.y-g.y),visibility=salvageVisibility(p,g);if(visibility>0){c.globalAlpha=visibility;salvage(c,p,t,active&&range<52);c.globalAlpha=1;}if(p.takenAt!==undefined&&g.time-p.takenAt<.65){const age=(g.time-p.takenAt)/.65;c.strokeStyle='#b5f1de'+Math.floor((1-age)*180).toString(16).padStart(2,'0');c.lineWidth=2;circle(c,p.x,p.y,18+age*36);c.stroke();label(c,p.kind==='relic'?'+150':'+100',p.x,p.y-20-age*25,13,'#bee8d8','center');}}
  for(const h of s.hazards){if(!h.alive)continue;if(h.kind==='jelly')jelly(c,h,t);if(h.kind==='hunter')hunter(c,h,t);if(h.kind==='eel')eel(c,h,t);if(h.kind==='mine')mine(c,h,t);}
  if(active){const age=g.time-g.pingTime;if(age>=0&&age<2.8){for(let i=0;i<2;i++){const radius=Math.max(1,age*420-i*22);c.strokeStyle='#acebd7'+Math.floor(Math.max(0,1-age/2.8)*(i?45:120)).toString(16).padStart(2,'0');c.lineWidth=i?1:2;circle(c,g.x,g.y,radius);c.stroke();}}
   const f=this.fog.getContext('2d');f.globalCompositeOperation='source-over';f.clearRect(0,0,W,H);f.fillStyle='rgba(2,9,24,'+Math.min(.45,.2+g.level*.012)+')';f.fillRect(0,0,W,H);f.globalCompositeOperation='destination-out';const light=f.createRadialGradient(g.x,g.y,20,g.x,g.y,270);light.addColorStop(0,'#000000ff');light.addColorStop(.5,'#000000bb');light.addColorStop(1,'#00000000');f.fillStyle=light;f.fillRect(0,0,W,H);c.drawImage(this.fog,0,0);}
 }
 draw(g,mode,clock){const c=this.c,t=mode==='menu'?clock*.35:g.time;c.clearRect(0,0,W,H);c.save();if(g.shake&&!this.reduced)c.translate(Math.sin(t*79)*g.shake*4,Math.cos(t*83)*g.shake*3);
  if(g.transition){const p=clamp(g.transition.elapsed/g.transition.duration,0,1),e=p*p*(3-2*p);c.save();c.translate(0,-H*e);this.world(g.sector,g,t,false);c.translate(0,H);this.world(g.transition.next,{...g,x:500,y:82},t,false);c.restore();submarine(c,g.transition.from.x+(500-g.transition.from.x)*e,g.transition.from.y+(82-g.transition.from.y)*e,g,t);c.fillStyle='#061b2bd9';box(c,335,222,330,105,8);c.fill();label(c,'SECTOR '+String(g.level).padStart(2,'0')+' CLEARED',500,254,13,'#9ce0cc','center');label(c,'DEEPER STILL',500,287,26,'#edf0dd','center');label(c,'AIR REFILLED   /   HULL +1',500,309,10,'#b1c7c0','center');}
  else{this.world(g.sector,g,t);submarine(c,g.x,g.y,g,t);if(g.invulnerable&&mode!=='menu'){c.strokeStyle='#b8e8d655';c.lineWidth=1.2;circle(c,g.x,g.y,40+Math.sin(t*8)*2);c.stroke();}}
  for(const p of g.particles){c.globalAlpha=clamp(p.life/.6,0,1);c.fillStyle=p.color;circle(c,p.x,p.y,p.size*p.life);c.fill();}c.globalAlpha=1;
  const rim=c.createRadialGradient(500,280,150,500,280,610);rim.addColorStop(0,'#020b1600');rim.addColorStop(1,'#020b1680');c.fillStyle=rim;c.fillRect(0,0,W,H);c.restore();
 }
}
