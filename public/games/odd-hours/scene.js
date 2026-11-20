// Odd Hours 2.0 — procedural museum rooms drawn as security-camera feeds.
export const W=960,H=560;
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
const SKIN='#d8b89a';
function face(c,x,y,r,kind,t){
 c.fillStyle=SKIN;c.beginPath();c.ellipse(x,y,r*.8,r,0,0,7);c.fill();
 if(kind==='blank')return;if(kind==='turned'){c.fillStyle='#3a2a1e';c.beginPath();c.ellipse(x,y-r*.1,r*.82,r*.95,0,0,7);c.fill();return;}
 const eye=kind==='eyes'?'#e02020':'#222';c.fillStyle=eye;c.beginPath();c.arc(x-r*.3,y-r*.15,r*(kind==='eyes'?.14:.09),0,7);c.arc(x+r*.3,y-r*.15,r*(kind==='eyes'?.14:.09),0,7);c.fill();
 c.strokeStyle='#5a3a2a';c.lineWidth=Math.max(1,r*.08);c.beginPath();if(kind==='smile')c.arc(x,y+r*.15,r*.45,.15,Math.PI-.15);else{c.moveTo(x-r*.25,y+r*.45);c.lineTo(x+r*.25,y+r*.45);}c.stroke();
}
const DRAW={
 door(c,o){c.fillStyle='#2a2018';c.fillRect(-55,-230,110,230);c.fillStyle='#5a4028';c.fillRect(-48,-222,96,222);c.fillStyle='#4a3420';c.fillRect(-40,-210,36,90);c.fillRect(4,-210,36,90);c.fillRect(-40,-110,36,100);c.fillRect(4,-110,36,100);c.fillStyle='#c9a75e';c.beginPath();c.arc(30,-110,5,0,7);c.fill();c.fillStyle='#7ae07a';c.fillRect(-20,-250,40,14);c.fillStyle='#111';c.font='bold 10px sans-serif';c.textAlign='center';c.fillText('EXIT',0,-239);},
 sign(c,o){c.font=`700 ${30}px Georgia`;c.textAlign='center';const w=c.measureText(o.txt).width+40;c.fillStyle='#1a1a1a';rr(c,-w/2,-26,w,48,6);c.fill();c.fillStyle=o.c;c.fillText(o.txt,0,9);},
 desk(c,o){c.fillStyle='#5a3a24';c.fillRect(-150,-70,300,70);c.fillStyle='#6e4a2e';c.fillRect(-160,-82,320,16);c.fillStyle='#4a2e1c';c.fillRect(-140,-60,90,55);},
 computer(c,o){c.fillStyle='#222';c.fillRect(-36,-56,72,48);c.fillStyle='#3a6a8a';c.fillRect(-30,-50,60,36);c.fillStyle='#333';c.fillRect(-6,-8,12,8);c.fillRect(-20,0,40,4);},
 clock(c,o){c.fillStyle='#e8e0cc';c.beginPath();c.arc(0,0,32,0,7);c.fill();c.strokeStyle='#3a2a1a';c.lineWidth=5;c.stroke();c.strokeStyle='#222';c.lineWidth=3;const h=(o.v||0)/12*Math.PI*2-Math.PI/2;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(h)*16,Math.sin(h)*16);c.stroke();c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(0,-24);c.stroke();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.fillStyle='#333';c.fillRect(Math.cos(a)*26-1,Math.sin(a)*26-1,2,2);}},
 plant(c,o){c.fillStyle='#6a4a32';c.beginPath();c.moveTo(-26,0);c.lineTo(26,0);c.lineTo(32,-44);c.lineTo(-32,-44);c.closePath();c.fill();c.fillStyle='#3e6a3a';for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.32;c.beginPath();c.ellipse(Math.cos(a)*36,-50+Math.sin(a)*40,10,30,a+Math.PI/2,0,7);c.fill();}},
 bench(c,o){c.fillStyle='#4a3424';c.fillRect(-90,-40,180,14);c.fillRect(-90,-70,180,10);c.fillStyle='#2a2018';c.fillRect(-84,-26,10,26);c.fillRect(74,-26,10,26);},
 stanchion(c,o){for(const x of [-60,60]){c.fillStyle='#c9a75e';c.fillRect(x-4,-80,8,80);c.beginPath();c.arc(x,-82,7,0,7);c.fill();c.fillRect(x-14,-6,28,6);}c.strokeStyle=o.c||'#9a2a2a';c.lineWidth=6;c.beginPath();c.moveTo(-56,-74);c.quadraticCurveTo(0,-44,56,-74);c.stroke();},
 poster(c,o){c.fillStyle='#ddd5c0';c.fillRect(-60,-80,120,160);c.fillStyle=o.c;c.fillRect(-50,-70,100,100);c.fillStyle='#2a2a2a';c.font='bold 13px sans-serif';c.textAlign='center';c.fillText(o.txt,0,55);c.fillStyle='#ffffff55';c.beginPath();c.moveTo(-40,20);c.lineTo(-10,-30);c.lineTo(20,10);c.lineTo(40,-10);c.lineTo(40,20);c.fill();},
 lamp(c,o,room){c.fillStyle='#2a2a2a';c.fillRect(-3,-170,6,170);c.fillRect(-20,-4,40,6);c.fillStyle=room.light==='dark'?'#555':'#f0e0b0';c.beginPath();c.moveTo(-26,-170);c.lineTo(26,-170);c.lineTo(16,-206);c.lineTo(-16,-206);c.closePath();c.fill();},
 bin(c,o){c.fillStyle='#55606a';rr(c,-18,-46,36,46,4);c.fill();c.fillStyle='#3a4248';c.fillRect(-20,-50,40,6);},
 portrait(c,o){const w=110,h=140;c.fillStyle='#8a6a2a';c.fillRect(-w/2-10,-h/2-10,w+20,h+20);c.fillStyle='#c9a75e';c.fillRect(-w/2-4,-h/2-4,w+8,h+8);c.fillStyle=o.c;c.fillRect(-w/2,-h/2,w,h);c.fillStyle='#ffffff10';c.fillRect(-w/2,-h/2,w,h/2);
  const v=o.v||0;c.fillStyle=['#2a2a3a','#4a1a1a','#1a3a2a','#2a2a4a'][v];c.beginPath();c.ellipse(0,h/2,44,58,0,Math.PI,0);c.fill();face(c,0,-12,26,o.face||'normal');c.fillStyle=['#3a2a1a','#888','#6a4a1a','#1a1a1a'][v];c.beginPath();c.ellipse(0,-34,24,12+v*2,0,Math.PI,0);c.fill();},
 sconce(c,o,room){c.fillStyle='#c9a75e';c.fillRect(-4,-10,8,30);c.fillStyle=room.light==='dark'?'#444':'#ffe8a0';c.beginPath();c.ellipse(0,-18,9,14,0,0,7);c.fill();},
 bust(c,o){c.fillStyle='#ddd8ce';c.fillRect(-30,-80,60,80);c.fillStyle='#cfc8bc';c.fillRect(-38,-90,76,14);c.fillStyle='#e8e4dc';c.beginPath();c.ellipse(0,-118,26,34,0,0,7);c.fill();c.beginPath();c.ellipse(0,-86,38,14,0,Math.PI,0);c.fill();if(o.face==='eyes'){c.fillStyle='#e02020';c.beginPath();c.arc(-9,-124,4,0,7);c.arc(9,-124,4,0,7);c.fill();}else if(o.face==='turned'){c.fillStyle='#bdb6aa';c.beginPath();c.ellipse(0,-118,24,32,0,0,7);c.fill();}else{c.fillStyle='#bdb6aa';c.fillRect(-12,-126,8,3);c.fillRect(4,-126,8,3);if(o.face==='smile'){c.strokeStyle='#8a8278';c.lineWidth=2;c.beginPath();c.arc(0,-108,9,.2,Math.PI-.2);c.stroke();}}},
 rug(c,o){c.fillStyle=o.c;c.beginPath();c.ellipse(0,0,220,40,0,0,7);c.fill();c.strokeStyle='#e0c08a55';c.lineWidth=4;c.beginPath();c.ellipse(0,0,190,30,0,0,7);c.stroke();},
 column(c,o){c.fillStyle='#8a8e90';c.fillRect(-36,-330,72,330);c.fillStyle='#9ea2a4';for(let i=-24;i<=24;i+=12)c.fillRect(i-2,-310,4,290);c.fillStyle='#a8acae';c.fillRect(-46,-340,92,22);c.fillRect(-46,-20,92,20);},
 window(c,o){c.fillStyle='#0e1428';c.fillRect(-90,-80,180,160);const g=c.createRadialGradient(40,-30,4,40,-30,40);g.addColorStop(0,'#f0f0d8');g.addColorStop(1,'#f0f0d800');c.fillStyle=g;c.fillRect(-90,-80,180,160);c.fillStyle='#f0f0d8';c.beginPath();c.arc(40,-30,16,0,7);c.fill();c.strokeStyle='#5a5048';c.lineWidth=8;c.strokeRect(-90,-80,180,160);c.beginPath();c.moveTo(0,-80);c.lineTo(0,80);c.moveTo(-90,0);c.lineTo(90,0);c.stroke();},
 statue(c,o){c.fillStyle='#8a8478';c.fillRect(-46,-70,92,70);c.fillStyle='#9a948a';c.fillRect(-52,-80,104,14);c.fillStyle='#ddd8ce';const v=o.v||0;
  if(v===0){c.beginPath();c.moveTo(-24,-80);c.lineTo(24,-80);c.lineTo(16,-190);c.lineTo(-16,-190);c.fill();c.beginPath();c.arc(0,-210,20,0,7);c.fill();c.fillRect(16,-185,10,70);}
  else if(v===1){c.beginPath();c.ellipse(0,-140,40,60,0,0,7);c.fill();c.beginPath();c.arc(0,-218,22,0,7);c.fill();c.beginPath();c.moveTo(-40,-170);c.lineTo(-80,-240);c.lineTo(-70,-244);c.lineTo(-28,-180);c.fill();}
  else{c.beginPath();c.arc(-14,-120,30,0,7);c.arc(18,-130,26,0,7);c.fill();c.beginPath();c.arc(30,-170,16,0,7);c.fill();c.beginPath();c.ellipse(-20,-98,38,18,0,0,7);c.fill();}
  if(o.face==='eyes'){c.fillStyle='#e02020';const fy=v===0?-212:v===1?-220:-172,fx=v===2?30:0;c.beginPath();c.arc(fx-7,fy,3.5,0,7);c.arc(fx+7,fy,3.5,0,7);c.fill();}
  if(o.face==='turned'||o.face==='blank'){c.fillStyle='#bdb6aa';c.fillRect(-60,-260,4,4);}},
 vase(c,o){c.fillStyle=o.c;c.beginPath();c.moveTo(-14,0);c.quadraticCurveTo(-40,-40,-20,-80);c.lineTo(-12,-96);c.lineTo(12,-96);c.lineTo(20,-80);c.quadraticCurveTo(40,-40,14,0);c.closePath();c.fill();c.strokeStyle='#ffffff40';c.lineWidth=3;c.beginPath();c.moveTo(-24,-50);c.lineTo(24,-50);c.stroke();},
 chandelier(c,o,room){c.strokeStyle='#8a7040';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(0,50);c.stroke();c.beginPath();c.ellipse(0,60,70,14,0,0,Math.PI);c.stroke();for(let i=-3;i<=3;i++){c.fillStyle=room.light==='dark'?'#444':'#ffe8a0';c.beginPath();c.arc(i*20,66+Math.abs(i)*-2,5,0,7);c.fill();}},
 skull(c,o){c.fillStyle='#8a7a5a';c.fillRect(-90,-50,180,50);c.fillStyle='#d8ccb0';c.beginPath();c.moveTo(-80,-60);c.quadraticCurveTo(-60,-160,40,-150);c.quadraticCurveTo(100,-140,90,-90);c.lineTo(60,-60);c.closePath();c.fill();c.fillStyle='#3a3024';c.beginPath();c.ellipse(10,-115,16,12,0,0,7);c.fill();c.fillStyle='#d8ccb0';for(let i=0;i<7;i++){c.beginPath();c.moveTo(-60+i*16,-62);c.lineTo(-54+i*16,-48);c.lineTo(-48+i*16,-62);c.fill();}},
 skeleton(c,o){c.strokeStyle='#d8ccb0';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-110,-120);c.quadraticCurveTo(0,-170,90,-130);c.stroke();for(let i=0;i<8;i++){c.beginPath();c.moveTo(-60+i*18,-150+Math.abs(i-3)*3);c.lineTo(-64+i*18,-110);c.stroke();}c.beginPath();c.moveTo(-70,-120);c.lineTo(-80,0);c.moveTo(60,-130);c.lineTo(70,0);c.moveTo(-40,-130);c.lineTo(-30,0);c.moveTo(30,-135);c.lineTo(40,0);c.stroke();c.beginPath();c.moveTo(90,-130);c.lineTo(140,-150);c.stroke();c.fillStyle='#d8ccb0';c.beginPath();c.ellipse(150,-150,22,13,-.3,0,7);c.fill();c.beginPath();c.moveTo(-110,-120);c.quadraticCurveTo(-170,-110,-200,-60);c.stroke();},
 case(c,o){c.fillStyle='#4a3a2a';c.fillRect(-60,-70,120,70);c.fillStyle='#a0c8d860';c.fillRect(-56,-150,112,80);c.strokeStyle='#cde';c.lineWidth=2;c.strokeRect(-56,-150,112,80);c.fillStyle=o.c;c.beginPath();c.moveTo(0,-130);c.lineTo(16,-112);c.lineTo(0,-90);c.lineTo(-16,-112);c.fill();},
 globe(c,o){c.fillStyle='#5a3a24';c.fillRect(-6,-60,12,60);c.fillRect(-30,-6,60,6);c.fillStyle='#3a6aa0';c.beginPath();c.arc(0,-100,42,0,7);c.fill();c.fillStyle='#5a9a4a';c.beginPath();c.ellipse(-10,-110,16,22,.4,0,7);c.ellipse(18,-86,12,10,0,0,7);c.fill();c.strokeStyle='#c9a75e';c.lineWidth=3;c.beginPath();c.arc(0,-100,48,-1.2,1.9);c.stroke();},
 sarcophagus(c,o){c.fillStyle='#c9a040';rr(c,-60,-260,120,260,50);c.fill();c.fillStyle='#2a5a8a';for(let i=0;i<6;i++)c.fillRect(-50,-170+i*24,100,10);face(c,0,-210,28,o.face||'normal');c.fillStyle='#2a5a8a';c.fillRect(-40,-250,80,14);},
 mask(c,o){c.fillStyle=o.c;c.beginPath();c.ellipse(0,0,40,54,0,0,7);c.fill();c.fillStyle='#1a1a1a';c.beginPath();c.ellipse(-14,-10,9,5,0,0,7);c.ellipse(14,-10,9,5,0,0,7);c.fill();c.fillRect(-12,20,24,5);c.strokeStyle='#1a1a1a';c.lineWidth=2;c.beginPath();c.moveTo(0,-4);c.lineTo(0,12);c.stroke();},
 torch(c,o,room){c.fillStyle='#4a3420';c.fillRect(-5,0,10,40);if(room.light!=='dark'){c.fillStyle=room.light==='green'?'#7af07a':'#ffa040';c.beginPath();c.ellipse(0,-12,10,18,0,0,7);c.fill();c.fillStyle='#fff0a0';c.beginPath();c.ellipse(0,-6,5,9,0,0,7);c.fill();}},
 shelf(c,o){c.fillStyle='#5a4030';c.fillRect(-120,-200,240,200);c.fillStyle='#3a2a20';for(let i=0;i<3;i++)c.fillRect(-112,-190+i*64,224,54);c.fillStyle='#6a5040';for(let i=0;i<3;i++)c.fillRect(-120,-136+i*64,240,8);},
 bear(c,o){c.fillStyle=o.c;c.beginPath();c.ellipse(0,-22,22,24,0,0,7);c.fill();c.beginPath();c.arc(0,-58,18,0,7);c.fill();c.beginPath();c.arc(-14,-72,7,0,7);c.arc(14,-72,7,0,7);c.fill();c.fillStyle='#222';c.beginPath();c.arc(-6,-60,2.5,0,7);c.arc(6,-60,2.5,0,7);c.fill();},
 register(c,o){c.fillStyle='#4a4a54';c.fillRect(-120,-90,240,90);c.fillStyle='#6a6a74';c.fillRect(-130,-100,260,14);c.fillStyle='#222';c.fillRect(20,-150,70,50);c.fillStyle='#7ae07a';c.fillRect(28,-142,54,18);},
 balloon(c,o){c.strokeStyle='#ccc';c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(10,60,0,120);c.stroke();c.fillStyle=o.c;c.beginPath();c.ellipse(0,-30,26,32,0,0,7);c.fill();c.fillStyle='#ffffff40';c.beginPath();c.ellipse(-8,-42,6,10,-.4,0,7);c.fill();},
 rack(c,o){c.fillStyle='#777';c.fillRect(-4,-140,8,140);c.fillRect(-30,-4,60,4);const cols=['#e0b070','#70b0e0','#e07090','#90e070'];for(let i=0;i<4;i++){c.fillStyle=cols[i];c.fillRect(-34+(i%2)*36,-132+Math.floor(i/2)*50,30,40);}},
 planets(c,o){c.strokeStyle='#888';c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.lineTo(0,40);c.moveTo(-240,40);c.lineTo(240,40);c.stroke();const p=[[-220,'#e0a060',14],[-130,'#60a0e0',18],[-40,'#e06040',12],[60,'#d8c080',28],[170,'#a0d0e0',20]];for(const [x,col,r] of p){c.beginPath();c.moveTo(x,40);c.lineTo(x,90);c.stroke();c.fillStyle=col;c.beginPath();c.arc(x,90+r,r,0,7);c.fill();}c.strokeStyle='#d8c080';c.lineWidth=3;c.beginPath();c.ellipse(60,118,44,8,-.2,0,7);c.stroke();},
 telescope(c,o){c.strokeStyle='#5a5a66';c.lineWidth=5;c.beginPath();c.moveTo(0,-90);c.lineTo(-40,0);c.moveTo(0,-90);c.lineTo(40,0);c.moveTo(0,-90);c.lineTo(0,0);c.stroke();c.save();c.translate(0,-100);c.rotate(-.6);c.fillStyle='#b8b8c8';c.fillRect(-20,-14,140,28);c.fillStyle='#8888a0';c.fillRect(110,-18,16,36);c.restore();},
 chart(c,o){c.fillStyle='#14183a';c.fillRect(-100,-80,200,160);c.strokeStyle='#c9a75e';c.lineWidth=4;c.strokeRect(-100,-80,200,160);c.fillStyle='#f0f0d0';const pts=[[-60,-40],[-20,-50],[10,-20],[50,-30],[70,20],[20,40],[-40,30]];for(const [x,y] of pts){c.beginPath();c.arc(x,y,3,0,7);c.fill();}c.strokeStyle='#f0f0d080';c.lineWidth=1;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();},
 bookshelf(c,o){c.fillStyle='#4a3020';c.fillRect(-100,-260,200,260);for(let r=0;r<4;r++){c.fillStyle='#2a1a10';c.fillRect(-92,-250+r*62,184,52);for(let b=0;b<11;b++){c.fillStyle=['#7a2a2a','#2a4a7a','#5a6a2a','#7a6a3a','#4a2a5a'][(b*3+r)%5];c.fillRect(-90+b*16.5,-246+r*62+((b*7+r)%3)*4,13,48-((b*7+r)%3)*4);}}},
 cabinet(c,o){c.fillStyle='#6a7078';c.fillRect(-55,-200,110,200);for(let i=0;i<4;i++){c.fillStyle='#5a6068';c.fillRect(-48,-192+i*48,96,42);c.fillStyle='#ccc';c.fillRect(-12,-174+i*48,24,5);}},
 box(c,o){c.fillStyle='#b08a5a';c.fillRect(-44,-70,88,70);c.fillStyle='#8a6a40';c.fillRect(-44,-70,88,10);c.fillStyle='#d8c8a0';c.fillRect(-20,-50,40,20);},
 desklamp(c,o,room){c.strokeStyle='#333';c.lineWidth=5;c.beginPath();c.moveTo(0,80);c.lineTo(-20,20);c.lineTo(20,-10);c.stroke();c.fillStyle='#2a6a3a';c.beginPath();c.moveTo(10,-20);c.lineTo(50,-10);c.lineTo(36,10);c.closePath();c.fill();if(room.light!=='dark'){c.fillStyle='#ffe8a020';c.beginPath();c.moveTo(36,4);c.lineTo(10,120);c.lineTo(110,120);c.closePath();c.fill();}},
 pipe(c,o){c.fillStyle='#5a5048';c.fillRect(-480,0,960,24);c.fillStyle='#6a6058';for(let i=-440;i<480;i+=160)c.fillRect(i,-4,16,32);},
 chair(c,o){c.fillStyle=o.c||'#5a4030';c.fillRect(-26,-50,52,8);c.fillRect(-26,-110,8,110);c.fillRect(18,-50,8,50);c.fillRect(-26,-50,8,50);c.fillRect(-26,-110,52,10);},
 // extras (anomalies)
 doll(c,o){c.fillStyle=o.c;c.beginPath();c.moveTo(-16,0);c.lineTo(16,0);c.lineTo(8,-36);c.lineTo(-8,-36);c.fill();face(c,0,-46,12,'eyes');c.fillStyle='#e0c040';c.beginPath();c.arc(0,-54,12,Math.PI,0);c.fill();},
 bucket(c,o){c.fillStyle=o.c;c.beginPath();c.moveTo(-22,0);c.lineTo(22,0);c.lineTo(28,-44);c.lineTo(-28,-44);c.fill();c.strokeStyle='#888';c.lineWidth=2;c.beginPath();c.arc(0,-44,26,Math.PI,0);c.stroke();},
 handprint(c,o){c.fillStyle='#8a1a1a';c.beginPath();c.ellipse(0,-140,16,20,0,0,7);c.fill();for(let i=0;i<5;i++){c.beginPath();c.ellipse(-16+i*8,-170+Math.abs(i-2)*4,3,11,0,0,7);c.fill();}},
 umbrella(c,o){c.strokeStyle='#333';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(0,-80);c.stroke();c.fillStyle=o.c;c.beginPath();c.moveTo(-10,-80);c.lineTo(10,-80);c.lineTo(4,-20);c.lineTo(-4,-20);c.fill();},
 shoe(c,o){c.fillStyle='#2a1a10';c.beginPath();c.ellipse(0,-8,22,9,0,0,7);c.fill();c.fillRect(-20,-20,14,14);},
 visitor(c,o){c.fillStyle='#1a1a22';c.beginPath();c.moveTo(-26,0);c.lineTo(26,0);c.lineTo(20,-120);c.lineTo(-20,-120);c.fill();c.beginPath();c.arc(0,-140,20,0,7);c.fill();c.fillStyle='#e0e0e0';c.beginPath();c.arc(-7,-142,2.5,0,7);c.arc(7,-142,2.5,0,7);c.fill();},
 tall(c,o){c.fillStyle='#0a0a0e';c.beginPath();c.moveTo(-14,0);c.lineTo(14,0);c.lineTo(10,-240);c.lineTo(-10,-240);c.fill();c.beginPath();c.ellipse(0,-262,12,22,0,0,7);c.fill();c.strokeStyle='#0a0a0e';c.lineWidth=5;c.beginPath();c.moveTo(-8,-220);c.lineTo(-30,-100);c.moveTo(8,-220);c.lineTo(30,-100);c.stroke();},
 child(c,o){c.fillStyle='#d8d8e0';c.beginPath();c.moveTo(-20,0);c.lineTo(20,0);c.lineTo(12,-70);c.lineTo(-12,-70);c.fill();c.fillStyle='#2a2a30';c.beginPath();c.arc(0,-86,16,0,7);c.fill();c.fillRect(-16,-86,32,30);},
 guard(c,o){c.fillStyle='#1d3060';c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.lineTo(20,-110);c.lineTo(-20,-110);c.fill();face(c,0,-128,17,'blank');c.fillStyle='#1d3060';c.fillRect(-18,-150,36,10);},
 eyes(c,o){for(const [dx,dy] of [[0,0],[70,30],[-40,60]].slice(0,o.s<1?1:3)){c.fillStyle='#ffe040';c.shadowColor='#ffe040';c.shadowBlur=10;c.beginPath();c.ellipse(dx-8,dy,5,3,0,0,7);c.ellipse(dx+8,dy,5,3,0,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#000';c.fillRect(dx-9,dy-2,2,4);c.fillRect(dx+7,dy-2,2,4);}},
 shadow(c,o){c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.ellipse(0,0,34,44,0,0,7);c.fill();c.beginPath();c.moveTo(-50,40);c.lineTo(50,40);c.lineTo(36,200);c.lineTo(-36,200);c.fill();},
 face(c,o){c.globalAlpha=.55;face(c,0,0,40,'eyes');c.globalAlpha=1;}
};
function drawObj(c,o,room,t){
 if(o.hidden)return;const fn=DRAW[o.t];if(!fn)return;c.save();c.translate(o.x,o.y);c.scale(o.s||1,o.s||1);if(o.flip)c.rotate(Math.PI);if(o.t==='balloon')c.translate(0,Math.sin(t*1.2+o.x)*3);fn(c,o,room);c.restore();
}
export function drawRoom(c,room,objects,extras,t,o={}){
 const def=room;c.save();
 // wall + floor
 const wall=c.createLinearGradient(0,0,0,330);wall.addColorStop(0,shade(def.wall,-.35));wall.addColorStop(1,def.wall);c.fillStyle=wall;c.fillRect(0,0,W,330);
 c.fillStyle='#00000025';for(let x=0;x<W;x+=120)c.fillRect(x,0,2,330);c.fillStyle=shade(def.wall,-.2);c.fillRect(0,300,W,30);
 const fl=c.createLinearGradient(0,330,0,H);fl.addColorStop(0,shade(def.floor,-.2));fl.addColorStop(1,def.floor);c.fillStyle=fl;c.fillRect(0,330,W,H-330);
 c.strokeStyle='#00000030';c.lineWidth=1;for(let i=-10;i<=10;i++){c.beginPath();c.moveTo(W/2+i*40,330);c.lineTo(W/2+i*140,H);c.stroke();}for(let y=350;y<H;y+=(y-320)*.25){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
 const all=[...objects.filter(x=>x.y<=330&&x.t!=='rug'),...objects.filter(x=>x.t==='rug'),...objects.filter(x=>x.y>330&&x.t!=='rug').sort((a,b)=>a.y-b.y)];
 const ex=extras||[];const wallEx=ex.filter(e=>['eyes','shadow','face','handprint'].includes(e.t)),floorEx=ex.filter(e=>!wallEx.includes(e));
 for(const x of all.filter(a=>a.y<=330||a.t==='rug'))drawObj(c,x,o.lightRoom||room,t);for(const e of wallEx)drawObj(c,e,room,t);
 const floorItems=[...all.filter(a=>a.y>330&&a.t!=='rug'),...floorEx].sort((a,b)=>a.y-b.y);for(const x of floorItems)drawObj(c,x,o.lightRoom||room,t);
 c.restore();
}
export function shade(hex,f){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=v=>Math.max(0,Math.min(255,Math.round(f>0?v+(255-v)*f:v*(1+f))));return `rgb(${m(r)},${m(g)},${m(b)})`;}
// Camera post-processing: tint, light anomaly, noise, scanlines, vignette, overlay text.
let noiseFrames=null;
function noise(){if(noiseFrames)return noiseFrames;noiseFrames=[];for(let k=0;k<6;k++){const cv=document.createElement('canvas');cv.width=240;cv.height=140;const c=cv.getContext('2d'),img=c.createImageData(240,140);for(let i=0;i<img.data.length;i+=4){const v=Math.random()*255;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=255;}c.putImageData(img,0,0);noiseFrames.push(cv);}return noiseFrames;}
export function postFx(c,light,t,o={}){
 if(light==='dark'){c.fillStyle='rgba(0,0,10,.62)';c.fillRect(0,0,W,H);}
 else if(light==='dim'){c.fillStyle='rgba(0,0,10,.32)';c.fillRect(0,0,W,H);}
 else if(light==='red'){c.fillStyle='rgba(160,0,0,.28)';c.fillRect(0,0,W,H);}
 else if(light==='green'){c.fillStyle='rgba(0,140,40,.22)';c.fillRect(0,0,W,H);}
 else if(light==='flicker'&&Math.sin(t*23)*Math.sin(t*7.3)>.35){c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,0,W,H);}
 c.fillStyle=o.reference?'rgba(255,230,180,.10)':'rgba(40,120,110,.16)';c.fillRect(0,0,W,H);
 c.globalAlpha=o.static?.65:.07;const n=noise();c.drawImage(n[Math.floor(t*24)%n.length],0,0,W,H);c.globalAlpha=1;
 c.fillStyle='rgba(0,0,0,.18)';for(let y=(t*40)%4;y<H;y+=4)c.fillRect(0,y,W,1);
 const v=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.9);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.65)');c.fillStyle=v;c.fillRect(0,0,W,H);
}
