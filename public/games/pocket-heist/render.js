import {box,text,circle} from './runtime.js';
import {CELL,OX,OY,COLS,ROWS,blocked} from './model.js';

const TAU=Math.PI*2,ROOM_W=COLS*CELL,ROOM_H=ROWS*CELL;
const PAL={floor:['#263a43','#293e47'],wall:'#455c64',trim:'#b5ac86',accent:'#eac58b'};
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function rect(c,x,y,w,h,color,r=3){c.fillStyle=color;box(c,x,y,w,h,r);c.fill();}
function diamond(c,x,y,size,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size*.72,y-size*.26);c.lineTo(x+size*.55,y+size*.3);c.lineTo(x,y+size);c.lineTo(x-size*.55,y+size*.3);c.lineTo(x-size*.72,y-size*.26);c.closePath();c.fill();c.strokeStyle='#fff6d477';c.lineWidth=1;c.stroke();line(c,x-size*.72,y-size*.26,x+size*.72,y-size*.26,'#ffffff70');line(c,x,y-size,x-size*.22,y-size*.26,'#ffffff80');line(c,x-size*.22,y-size*.26,x,y+size,'#ffffff66');}
function glow(c,x,y,r,color){const gradient=c.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,color);gradient.addColorStop(1,'#00000000');c.fillStyle=gradient;circle(c,x,y,r);c.fill();}
function tinyLock(c,x,y,color){c.strokeStyle=color;c.lineWidth=1.7;c.beginPath();c.arc(x,y-3,3,Math.PI,TAU);c.stroke();rect(c,x-4,y-3,8,7,color,1.5);c.fillStyle='#15212b';circle(c,x,y,1);c.fill();}

function floor(c,g,p){
 const chapter=g.board.chapter||0,skin=chapter%5;
 rect(c,OX-17,OY-17,ROOM_W+34,ROOM_H+34,'#020910',9);
 rect(c,OX-13,OY-14,ROOM_W+26,ROOM_H+26,'#263740',7);
 rect(c,OX-9,OY-10,ROOM_W+18,ROOM_H+18,p.trim||PAL.trim,5);
 c.fillStyle=p.floor?.[0]||PAL.floor[0];c.fillRect(OX,OY,ROOM_W,ROOM_H);
 c.save();c.beginPath();c.rect(OX,OY,ROOM_W,ROOM_H);c.clip();
 if(skin===1||skin===4){
  // Broad stone slabs, with a quiet grain rather than a checkerboard.
  for(let y=0;y<ROWS;y++){for(let x=-1;x<COLS;x+=2){const px=OX+x*CELL+(y%2)*CELL,py=OY+y*CELL;c.fillStyle=(x+y)%3===0?(p.floor?.[1]||PAL.floor[1]):(p.floor?.[0]||PAL.floor[0]);c.fillRect(px+1,py+1,CELL*2-2,CELL-2);line(c,px+8,py+12,px+84,py+36,'#e8f1eb06');line(c,px+44,py+8,px+19,py+45,'#01080e12');}}
 }else if(skin===2){
  for(let y=0;y<ROOM_H;y+=13)for(let x=-52;x<ROOM_W;x+=104){const px=OX+x+(Math.floor(y/13)%3)*27,py=OY+y;c.fillStyle=p.floor?.[1]||PAL.floor[1];c.fillRect(px+1,py+1,102,11);line(c,px+7,py+5,px+88,py+5,'#f4d09a08');}
 }else if(skin===3){
  for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){const px=OX+x*CELL,py=OY+y*CELL;rect(c,px+1,py+1,CELL-2,CELL-2,p.floor?.[(x+y)%2]||PAL.floor[(x+y)%2],1);line(c,px+9,py+10,px+41,py+10,'#e0ebf009');line(c,px+9,py+38,px+41,py+38,'#02090e25');}
 }else{
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const px=OX+x*CELL,py=OY+y*CELL;c.fillStyle=p.floor?.[(x+y)%2]||PAL.floor[(x+y)%2];c.fillRect(px+.5,py+.5,CELL-1,CELL-1);line(c,px+8,py+9,px+43,py+38,'#d7e7e907');if((x+y)%4===0)line(c,px+24,py+2,px+12,py+47,'#f1e8d506');}
 }
 // A narrow brass perimeter and inlaid corners make each job feel like a place.
 c.strokeStyle='#d9c89530';c.lineWidth=1;c.strokeRect(OX+8.5,OY+8.5,ROOM_W-17,ROOM_H-17);
 for(const xx of [OX+13,OX+ROOM_W-13])for(const yy of [OY+13,OY+ROOM_H-13]){c.save();c.translate(xx,yy);c.rotate(Math.PI/4);c.strokeStyle='#d8c88f42';c.strokeRect(-3,-3,6,6);c.restore();}
 const sheen=c.createLinearGradient(OX,OY,OX+ROOM_W,OY+ROOM_H);sheen.addColorStop(0,'#dbe7d609');sheen.addColorStop(.5,'#ffffff00');sheen.addColorStop(1,'#00071235');c.fillStyle=sheen;c.fillRect(OX,OY,ROOM_W,ROOM_H);
 c.restore();
 // Room edge: pilasters, small wall lamps, and a deep lower face.
 rect(c,OX-11,OY+ROOM_H+1,ROOM_W+22,10,'#101e29',2);
 for(let i=0;i<4;i++){const x=OX+34+i*(ROOM_W-68)/3;rect(c,x-7,OY-14,14,7,'#435259',2);line(c,x-3,OY-12,x+3,OY-12,'#f6d7a5',2);}
 for(const x of [OX-13,OX+ROOM_W+4])for(const y of [OY+26,OY+ROOM_H-43]){rect(c,x,y,9,17,'#42535a',1);line(c,x+1,y+2,x+7,y+2,'#a9ad9d77');}
}

