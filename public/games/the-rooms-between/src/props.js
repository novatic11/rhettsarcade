import * as THREE from 'three';
import {rng,hashText} from './world.js';

// Shared models and texture atlases survive chunk streaming. Nothing here changes
// generation or collision, so existing journeys retain their exact architecture.
export class PropAssets {
 constructor(quality='medium'){
  this.size=quality==='high'?512:quality==='low'?128:256;this.textures=[];this.materials=[];this.templates=new Map();this.geometries=[];
  this.box=this.geometry(new THREE.BoxGeometry(1,1,1));this.cylinder=this.geometry(new THREE.CylinderGeometry(1,1,1,20));this.sleeve=this.geometry(new THREE.CylinderGeometry(1,1,1,24,1,true));this.plane=this.geometry(new THREE.PlaneGeometry(1,1));this.ring=this.geometry(new THREE.TorusGeometry(1,.09,6,24));
  this.cardboard=Array.from({length:3},(_,i)=>this.surface('cardboard',i));this.tape=this.surface('tape');this.steel=this.surface('steel');this.beam=this.surface('paint');this.fabric=this.surface('fabric');this.crate=this.surface('case');this.seam=this.material('#4a3d29',{roughness:1});this.trim=this.material('#313e38',{metalness:.7,roughness:.42});this.silver=this.material('#aab0a7',{metalness:.8,roughness:.32});
  this.shipping=Array.from({length:3},(_,i)=>this.print('shipping',i));this.waterLabel=this.print('water');this.foodLabel=this.print('food');this.batteryLabel=this.print('battery');this.noteLabel=this.print('note');this.medicalLabel=this.print('medical');this.chalkLabel=this.print('chalk');
 }
 geometry(g){this.geometries.push(g);return g;}
 material(color,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness:.8,...extra});this.materials.push(m);return m;}
 canvas(draw,w=this.size,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;this.textures.push(t);return t;}
 surface(kind,variant=0){const random=rng(hashText(`${kind}:${variant}`));const map=this.canvas((ctx,w)=>{
   ctx.fillStyle={cardboard:['#a88b63','#bc9f73','#8e7958'][variant],tape:'#b5a17a',steel:'#6d7b75',paint:'#a06c38',fabric:'#637055',case:'#66735c'}[kind];ctx.fillRect(0,0,w,w);
   for(let i=0;i<w*w*.12;i++){const v=random();ctx.fillStyle=`rgba(${v>.5?'247,239,206':'32,27,17'},${random()*(kind==='cardboard'?.2:.12)})`;ctx.fillRect(random()*w,random()*w,kind==='fabric'?2:1,1+random()*3);}
   if(kind==='fabric'){for(let j=0;j<w;j+=4){ctx.fillStyle='rgba(20,31,16,.14)';ctx.fillRect(j,0,1,w);ctx.fillRect(0,j,w,1);}}
   if(kind==='cardboard'){ctx.lineWidth=1;for(let i=0;i<20;i++){ctx.strokeStyle='rgba(65,49,25,.13)';const y=random()*w;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+random()*6-3);ctx.stroke();}for(let i=0;i<5;i++){const x=random()*w,y=random()*w;ctx.strokeStyle='rgba(61,46,24,.22)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.07,y+w*.14);ctx.lineTo(x+w*.1,y+w*.18);ctx.stroke();}}
   if(['steel','paint','case'].includes(kind)){for(let i=0;i<35;i++){const x=random()*w,y=random()*w;ctx.fillStyle=kind==='steel'?'rgba(87,51,28,.22)':'rgba(199,205,183,.22)';ctx.fillRect(x,y,random()*w*.13+1,1+random()*2);}}
   if(kind==='tape'){ctx.fillStyle='rgba(242,232,192,.13)';for(let j=0;j<w;j+=5)ctx.fillRect(0,j,w,1);}
  });
  const bump=this.canvas((ctx,w)=>{ctx.fillStyle='#888';ctx.fillRect(0,0,w,w);const r=rng(hashText(`bump:${kind}`));for(let i=0;i<w*w*.25;i++){const v=Math.floor(100+r()*65);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(r()*w,r()*w,1,kind==='cardboard'?3:1);}if(kind==='fabric')for(let x=0;x<w;x+=4){ctx.fillStyle='#a0a0a0';ctx.fillRect(x,0,1,w);ctx.fillRect(0,x,w,1);}});bump.colorSpace=THREE.NoColorSpace;
  return this.material('#ffffff',{map,bumpMap:bump,bumpScale:kind==='fabric'?.012:.006,roughness:kind==='tape'?.47:kind==='steel'?.5:.88,metalness:kind==='steel'?.65:kind==='paint'?.35:0});
 }
 print(kind,variant=0){const map=this.canvas((ctx,w,h)=>{
  ctx.fillStyle={water:'#e5dfc1',food:'#925d37',battery:'#3f5348',note:'#d8ceab',medical:'#bbc6ad',chalk:'#d9d4b4',shipping:'#d5c9a5'}[kind];ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(54,45,22,.035)';const r=rng(hashText(`${kind}:${variant}:label`));for(let i=0;i<1500;i++)ctx.fillRect(r()*w,r()*h,1,1);
  const text=(s,x,y,size,color='#293c2e',align='center',font='monospace')=>{ctx.font=`bold ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y);};
  const barcode=(x,y,bw,bh)=>{ctx.fillStyle='#28352b';for(let i=0;i<45;i++)if(r()>.25)ctx.fillRect(x+i*bw/45,y,(r()>.6?2:1)*bw/45,bh);};
  if(kind==='water'){ctx.fillStyle='#38563f';ctx.fillRect(w*.28,h*.08,w*.44,h*.08);text('ALMOND',w*.5,h*.34,h*.23);text('WATER',w*.5,h*.59,h*.19);text('SEALED  /  500 mL',w*.5,h*.83,h*.07);text('FIELD PROVISIONS',w*.5,h*.12,h*.045,'#e8dec0');barcode(w*.06,h*.33,w*.15,h*.34);text('LOT 0481',w*.13,h*.77,h*.04);text('KEEP COOL',w*.86,h*.4,h*.05);text('DO NOT REFILL',w*.86,h*.55,h*.04);ctx.strokeStyle='#486148';ctx.lineWidth=2;ctx.strokeRect(w*.29,h*.23,w*.42,h*.47);}
  else if(kind==='food'){ctx.fillStyle='#ccbd8b';ctx.fillRect(w*.08,h*.13,w*.84,h*.74);text('FIELD RATION',w*.5,h*.37,h*.19);text('OAT & HONEY',w*.5,h*.59,h*.1);text('60 g  •  KEEP DRY',w*.5,h*.77,h*.07);barcode(w*.75,h*.22,w*.13,h*.16);}
  else if(kind==='battery'){text('SERVICE CELL',w*.5,h*.33,h*.15,'#e0d8ae');text('1.5 V  /  LR6',w*.5,h*.61,h*.1,'#bfc8b1');ctx.fillStyle='#b4a268';ctx.fillRect(w*.05,h*.1,w*.05,h*.8);}
  else if(kind==='note'){text('FIELD RECORD / 014',w*.13,h*.13,h*.08,'#526047','left');ctx.fillStyle='#768061';for(let i=0;i<8;i++)ctx.fillRect(w*.13,h*(.27+i*.075),w*(.4+r()*.35),h*.007);text('Keep moving. Leave a trace.',w*.13,h*.88,h*.06,'#526047','left','Georgia');}
  else if(kind==='medical'){text('FIELD DRESSING',w*.5,h*.35,h*.18);text('STERILE  /  SEALED',w*.5,h*.65,h*.1);}
  else if(kind==='chalk'){text('WAYFINDER',w*.5,h*.32,h*.18);text('CHALK / 03',w*.5,h*.68,h*.14);}
  else{ctx.strokeStyle='#706549';ctx.lineWidth=2;ctx.strokeRect(w*.06,h*.08,w*.88,h*.84);text(['FIELD STORES','DRY GOODS','SERVICE PARTS'][variant],w*.1,h*.25,h*.13,'#3d4430','left');text(`LOT 04${81+variant} / ${[12,8,24][variant]} PCS`,w*.1,h*.46,h*.09,'#3d4430','left');barcode(w*.1,h*.59,w*.48,h*.23);text('↑  KEEP DRY',w*.82,h*.72,h*.07);}
 },Math.max(512,this.size*2),256);
  return this.material('#ffffff',{map,roughness:kind==='food'?.38:.8,metalness:kind==='food'?.15:0});
 }
 carton(add,x,y,z,w,h,d,variant=0){const v=variant%3;add(this.cardboard[v],x,y,z,w,h,d);add(this.tape,x,y+h/2+.005,z,w*.16,.012,d+.008);add(this.tape,x,y,z+d/2+.006,w*.16,h,.012);add(this.seam,x,y+h/2+.009,z,w*.008,.008,d);add(this.shipping[v],x-w*.21,y+h*.03,z+d/2+.015,w*.34,h*.46,.012);add(this.seam,x-w*.5+.01,y,z+d/2+.006,.009,h,.008);}
 shelf(add,p,x,z){const r=rng(hashText(`${p.x}:${p.z}:rack`));
  for(let k=0;k<5;k++){const y=.24+k*.76;add(this.steel,x,y,z,p.w,.055,p.d);for(const side of [-1,1])add(this.beam,x+side*(p.w/2-.025),y-.025,z,.065,.12,p.d+.07);if(k<4)for(let n=0;n<4;n++){const height=.38+r()*.23,width=.63+r()*.3,depth=.64+r()*.32;this.carton(add,x+(r()-.5)*.08,y+.03+height/2,z-p.d*.35+n*p.d*.23,width,height,depth,(k+n)%3);}}
  for(const sx of [-1,1])for(const sz of [-1,1]){const px=x+sx*p.w/2,pz=z+sz*p.d/2;add(this.steel,px,p.h/2,pz,.075,p.h,.075);add(this.trim,px,.035,pz,.22,.07,.22);for(let k=0;k<5;k++)add(this.trim,px,.24+k*.76,pz,.096,.035,.096);}
  add(this.shipping[2],x+p.w/2+.007,1.16,z+p.d/2-.22,.015,.13,.32);
 }
 supplyCase(add,p,x,z){add(this.crate,x,p.h/2,z,p.w,p.h,p.d);add(this.trim,x,p.h-.1,z,p.w+.02,.06,p.d+.02);add(this.crate,x,p.h-.045,z,p.w+.025,.085,p.d+.025);for(const side of [-1,1]){add(this.trim,x+side*p.w*.32,p.h/2,z,.045,p.h+.018,p.d+.04);add(this.silver,x+side*p.w*.32,p.h-.15,z+p.d/2+.025,.075,.095,.025);}add(this.trim,x,p.h*.48,z+p.d/2+.045,.3,.045,.04);add(this.shipping[0],x,p.h*.25,z+p.d/2+.03,.25,.12,.012);}
 locker(p){const group=new THREE.Group(),door=new THREE.Group(),w=p.w,h=p.h,d=p.d;
  const body=(m,x,y,z,sx,sy,sz)=>this.mesh(group,this.box,m,x,y,z,sx,sy,sz);
  for(const side of [-1,1])body(this.steel,side*(w/2-.025),h/2,0,.05,h,d);
  body(this.steel,0,h/2,-d/2+.025,w,h,.05);body(this.steel,0,h-.025,0,w,.05,d);body(this.trim,0,.025,0,w,.05,d);body(this.trim,0,2.08,-.1,w-.1,.035,d-.12);
  for(const side of [-1,1])body(this.trim,side*(w/2-.065),.018,0,.08,.036,d-.1);
  door.position.set(-w/2+.035,0,d/2+.013);group.add(door);const dw=w-.07;
  const panel=(m,x,y,z,sx,sy,sz)=>this.mesh(door,this.box,m,x,y,z,sx,sy,sz);
  panel(this.crate,dw/2,.795,0,dw,1.43,.045);panel(this.crate,dw/2,2.03,0,dw,.4,.045);
  for(const side of [-1,1])panel(this.crate,dw/2+side*(dw/2-.065),1.67,0,.13,.32,.045);
  // Five real openings, with metal between them. The camera looks through the
  // central opening at eye height; no screen mask or fake painted black vents.
  const ventWidth=dw-.26;for(let k=0;k<6;k++)panel(this.crate,dw/2,1.511+k*.065,0,ventWidth,.033,.045);
  panel(this.trim,dw-.08,1.16,.035,.045,.22,.045);panel(this.silver,dw-.08,1.17,.063,.045,.11,.022);
  for(const y of [.4,1.15,1.95]){panel(this.silver,.008,y,0,.035,.075,.055);panel(this.trim,dw-.095,y,-.005,.025,.025,.055);}
  panel(this.shipping[2],dw/2,.37,.026,dw*.7,.15,.008);
  group.userData.lockerId=p.id;door.userData.ventHeights=[1.543,1.608,1.673,1.738,1.803];return {group,door,data:p};
 }
 mesh(group,g,m,x,y,z,w,h,d,rx=0,ry=0,rz=0){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.set(rx,ry,rz);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
 item(type){if(!this.templates.has(type))this.templates.set(type,this.buildItem(type));return this.templates.get(type).clone(true);}
 buildItem(type){const g=new THREE.Group();g.userData.itemType=type;const part=(geo,mat,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>this.mesh(g,geo,mat,x,y,z,w,h,d,rx,ry,rz);
  if(type==='water'){
   const profile=[[.065,0],[.088,.015],[.102,.04],[.102,.29],[.096,.33],[.062,.38],[.054,.395],[.054,.425]].map(([x,y])=>new THREE.Vector2(x,y));const body=this.geometry(new THREE.LatheGeometry(profile,24));part(body,this.material('#bcb58a',{roughness:.23,metalness:.08,transparent:true,opacity:.92}),0,0,0,1,1,1);part(this.cylinder,this.material('#bfc49f',{roughness:.2}),0,.035,0,.083,.012,.083);part(this.sleeve,this.waterLabel,0,.195,0,.103,.18,.103,0,Math.PI);const cap=this.material('#38543f',{roughness:.44});part(this.cylinder,cap,0,.433,0,.061,.052,.061);for(let k=0;k<3;k++)part(this.ring,cap,0,.416+k*.014,0,.058,.058,.031,Math.PI/2);part(this.ring,cap,0,.402,0,.056,.056,.024,Math.PI/2);
  }else if(type==='food'){part(this.box,this.foodLabel,0,.055,0,.24,.09,.12);for(const side of [-1,1]){part(this.box,this.material('#846646',{metalness:.4,roughness:.4}),side*.132,.054,0,.025,.07,.115);for(let k=0;k<4;k++)part(this.box,this.seam,side*.132,.092,-.044+k*.027,.025,.003,.003);}}
  else if(type==='battery'){part(this.box,this.trim,0,.012,0,.17,.024,.24);for(const side of [-1,1]){part(this.cylinder,this.batteryLabel,side*.041,.053,0,.033,.185,.033,Math.PI/2);part(this.cylinder,this.silver,side*.041,.053,-.097,.031,.013,.031,Math.PI/2);part(this.cylinder,this.silver,side*.041,.053,.097,.011,.012,.011,Math.PI/2);}}
  else if(type==='medkit'){part(this.box,this.fabric,0,.047,0,.22,.094,.17);part(this.box,this.medicalLabel,0,.098,.03,.2,.004,.1);const red=this.material('#8f4636');part(this.box,red,0,.102,-.03,.1,.006,.025);part(this.box,red,0,.103,-.03,.025,.006,.075);for(const side of [-1,1])part(this.box,this.trim,side*.112,.045,0,.006,.06,.14);}
  else if(type==='chalk'){for(let k=0;k<3;k++)part(this.cylinder,this.material('#dedcc1'),-.035+k*.035,.026,0,.015,.17,.015,Math.PI/2);part(this.box,this.chalkLabel,0,.032,0,.11,.033,.065);}
  else if(type==='tool'){part(this.ring,this.silver,0,.014,.055,.04,.04,.022,Math.PI/2);part(this.box,this.silver,0,.014,-.03,.024,.018,.14);for(let k=0;k<3;k++)part(this.box,this.silver,.018,.014,-.07+k*.027,.033,.018,.018);part(this.box,this.beam,0,.014,.02,.047,.028,.04);}
  else if(type==='glow'){const green=this.material('#80bd8d',{emissive:'#88df9b',emissiveIntensity:1.25,roughness:.25});part(this.cylinder,green,0,.024,0,.018,.26,.018,Math.PI/2);for(const side of [-1,1])part(this.cylinder,this.crate,0,.024,side*.137,.025,.022,.025,Math.PI/2);part(this.ring,this.crate,0,.024,.16,.015,.015,.015);}
  else{part(this.box,this.noteLabel,0,.008,0,.31,.012,.24);part(this.box,this.seam,-.147,.01,0,.008,.003,.21);}
  return g;
 }
 dispose(){for(const t of this.textures)t.dispose();for(const m of this.materials)m.dispose();for(const g of this.geometries)g.dispose();this.templates.clear();}
}
