import {recruitAccessory} from './expansion-art.js';
import {DUCKS,DOGS,STAGES,duckStats} from './model.js';
const TAU=Math.PI*2;
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function text(c,value,x,y,size,color='#edf0d9',font='sans-serif'){c.fillStyle=color;c.font='700 '+size+'px '+font;c.textAlign='center';c.textBaseline='middle';c.fillText(value,x,y);}
export function duck(c,type,x,y,size=1,{time=0,hurt=false,shoot=false}={}){
 const color=DUCKS[type].color;c.save();c.translate(x,y);c.scale(size,size);if(hurt)c.globalAlpha=.65;
 oval(c,0,22,30,7,'#122e2c30');
 // Webbed feet and a low, rounded silhouette keep the defenders unmistakably ducks.
 line(c,[[-9,17],[-10,23],[-20,24]],'#cc9857',5);line(c,[[8,17],[13,22],[22,23]],'#cc9857',5);
 c.fillStyle=color;c.beginPath();c.moveTo(-25,6);c.quadraticCurveTo(-39,-9,-29,-11);c.quadraticCurveTo(-18,-1,-13,-7);c.bezierCurveTo(9,-24,31,-7,27,10);c.bezierCurveTo(19,31,-15,28,-25,6);c.fill();
 oval(c,17,-15,19,20,color);oval(c,25,-10,11,10,'#eff0d7');
 c.fillStyle='#d9a156';c.beginPath();c.moveTo(30,-13);c.quadraticCurveTo(56,-11,43,-3);c.lineTo(30,-2);c.fill();
 oval(c,24,-19,3,3.7,'#223f3e');oval(c,25,-20,1,1,'#fff9df');
 c.strokeStyle='#5d817460';c.lineWidth=2;c.beginPath();c.ellipse(-3,6,17,10,-.3,0,Math.PI*1.5);c.stroke();
 if(type==='baker'){box(c,-1,-40,32,9,'#f0e9ce',4);oval(c,4,-44,9,10,'#f0e9ce');oval(c,16,-48,11,12,'#f0e9ce');oval(c,27,-43,8,10,'#f0e9ce');box(c,-14,5,25,17,'#8da6a0',4);oval(c,-2,13,9,5,'#c49659');line(c,[[-7,12],[-3,10]],'#f2d39a',1.5);}
 if(type==='guard'){box(c,3,-6,22,38,'#597d61',7);for(let i=0;i<4;i++)line(c,[[7+i*5,-3],[7+i*5,28]],'#abc18c',2);box(c,7,-32,24,11,'#6c8c69',4);line(c,[[9,-35],[28,-39]],'#abc18c',3);}
 if(type==='frost'){box(c,2,-35,29,9,'#c8e4e0',3);line(c,[[16,-50],[16,-35]],'#c8e4e0',3);line(c,[[8,-44],[24,-39]],'#c8e4e0',2);line(c,[[9,-39],[23,-46]],'#c8e4e0',2);}
 if(type==='twin'){box(c,0,-36,32,9,'#72718e',3);box(c,6,-46,20,15,'#72718e',4);oval(c,1,7,12,8,'#d3cee8');oval(c,40,shoot?-7:-8,3,3,'#cee4e0');}
 if(type==='splash'){box(c,-2,-35,32,10,'#b86458',4);oval(c,13,-36,8,4,'#b86458');line(c,[[11,-39],[17,-49],[26,-45]],'#e3c189',3);for(let i=0;i<3;i++)oval(c,-12+i*11,11,3,3,'#f4dec1');}
 if(type==='sniper'){box(c,-2,-34,34,9,'#496979',4);box(c,21,-29,16,10,'#304c5e',3);oval(c,29,-24,5,4,'#abcbd2');line(c,[[31,-11],[61,-11]],'#5c8491',7);box(c,48,-16,8,10,'#9cb6bd',2);}
 if(type==='medic'){box(c,-1,-37,34,13,'#eff1e6',4);box(c,12,-36,5,11,'#ba756d',1);box(c,9,-33,11,5,'#ba756d',1);box(c,-21,2,24,20,'#8ca994',4);line(c,[[-15,11],[-3,11]],'#edf0df',3);}
 if(type==='ember'){box(c,-2,-34,34,10,'#a56c53',4);box(c,-20,-4,18,27,'#98734f',4);oval(c,-11,9,6,9,'#f0c079');line(c,[[-13,15],[-9,0],[-5,15]],'#f3deab',3);line(c,[[2,-3],[16,3],[25,-1]],'#ac6958',6);}
 if(type==='spark'){box(c,0,-36,33,10,'#777390',4);line(c,[[12,-37],[12,-52],[21,-48],[18,-41]],'#e3d4a1',3);oval(c,-7,10,12,10,'#7c829e');line(c,[[-11,3],[-3,9],[-10,16]],'#e4dcaa',3);}
 if(type==='fan'){c.fillStyle='#688c83';c.beginPath();c.moveTo(-7,12);c.arc(-7,12,31,-Math.PI,-.35);c.closePath();c.fill();for(let i=0;i<5;i++){const a=-Math.PI+i*.66;line(c,[[-7,12],[-7+Math.cos(a)*28,12+Math.sin(a)*28]],'#b9d1b9',2);}box(c,2,-35,30,8,'#779b8a',3);}
 if(type==='gust'){box(c,4,-34,29,12,'#718e99',5);oval(c,13,-29,5,4,'#d8e5dc');oval(c,27,-29,5,4,'#d8e5dc');line(c,[[-9,12],[-21,-15]],'#789496',3);for(let i=0;i<4;i++){const a=i*TAU/4;oval(c,-21+Math.cos(a)*8,-15+Math.sin(a)*8,8,4,'#d4e1dc');}oval(c,-21,-15,3,3,'#7f9d9f');}
 if(type==='penny'){box(c,-2,-34,38,8,'#ac925d',4);box(c,6,-45,21,15,'#c5b178',6);box(c,-23,1,24,22,'#99805a',5);oval(c,-11,11,7,7,'#e3cc84');text(c,'¢',-11,11,10,'#8c794a');}
 if(type==='bramble'){oval(c,0,6,27,21,'#6d8264');for(let i=0;i<8;i++){const a=-Math.PI+i*Math.PI/7;line(c,[[Math.cos(a)*22,7+Math.sin(a)*19],[Math.cos(a)*34,7+Math.sin(a)*32]],'#d8d5ac',4);}box(c,4,-35,28,9,'#6d8264',4);line(c,[[9,-36],[12,-46],[18,-37],[27,-45],[28,-35]],'#b9c09a',3);}
 recruitAccessory(c,type,{box,oval,line,text,TAU},time);
 if(shoot){oval(c,49,-8,4,5,type==='frost'?'#d9eef1':'#a6d8df');}
 c.restore();
}
export function dog(c,type,x,y,size=1,{time=0,hurt=false,cold=false,air=0,burrow=false,sprinting=false,windup=0}={}){
 const color=DOGS[type].color;c.save();c.translate(x,y-air*30);c.scale(-size,size);if(hurt)c.globalAlpha=.65;
 oval(c,0,26,34,7,'#17302d35');
 if(burrow){oval(c,0,17,32,13,'#7c8060');oval(c,-9,11,19,10,'#aa9a77');box(c,9,4,19,8,'#c1ad76',4);line(c,[[-26,22],[-19,15],[-12,20]],'#c4b38c',2);c.restore();return;}
 const walk=Math.sin(time*(type==='runner'?15:7))*4;
 for(const [px,offset]of [[-19,1],[-10,-1],[12,-1],[23,1]])line(c,[[px,11],[px+walk*offset,25]],color,7);
 line(c,[[-25,0],[-37,-10],[-40,-22]],color,6);
 oval(c,-1,3,30,19,cold?'#a8bbc5':color);oval(c,19,-15,20,21,cold?'#a8bbc5':color);
 oval(c,5,-18,9,19,'#725d52');oval(c,33,-6,13,10,'#dfc7a5');oval(c,43,-8,5,4,'#2b3333');oval(c,28,-23,3,3.2,'#263534');oval(c,29,-24,1,1,'#f4e8cc');
 box(c,6,-1,22,6,type==='runner'?'#9c5f56':'#536c73',3);oval(c,19,6,4,4,'#c9ad75');
 if(type==='helmet'){c.fillStyle='#a0b3b5';c.beginPath();c.moveTo(2,-33);c.lineTo(8,-56);c.lineTo(34,-56);c.lineTo(39,-33);c.closePath();c.fill();line(c,[[0,-32],[41,-32]],'#d0d8cc',4);line(c,[[13,-51],[11,-39]],'#d0d8cc',2);}
 if(type==='hopper'){box(c,8,-40,26,9,'#886987',3);line(c,[[4,7],[-8,25]],'#d0bcc9',5);line(c,[[-13,10],[-23,28]],'#d0bcc9',5);}
 if(type==='boss'){box(c,0,-44,37,12,'#aa765b',4);line(c,[[4,-44],[4,-56],[13,-50],[20,-60],[28,-50],[35,-56],[35,-44]],'#dcc184',4);box(c,-24,0,36,10,'#4d6970',5);}
 if(type==='howler'){box(c,-9,-5,32,10,'#9c745b',4);box(c,-8,-29,27,24,'#a58362',6);line(c,[[-2,-26],[-2,-12]],'#dac69d',3);oval(c,16,-25,10,13,'#bdab8c');line(c,[[44,-23],[50,-28]],'#e5d6b8',2);}
 if(type==='poodle'){for(const [px,py,r]of [[-21,9,12],[-1,-9,17],[14,-36,13],[32,-27,12],[-11,25,7],[22,25,7]])oval(c,px,py,r,r,'#e2d9c6');box(c,-15,-2,22,20,'#8da594',4);box(c,-6,1,4,13,'#f2efdf');box(c,-11,6,14,4,'#f2efdf');}
 if(type==='scout'){box(c,4,-2,26,7,'#be8d69',3);line(c,[[12,4],[9,15],[20,10]],'#dfbd8f',3);}
 if(type==='mastiff'){box(c,-24,-6,48,14,'#6d6c65',5);for(let i=0;i<4;i++)oval(c,-17+i*11,0,3,4,'#c4b79b');line(c,[[20,-30],[31,-28]],'#655c53',4);}
 if(type==='shield'){box(c,17,-22,24,48,'#819a9d',6);line(c,[[29,-16],[29,20]],'#c6d0c8',3);line(c,[[22,1],[36,1]],'#c6d0c8',3);box(c,3,-38,34,8,'#7c9198',3);}
 if(type==='drummer'){oval(c,-8,12,19,15,'#b98c68');box(c,-25,3,35,14,'#7b6459',3);line(c,[[-23,3],[8,17],[-23,17],[8,3]],'#d5b992',2);box(c,0,-40,33,9,'#8f725d',3);oval(c,19,-46,6,10,'#d3b69a');}
 if(type==='spitter'){line(c,[[8,-3],[27,6],[23,13]],'#708c6c',7);oval(c,37,-1,7+(windup>0?5:0),6,'#9db17d');oval(c,44,7,3,5,'#c5d6a0');}
 if(type==='kennel'){box(c,-27,-17,30,31,'#9a8567',5);line(c,[[-22,-11],[-5,-11],[-5,8]],'#d4c2a3',3);oval(c,-14,-10,7,7,'#d2bc97');oval(c,-11,-10,2,2,'#5e5c51');}
 if(type==='sprinter'){line(c,[[8,-2],[27,2],[32,11]],'#b66658',6);box(c,9,-33,24,7,'#b66658',2);line(c,[[-22,22],[-12,22]],'#ddc2a5',4);}
 if(type==='burrower'){box(c,2,-37,35,8,'#b6a36c',4);oval(c,20,-38,14,11,'#c5b783');oval(c,32,-38,5,5,'#ece2b8');line(c,[[-21,-17],[-1,19]],'#7f7055',3);box(c,-3,14,12,13,'#9fa79a',3);}
 if(type==='thief'){box(c,18,-29,18,9,'#646c6b',4);oval(c,27,-24,2,2,'#dfd5bb');box(c,-24,-9,24,25,'#8e806a',5);text(c,'▰',-12,3,10,'#d6bd83');}
 if(type==='leech'){box(c,5,-3,24,8,'#8c6977',3);oval(c,19,7,5,5,'#c69ba1');line(c,[[22,-33],[33,-32]],'#687483',4);}
 if(type==='switcher'){line(c,[[4,-1],[25,3],[30,15]],'#9b7c9b',7);line(c,[[-15,-2],[-26,-11],[-30,-3]],'#ccb5cc',3);}
 if(type==='cleaner'){box(c,0,-34,36,8,'#668e9a',4);oval(c,18,-37,15,10,'#8eafb7');box(c,-23,-11,24,29,'#a9c8c7',5);oval(c,-11,3,6,8,'#e0e9d8');}
 if(sprinting)for(let i=0;i<3;i++)line(c,[[-41-i*6,-2+i*8],[-55-i*6,-2+i*8]],'#e4cfad',2);
 if(cold){text(c,'❄',0,-45,13,'#d7eef1');}
 c.restore();
}
export function boardLayout(width,height){
 const scale=Math.min((width-14)/990,(height-12)/580),w=990*scale,h=580*scale;
 return {width,height,scale,ox:(width-w)/2,oy:(height-h)/2,x:70,y:58,cellW:102,cellH:92};
}
export function cellAt(l,x,y){const col=Math.floor(((x-l.ox)/l.scale-l.x)/l.cellW),row=Math.floor(((y-l.oy)/l.scale-l.y)/l.cellH);return row>=0&&row<5&&col>=0&&col<8?{row,col}:null;}
export function cellPosition(l,row,col){return {x:l.ox+(l.x+(col+.5)*l.cellW)*l.scale,y:l.oy+(l.y+(row+.5)*l.cellH)*l.scale};}
export function draw(c,l,game,{time=0,selected=null,shovel=false,upgrading=false,cursor=null,effects=[],motion=true}={}){
 const {scale:s,ox,oy}=l;c.clearRect(0,0,l.width,l.height);c.save();c.translate(ox,oy);c.scale(s,s);
 box(c,0,0,990,580,game.stage===2?'#547e81':'#87ada0',24);box(c,6,6,978,568,'#718f75',20);
 // The water and fence frame the garden, while the playable tiles remain uncluttered.
 box(c,0,0,990,39,game.stage===2?'#365a6c':'#5b9395',18);
 for(let i=0;i<16;i++)line(c,[[15+i*64,16],[37+i*64,16]],'#c1dfcf35',2);
 box(c,916,40,68,495,'#baa58a',12);for(let i=0;i<12;i++){const yy=50+i*43;line(c,[[930,yy],[970,yy]],'#8d7e6a50',2);}
 for(let row=0;row<5;row++){
  text(c,String(row+1),950,104+row*92,12,'#e6d9bd');
  for(let col=0;col<8;col++){const x=70+col*102,y=58+row*92;box(c,x+1,y+1,100,90,(row+col)%2?'#9cb88b':'#a9c299',5);for(let k=0;k<3;k++){const xx=x+17+(k*29+row*13)%75,yy=y+16+(k*19+col*11)%65;line(c,[[xx-3,yy+3],[xx,yy],[xx+3,yy+3]],'#65886235',1.5);}}
  if(!game.activeRows.includes(row)){box(c,70,58+row*92,816,92,'#416d5bd9',5);text(c,'PATH CLOSED',478,104+row*92,11,'#a4bd9f');}
  else if(game.patrols[row]){duck(c,'shooter',36,108+row*92,.55,{time:0});text(c,'G',31,139+row*92,8,'#e9e5ca');}else{oval(c,32,112+row*92,15,10,'#486b6450');}
 }
 for(const [row,col]of STAGES[game.stage].blocked){const x=70+(col+.5)*102,y=58+(row+.5)*92;oval(c,x,y+15,35,12,'#6a806e35');oval(c,x,y,32,22,'#8b9c90');oval(c,x-9,y-6,18,11,'#aebca5');line(c,[[x+4,y-13],[x+15,y+5]],'#6d8375',2);}
 for(let col=0;col<8;col++)text(c,String(col+1),121+col*102,548,10,'#dfebd1');
 for(const d of game.ducks){if(!DUCKS[d.type].tempo&&!DUCKS[d.type].reveal)continue;const x=70+(d.col+.5)*102,y=58+(d.row+.5)*92;c.strokeStyle=DUCKS[d.type].reveal?'#e4d9aa40':'#d7c9e83d';c.lineWidth=2;c.setLineDash([5,9]);c.beginPath();c.ellipse(x,y,DUCKS[d.type].reveal?255:204,108,0,0,TAU);c.stroke();c.setLineDash([]);}
 const units=[];for(const d of game.ducks)units.push({y:d.row,depth:d.col+.5,kind:'duck',d});for(const d of game.dogs)units.push({y:d.laneTime>0?d.row+(d.laneFrom-d.row)*d.laneTime/.6:d.row,depth:d.x,kind:'dog',d});units.sort((a,b)=>a.y-b.y||a.depth-b.depth);
 for(const unit of units){const d=unit.d,x=70+(unit.kind==='duck'?d.col+.5:d.x)*102,y=58+(unit.y+.5)*92;
  if(unit.kind==='duck'){duck(c,d.type,x,y+3,.91,{time:motion?time:0,hurt:d.flash>0&&d.hp<duckStats(d).hp,shoot:d.flash>0&&DUCKS[d.type].rate});if(d.level===2){box(c,x-32,y+27,64,13,'#315967',4);text(c,'VETERAN',x,y+34,7,'#eff0d9');}}
  else{if(d.type==='howler'||d.type==='drummer'){c.strokeStyle=d.type==='howler'?'#e9dab06b':'#d5bca578';c.lineWidth=2;c.beginPath();c.ellipse(x,y,43+(motion?Math.sin(time*4)*5:0),31,0,0,TAU);c.stroke();}dog(c,d.type,x,y+5,d.type==='boss'?1.3:.87*(DOGS[d.type].size||1),{time:motion?time:0,hurt:d.flash>0,cold:d.slow>0,air:d.air,burrow:d.burrow>0,sprinting:d.sprinting>0,windup:d.windup});if(d.burn>0){for(let i=0;i<3;i++)oval(c,x-18+i*12,y-27-(motion?Math.sin(time*10+i)*3:0),4,8,i%2?'#f2d297':'#c68b60');}}
  if(unit.kind==='dog'&&d.root>0){line(c,[[x-16,y+23],[x+16,y+23]],'#c7d7e6',4);oval(c,x,y+23,20,5,'#9ab4ca65');}
  const max=unit.kind==='duck'?duckStats(d).hp:d.maxHp;if(d.hp<max||unit.kind==='dog'&&d.type==='boss'){box(c,x-24,y-48,48,6,'#2c4d46',3);box(c,x-23,y-47,46*Math.max(0,d.hp/max),4,unit.kind==='duck'?'#dfd498':'#d9a18b',2);}
 }
 for(const shot of game.shots){const x=70+shot.x*102,y=58+(shot.row+.5)*92-6;if(shot.lob){const lift=Math.sin(shot.age/shot.flight*Math.PI)*100;oval(c,x,y-lift,shot.blastRows?9:7,shot.blastRows?8:6,shot.blastRows?'#c9b3db':'#d4d1b6');line(c,[[x-13,y-lift+6],[x-22,y-lift+12]],shot.blastRows?'#d8c9e7':'#b9c2ab',3);}else{oval(c,x,y,6,5,shot.root?'#a7c3df':shot.burn?'#dda46c':shot.chain?'#c1b1da':shot.cold?'#e0eff1':'#447f94');oval(c,x+1,y-2,2,1.5,'#e4ebce');}}

 if(cursor){const x=70+cursor.col*102,y=58+cursor.row*92;c.strokeStyle=upgrading?'#c6e6ef':shovel?'#bd785d':game.canPlace(selected,cursor.row,cursor.col)?'#b76859':'#f6e6ae';c.lineWidth=3;c.strokeRect(x+4,y+4,94,84);}
 for(const e of effects){const x=70+(e.x??0)*102,y=58+(e.row+.5)*92,alpha=Math.max(0,1-e.age/(e.type==='patrol'?1.1:.8));c.save();c.globalAlpha=alpha;
  if(e.type==='crumb')text(c,'+'+(e.amount||25),x,y-25-e.age*35,18,'#fff1b5');
  if(['bonus','refund','steal'].includes(e.type))text(c,(e.type==='steal'?'-':'+')+e.amount,x,y-25-e.age*35,17,e.type==='steal'?'#ead0b9':'#f0e0ac');
  if(e.type==='slash')line(c,[[x+8,y-20],[70+e.to*102,y-12],[x+18,y+14]],'#dce7c9',4);
  if(e.type==='reveal'){c.strokeStyle='#f0e5ba';c.lineWidth=3;c.beginPath();c.ellipse(x,y,16+e.age*48,8+e.age*25,0,0,TAU);c.stroke();}
  if(e.type==='impact'){c.strokeStyle=e.rows?'#d4bee5':'#e0dfbd';c.lineWidth=5;c.beginPath();c.ellipse(x,y,15+e.age*e.radius*130,9+e.age*(e.rows?170:65),0,0,TAU);c.stroke();}
  if(e.type==='gust'){for(let k=0;k<3;k++)line(c,[[x+e.age*110,y-18+k*15],[x+45+e.age*110,y-22+k*15]],'#d4e5e0',3);}
  if(e.type==='lightning'&&e.points){for(let k=1;k<e.points.length;k++){const a=e.points[k-1],b=e.points[k],ax=70+a.x*102,ay=58+(a.row+.5)*92,bx=70+b.x*102,by=58+(b.row+.5)*92;line(c,[[ax,ay],[(ax+bx)/2+7,(ay+by)/2-9],[bx,by]],'#e4d9ef',4);}}
  if(e.type==='thorns')for(let k=0;k<4;k++)line(c,[[x+20,y],[x+30+k*9,y-22+k*13]],'#d4d8b8',3);
  if(e.type==='spit'){const t=Math.min(1,e.age/.25);oval(c,x+(70+e.to*102-x)*t,y-12-Math.sin(t*Math.PI)*22,7,5,'#c2d39c');}
  if(['wash','switch','puppies','burrow','sprint'].includes(e.type)){c.strokeStyle=e.type==='wash'?'#daece3':'#d7c6a9';c.lineWidth=2;c.beginPath();c.ellipse(x,y,12+e.age*38,8+e.age*22,0,0,TAU);c.stroke();}
  if(e.type==='heal'||e.type==='dogHeal')text(c,e.type==='heal'?'+'+Math.round(e.amount):'+',x,y-25-e.age*35,18,e.type==='heal'?'#eaf4d6':'#f1d6c0');
  if(e.type==='upgrade'){c.strokeStyle='#dceff0';c.lineWidth=3;c.beginPath();c.ellipse(x,y,20+e.age*65,15+e.age*40,0,0,TAU);c.stroke();text(c,'VETERAN',x,y-35-e.age*20,11,'#f0f4df');}
  if(e.type==='splash'){c.strokeStyle='#d5e9df';c.lineWidth=7;c.beginPath();c.ellipse(x,y,25+e.age*170,20+e.age*105,0,0,Math.PI*2);c.stroke();if(motion)for(let i=0;i<12;i++)oval(c,x+Math.cos(i/12*TAU)*e.age*190,y+Math.sin(i/12*TAU)*e.age*135,5,7,'#d6e9e2');}
  if(e.type==='patrol')duck(c,'guard',-10+e.age*950,y,1.1,{time});
  if(e.type==='defeat'){for(let k=0;k<(motion?4:0);k++)oval(c,x+(k-1.5)*14,y-e.age*40,4,3,'#d5d6b5');}
  c.restore();
 }
 if(game.phase==='planning'){text(c,'THE POND IS COUNTING ON YOU.',495,24,10,'#e0ede1');}
 c.restore();
}
export function drawPortrait(c,type,kind='duck'){c.clearRect(0,0,120,90);if(kind==='duck')duck(c,type,56,51,1.1);else dog(c,type,58,50,type==='boss'?1.03:1.1);}