function floorsWithMechanics(c,g,t){
 for(const tile of g.board.noisy||[]){const x=OX+tile[0]*CELL,y=OY+tile[1]*CELL;rect(c,x+3,y+3,CELL-6,CELL-6,'#a0abb31c',2);for(let n=0;n<4;n++){line(c,x+9,y+10+n*9,x+42,y+10+n*9,'#b2c1c141',2);line(c,x+13+n*9,y+7,x+13+n*9,y+44,'#07131b60',1);}rect(c,x+21,y+22,10,8,'#25333c',2);line(c,x+24,y+25,x+28,y+25,'#f0c28b',1);}
 for(const tile of g.board.hiding||[]){const x=OX+(tile[0]+.5)*CELL,y=OY+(tile[1]+.5)*CELL;rect(c,x-21,y-21,42,42,'#0b1c27',4);c.strokeStyle='#538478';c.lineWidth=1;c.setLineDash([3,4]);box(c,x-20,y-20,40,40,4);c.stroke();c.setLineDash([]);for(let i=0;i<5;i++){c.save();c.translate(x-15+i*7.5,y+Math.sin(i)*2);c.rotate(-.5+i*.24);c.fillStyle=i%2?'#3d6d5c':'#497a63';c.beginPath();c.ellipse(0,0,4,14,0,0,TAU);c.fill();c.restore();}line(c,x-16,y+15,x+16,y+15,'#72937b');}
}

function cabinet(c,wall,index,chapter,p){
 const [cx,cy,tw,th]=wall,x=OX+cx*CELL,y=OY+cy*CELL,w=tw*CELL,h=th*CELL;
 rect(c,x+4,y+7,w-1,h-1,'#0208108f',5);
 const metal=chapter%5===3,wood=chapter%5===2;
 rect(c,x+.5,y+.5,w-1,h-1,metal?'#263640':wood?'#5a4538':p.wall||PAL.wall,4);
 c.strokeStyle=p.trim||PAL.trim;c.lineWidth=1;box(c,x+2.5,y+2.5,w-5,h-5,3);c.stroke();
 rect(c,x+6,y+6,w-12,h-12,metal?'#162a34':wood?'#382f2b':'#142d38',2);
 const glass=c.createLinearGradient(x,y,x+w,y+h);glass.addColorStop(0,'#c7e8eb24');glass.addColorStop(.4,'#80b8c113');glass.addColorStop(.45,'#e4f7ed18');glass.addColorStop(.6,'#8ba6bc06');glass.addColorStop(1,'#03101844');c.fillStyle=glass;box(c,x+7,y+7,w-14,h-14,2);c.fill();
 const count=Math.max(tw,th);for(let j=0;j<count;j++){
  const ax=x+CELL/2+(tw>=th?j*CELL:0),ay=y+CELL/2+(th>tw?j*CELL:0);
  if(j>0){if(tw>=th)line(c,ax-CELL/2,y+7,ax-CELL/2,y+h-7,'#a4b4b52b');else line(c,x+7,ay-CELL/2,x+w-7,ay-CELL/2,'#a4b4b52b');}
  if(metal){rect(c,ax-13,ay-12,26,24,'#3d4f58',3);c.strokeStyle='#79898f';box(c,ax-11,ay-10,22,20,2);c.stroke();circle(c,ax+4,ay,4);c.strokeStyle='#bac1b4';c.stroke();line(c,ax-8,ay-6,ax-2,ay-6,'#8ba3a8');}
  else if((index+j+chapter)%3===0){rect(c,ax-11,ay-12,22,24,'#c8a46e',2);rect(c,ax-8,ay-9,16,18,'#3d5362',1);c.fillStyle='#9cb8bb';c.beginPath();c.moveTo(ax-6,ay+6);c.lineTo(ax-1,ay-4);c.lineTo(ax+3,ay+2);c.lineTo(ax+7,ay-1);c.lineTo(ax+7,ay+6);c.fill();circle(c,ax+4,ay-5,2);c.fillStyle='#e3ce9f';c.fill();}
  else{rect(c,ax-9,ay+8,18,4,'#697c7b',1);c.fillStyle='#b9a47e';c.beginPath();c.moveTo(ax-3,ay+7);c.bezierCurveTo(ax-10,ay-1,ax+3,ay-4,ax+3,ay-10);c.bezierCurveTo(ax+12,ay-7,ax+7,ay+3,ax+3,ay+7);c.closePath();c.fill();circle(c,ax+2,ay-9,3);c.fillStyle='#e1c294';c.fill();}
 }
 line(c,x+10,y+9,x+w-10,y+9,'#d8e4d689',1.2);
 line(c,x+10,y+12,x+Math.min(w-12,25),y+Math.min(h-12,27),'#e0f3e61e',2);
 line(c,x+6,y+h-5,x+w-6,y+h-5,'#020a1a80',2);
}

function cone(c,board,x,y,angle,range,half,alert=false,camera=false){
 const color=alert?'#f7a484':'#f8df9d',points=[];
 for(let n=0;n<=32;n++){const a=angle-half+n/32*half*2,cs=Math.cos(a),sn=Math.sin(a);let r=4;for(;r<range;r+=7)if(blocked(board,x+cs*r,y+sn*r,0))break;points.push([x+cs*Math.min(range,Math.max(0,r-3)),y+sn*Math.min(range,Math.max(0,r-3))]);}
 c.save();c.beginPath();c.moveTo(x,y);for(const p of points)c.lineTo(...p);c.closePath();c.clip();
 const light=c.createRadialGradient(x,y,0,x,y,range);light.addColorStop(0,color+(alert?'69':'4b'));light.addColorStop(.68,color+(alert?'32':'22'));light.addColorStop(1,color+'00');c.fillStyle=light;c.fillRect(x-range,y-range,range*2,range*2);
 c.strokeStyle=color+'35';c.lineWidth=.8;c.beginPath();c.moveTo(...points[0]);c.lineTo(x,y);c.lineTo(...points.at(-1));c.stroke();
 if(camera){c.strokeStyle=color+'18';c.setLineDash([3,6]);circle(c,x,y,range*.78);c.stroke();}
 c.restore();
}

function door(c,p){
 const w=(p.w||1)*CELL,h=(p.h||1)*CELL,x=p.x-w/2,y=p.y-h/2,color=p.kind==='switch'?'#b99be0':'#77ccd4';
 if(p.open){rect(c,x+1,y+1,w-2,h-2,'#0d1d2538',2);line(c,x+4,y+4,x+4,y+h-4,color+'80',3);line(c,x+w-4,y+4,x+w-4,y+h-4,color+'80',3);line(c,x+8,y+h/2,x+w-8,y+h/2,color+'28',1);return;}
 rect(c,x+3,y+7,w-2,h-2,'#01080f80',4);rect(c,x+1,y+1,w-2,h-2,'#273e4b',4);c.strokeStyle=color+'a6';c.lineWidth=1;box(c,x+3.5,y+3.5,w-7,h-7,3);c.stroke();rect(c,x+7,y+7,w-14,h-14,'#192f3d',2);line(c,p.x,y+7,p.x,y+h-7,'#0c1d2a',2);for(const sign of [-1,1]){line(c,p.x+sign*9,y+12,p.x+sign*9,y+h-12,'#66828b55',1);rect(c,p.x+sign*6-2,p.y-3,4,6,color,1);}tinyLock(c,p.x,p.y-1,color);rect(c,p.x-10,y+h-10,20,4,'#080f19',1);line(c,p.x-7,y+h-8,p.x+7,y+h-8,color,1.5);
}

function loot(c,p,index,g,t){
 const near=Math.hypot(p.x-g.x,p.y-g.y)<42,bob=Math.sin(t*2.2+index)*1.5;
 c.fillStyle='#0209137a';c.beginPath();c.ellipse(p.x+2,p.y+8,17,10,0,0,TAU);c.fill();
 if(p.vault){rect(c,p.x-19,p.y-18,38,38,'#182734',4);c.strokeStyle='#b3a58a';c.lineWidth=1;box(c,p.x-16.5,p.y-15.5,33,32,3);c.stroke();rect(c,p.x-13,p.y-12,26,25,'#324955',2);circle(c,p.x,p.y,8);c.strokeStyle=p.taken?'#7bd0b0':'#e2c897';c.lineWidth=2;c.stroke();for(let n=0;n<4;n++){const a=n*Math.PI/2;line(c,p.x+Math.cos(a)*3,p.y+Math.sin(a)*3,p.x+Math.cos(a)*8,p.y+Math.sin(a)*8,p.taken?'#7bd0b0':'#b0ad9c',1.5);}if(!p.taken){rect(c,p.x-13,p.y-12,6,4,'#c09b68',1);if((p.progress||0)>0){c.strokeStyle='#f2cf8a';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,22,-Math.PI/2,-Math.PI/2+TAU*p.progress);c.stroke();}}else line(c,p.x-5,p.y,p.x-1,p.y+4,'#91e3be',2);}
 else{rect(c,p.x-15,p.y-13,30,29,'#0d1e29',4);rect(c,p.x-13,p.y-14,26,25,p.taken?'#34474e':'#4d6060',3);line(c,p.x-11,p.y-12,p.x+11,p.y-12,'#b7bba578');rect(c,p.x-8,p.y+10,16,3,'#c9b98b',1);if(!p.taken){glow(c,p.x,p.y,34,'#edd3a91a');c.save();c.translate(p.x,p.y-2+bob);if(p.kind==='painting'){rect(c,-10,-10,20,19,'#e2bb7b',1);rect(c,-7,-7,14,13,'#20384c',0);c.fillStyle='#7bafb0';c.beginPath();c.moveTo(-6,5);c.lineTo(-1,-4);c.lineTo(3,0);c.lineTo(6,-2);c.lineTo(6,5);c.fill();circle(c,3,-4,1.5);c.fillStyle='#f2d294';c.fill();}else if(p.kind==='idol'){rect(c,-7,7,14,3,'#cda252',1);c.fillStyle='#f1c76c';c.beginPath();c.moveTo(-4,6);c.lineTo(-6,-4);c.lineTo(0,-10);c.lineTo(6,-4);c.lineTo(4,6);c.fill();line(c,-3,-2,3,-2,'#fff0b6',2);circle(c,0,2,2);c.fillStyle='#86622a';c.fill();}else diamond(c,0,0,11,'#8be5e1');c.restore();}}
 if(near&&!p.taken){c.strokeStyle='#f3d59995';c.lineWidth=1.5;circle(c,p.x,p.y,24);c.stroke();text(c,p.vault?'HOLD E':'E',p.x,p.y-30,9,'#f5dfae','center');}
}

function person(c,p,guard,t,moving){
 const angle=guard?p.angle:p.heading,stride=moving?Math.sin(t*(guard?8:guard===false&&p.sneaking?6:11)+(guard?p.x*.08:0))*3:0;
 c.save();c.translate(p.x,p.y);c.rotate(angle||0);c.fillStyle='#020610a8';c.beginPath();c.ellipse(0,5,15,11,0,0,TAU);c.fill();
 // Boots, shoulders, gloved hands, and a visible face keep silhouettes readable.
 rect(c,-9-stride,-9,13,5,'#0a1420',2);rect(c,-9+stride,5,13,5,'#0a1420',2);
 rect(c,-7,-11,15,22,guard?'#477589':'#524665',6);rect(c,-6,-10,9,20,guard?'#375b71':'#38354f',4);
 rect(c,3,-12+stride*.4,10,5,guard?'#4e7f92':'#80728d',2);rect(c,3,7-stride*.4,10,5,guard?'#4e7f92':'#80728d',2);rect(c,10,-12+stride*.4,5,5,'#17232d',2);rect(c,10,7-stride*.4,5,5,'#17232d',2);
 if(guard){line(c,-2,-9,-2,9,'#a9c1c642',1);rect(c,4,-7,3,4,'#e9c974',1);rect(c,-5,-12,4,3,'#b3c3c7',1);rect(c,-5,9,4,3,'#b3c3c7',1);rect(c,8,10,11,4,'#172631',2);circle(c,20,12,2);c.fillStyle='#e9d391';c.fill();}
 else{rect(c,-12,-7,9,15,'#88795d',5);line(c,-8,-6,-8,6,'#b8a480',1);c.fillStyle='#c77c7e';c.beginPath();c.moveTo(-2,5);c.lineTo(-15,12+stride*.4);c.lineTo(-9,14+stride*.4);c.lineTo(4,7);c.fill();line(c,-1,-9,-1,9,'#bdb3c36a',2);}
 circle(c,7,0,8);c.fillStyle=guard?'#d5b795':'#d6b797';c.fill();
 if(guard){rect(c,2,-7,10,14,'#284b63',5);rect(c,11,-6,5,12,'#182e43',2);line(c,5,-5,5,5,'#a3c0c255');}
 else{rect(c,0,-8,11,16,'#211e32',5);rect(c,10,-6,5,12,'#30283e',2);line(c,14,-4,14,4,'#d7bba1',2);rect(c,12,-5,4,10,'#151827',1);rect(c,14,-3,2,2,'#e7e6cc',0);rect(c,14,2,2,2,'#e7e6cc',0);}
 c.restore();
 if(guard&&(p.alert>0||p.mode==='chase'||p.mode==='investigate')){const urgent=p.mode==='chase';rect(c,p.x-7,p.y-30,14,17,urgent?'#d76455':'#dcb273',4);text(c,urgent?'!':'?',p.x,p.y-18,12,'#1b2630','center');}
}

export function draw(c,g,t){
 t=g.time??t;const p={...PAL,...(g.board.palette||{})};
 const background=c.createLinearGradient(0,0,0,560);background.addColorStop(0,'#0d1b27');background.addColorStop(1,'#070e19');c.fillStyle=background;c.fillRect(0,0,960,560);
 text(c,(g.board.chapterName||'THE MERIDIAN COLLECTION').toUpperCase(),OX,36,11,'#c5b58f');
 text(c,'CONTRACT '+String(g.level).padStart(3,'0'),OX+ROOM_W,36,11,'#8dabb7','right');
 floor(c,g,p);floorsWithMechanics(c,g,t);
 const exit=g.exit,ready=g.ready;
 if(ready)glow(c,exit.x,exit.y,42,'#7fddac22');rect(c,exit.x-21,exit.y-21,42,42,ready?'#3b7763':'#264b48',3);rect(c,exit.x-17,exit.y-17,34,34,ready?'#254c43':'#1d3538',2);c.strokeStyle=ready?'#b2efc6':'#6d9c8b';c.lineWidth=1;box(c,exit.x-19.5,exit.y-19.5,39,39,2);c.stroke();
 if(ready){line(c,exit.x-10,exit.y,exit.x+10,exit.y,'#c7f6cc',2);line(c,exit.x+4,exit.y-6,exit.x+10,exit.y,'#c7f6cc',2);line(c,exit.x+4,exit.y+6,exit.x+10,exit.y,'#c7f6cc',2);}else tinyLock(c,exit.x,exit.y,'#9dbfa4');
 text(c,'EXIT',exit.x,exit.y+30,8,ready?'#b2e9c4':'#7f9e93','center');
 for(const guard of g.guards)cone(c,g.board,guard.x,guard.y,guard.angle,guard.range||182,.56,guard.mode==='chase'||g.alarm>.5&&guard.alert>0);
 for(const camera of g.cameras||[])if(camera.active!==false)cone(c,g.board,camera.x,camera.y,camera.angle,camera.range||174,.56,false,true);
 for(const [i,wall]of g.board.walls.entries())cabinet(c,wall,i,g.board.chapter||0,p);
 for(const doorData of g.doors||[])door(c,doorData);
 for(const key of g.keys||[]){if(key.taken)continue;glow(c,key.x,key.y,24,'#99dce51a');c.save();c.translate(key.x,key.y+Math.sin(t*2)*1.5);c.rotate(-.12);rect(c,-11,-7,22,14,'#8dcdd1',2);rect(c,-8,-4,5,7,'#263e4b',1);line(c,0,-2,7,-2,'#f2ead3',1.5);line(c,0,2,5,2,'#f2ead3',1.5);c.restore();}
 for(const sw of g.switches||[]){rect(c,sw.x-13,sw.y-14,26,28,'#23353e',3);c.strokeStyle=sw.on?'#89d8b6':'#bba3dc';c.lineWidth=1;box(c,sw.x-10.5,sw.y-11.5,21,23,2);c.stroke();rect(c,sw.x-7,sw.y-7,14,9,sw.on?'#4e8a75':'#77568f',1);line(c,sw.x-5,sw.y+7,sw.x+5,sw.y+7,sw.on?'#a8e8c0':'#e0bbfc',2);}
 for(const laser of g.lasers||[]){const active=laser.active!==false;line(c,laser.x1,laser.y1,laser.x2,laser.y2,active?'#ff777f22':'#a6c6d51a',active?8:1);line(c,laser.x1,laser.y1,laser.x2,laser.y2,active?'#f9707a':'#7d949a28',active?2:1);if(active)line(c,laser.x1,laser.y1,laser.x2,laser.y2,'#fff0dd99',.7);for(const pos of [[laser.x1,laser.y1],[laser.x2,laser.y2]]){circle(c,pos[0],pos[1],4);c.fillStyle='#223644';c.fill();circle(c,pos[0],pos[1],1.8);c.fillStyle=active?'#ff8d8a':'#7eb6a3';c.fill();}}
 for(const [i,pod]of g.loot.entries())loot(c,pod,i,g,t);
 for(const camera of g.cameras||[]){c.save();c.translate(camera.x,camera.y);c.rotate(camera.angle||0);rect(c,-6,-3,10,6,'#6a7a80',2);rect(c,0,-7,17,14,'#a2b5b5',3);rect(c,10,-6,8,12,'#526c78',2);rect(c,16,-4,4,8,'#112432',1);circle(c,8,-3,1.3);c.fillStyle=camera.active===false?'#77c3a0':'#ebae83';c.fill();c.restore();}
 for(const guard of g.guards)person(c,guard,true,t,g.status==='playing'&&guard.mode!=='watch');
 c.save();if(g.hidden)c.globalAlpha=.48;person(c,g,false,t,g.status==='playing'&&(Math.abs(g.vx||0)+Math.abs(g.vy||0)>1||g.moving));c.restore();
 if(g.sneaking||g.hidden||g.smoked){c.strokeStyle=g.hidden||g.smoked?'#8ed6b9a8':'#b6cbcf66';c.lineWidth=1;c.setLineDash([2,4]);circle(c,g.x,g.y,18);c.stroke();c.setLineDash([]);if(g.hidden||g.smoked)text(c,g.smoked?'IN SMOKE':'HIDDEN',g.x,g.y-27,8,'#b2e6c8','center');}
 if(g.grace>0){c.strokeStyle='#a4dcc1'+Math.round(Math.min(1,g.grace)*90).toString(16).padStart(2,'0');c.lineWidth=1;circle(c,g.x,g.y,22);c.stroke();}
 for(const smoke of g.smoke||[]){const alpha=Math.min(.75,Math.max(0,smoke.life)*.4);for(let n=0;n<7;n++){const a=n*2.4,dist=12+(n%3)*9;c.fillStyle=`rgba(151,174,185,${alpha*.42})`;c.beginPath();c.ellipse(smoke.x+Math.cos(a+t*.13)*dist,smoke.y+Math.sin(a+t*.13)*dist,24+(n%2)*8,22+(n%3)*4,a,0,TAU);c.fill();}}
 if(g.alarm>.15){const edge=c.createRadialGradient(480,280,220,480,280,520);edge.addColorStop(0,'#c7423500');edge.addColorStop(1,`rgba(193,61,47,${g.alarm*.16})`);c.fillStyle=edge;c.fillRect(0,50,960,470);}
 text(c,g.board.name,OX,527,12,'#aabcc4');
 text(c,g.hidden?'OUT OF SIGHT':g.alarm>.02?'SUSPICION '+Math.round(g.alarm*100)+'%':'LEAVE NO TRACE',OX+ROOM_W,527,10,g.alarm>.5?'#f0af8b':g.hidden?'#9ed6b8':'#7d9aab','right');
 // Small scene labels sit outside the room and never obscure a route or a threat.
 if(g.keys?.some(k=>k.taken)){rect(c,31,OY+16,68,29,'#152b35',4);text(c,'KEYCARD',65,OY+34,8,'#97d1d3','center');}
 if((g.smokeCharges||0)>0){text(c,'SMOKE',65,OY+ROOM_H-45,8,'#7e98a8','center');text(c,String(g.smokeCharges)+' · Q',65,OY+ROOM_H-27,13,'#c1d1d4','center');}
 c.lineWidth=1;c.setLineDash([]);c.textAlign='left';
}
