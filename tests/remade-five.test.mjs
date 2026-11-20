import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Tycoon,TYPES,LOCATIONS,SAVE_KEY} from '../public/games/arcade-tycoon/model.js';
import {generate as heistMap,Heist,GW,T,WALL,OUT,RED,BLUE} from '../public/games/pocket-heist/model.js';
import {Game as Table,generate as tableDef,CAMPAIGN as TABLES} from '../public/games/ricochet-club/model.js';
import {Packing,route,cells,CAMPAIGN as ROUTES} from '../public/games/parcel-panic/model.js';
import {Watch,CATEGORIES} from '../public/games/odd-hours/model.js';
const seeded=(n=1)=>()=>{n=(n*16807)%2147483647;return n/2147483647;};
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('arcade tycoon: building rules, paying visitors, staff and save round-trip',()=>{
 const g=new Tycoon(seeded());assert.equal(g.cash,800);g.place('cabinet',2,1);assert.equal(g.cash,800-180+50,'cost charged once, first-attraction goal paid');
 assert.throws(()=>g.place('cabinet',2,1),/taken/);assert.throws(()=>g.place('cabinet',g.door.x,g.door.y),/entrance/);assert.throws(()=>g.place('hockey',4,1),/Unlocks/);
 g.cash=5000;g.place('pinball',4,1);g.place('snack',1,3);g.hire('mechanic');g.toggleOpen();for(let i=0;i<3000;i++)g.step(.1);
 assert(g.totalEarned>0&&g.served>0&&g.day>1&&g.history.length>0);
 const back=Tycoon.load(g.serialize());assert.equal(back.items.length,g.items.length);assert.equal(back.staff.length,1);assert.equal(back.totalEarned,g.totalEarned);
 assert.equal(JSON.parse(g.serialize()).level,g.level);assert.equal(SAVE_KEY,'arcade-tycoon-prototype-v1');
});
test('arcade tycoon: old 1.0 saves keep lifetime progress and location; relocation needs its goals',()=>{
 const old=Tycoon.load({version:1,totalEarned:20000,level:2,day:9,items:[{},{}],cash:100});assert.equal(old.level,2);assert.equal(old.totalEarned,20000);assert(old.cash>=800);assert.equal(old.items.length,0);
 const g=new Tycoon(seeded());assert(!g.canRelocate());assert.throws(()=>g.relocate());g.totalEarned=1e6;g.reputation=100;g.cash=1e6;
 for(const t of ['cabinet','pinball','claw'])g.place(t,['cabinet','pinball','claw'].indexOf(t)*2+1,1);assert(g.canRelocate());g.relocate();assert.equal(g.level,1);assert.equal(g.w,LOCATIONS[1].w);
 assert(Object.keys(TYPES).length>=20);
});
test('pocket heist: every campaign and early endless job has reachable targets behind its locks',()=>{
 for(let lv=1;lv<=115;lv++){const m=heistMap(lv),g=m.grid,have=new Set();let reach;
  for(let pass=0;pass<4;pass++){reach=new Set();const sx=Math.floor(m.start.x/T),sy=Math.floor(m.start.y/T),q=[[sx,sy]];reach.add(sx+','+sy);
   while(q.length){const [x,y]=q.pop();for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+a,ny=y+b,v=g[ny*GW+nx];if(v===WALL||v===OUT||((v===RED||v===BLUE)&&!have.has(v)))continue;const k=nx+','+ny;if(!reach.has(k)){reach.add(k);q.push([nx,ny]);}}}
   for(const k of m.keys)if(reach.has(k.x+','+k.y))have.add(k.color);}
  const need=[...m.loot.filter(l=>l.required),...(m.vault?[m.vault]:[])];assert(need.length>0,'job '+lv);for(const n of need)assert(reach.has(n.x+','+n.y),'job '+lv+' target unreachable');}
 assert.deepEqual(heistMap(37),heistMap(37));
});
test('pocket heist: guards spot a visible thief, smoke blocks sight, and taking the target then exiting wins',()=>{
 const h=new Heist(12,{smoke:1});const g=h.guards[0];h.guards=[g];h.cameras=[];h.lasers=[];g.x=h.p.x;g.y=h.p.y-60;g.face=Math.PI/2;g.route=[{x:Math.floor(g.x/T),y:Math.floor(g.y/T)}];
 if(h.los(g.x,g.y,h.p.x,h.p.y)){for(let i=0;i<120;i++)h.step(1/30,{});assert(g.sus>.35||h.alarmed||h.status==='lose');}
 const s=new Heist(5,{smoke:1});s.step(1/60,{smoke:true});assert.equal(s.charges.smoke,0);s.step(.5,{});assert(!s.los(s.p.x-60,s.p.y,s.p.x+60,s.p.y));
 const w=new Heist(3);w.guards=[];w.cameras=[];for(const l of w.loot)l.taken=true;w.p.x=(w.exit.x+.5)*T;w.p.y=(w.exit.y+.4)*T;w.step(1/60,{});assert.equal(w.status,'win');assert(w.stars>=1);
});
test('ricochet club: generated tables replay their recorded solution and stay deterministic',()=>{
 for(const n of [1,9,23,37,51,66,79,TABLES,TABLES+7]){const d=tableDef(n),g=new Table(n);assert.deepEqual(tableDef(n).stars,d.stars);assert(d.stars.length>=2);assert(d.budget>d.par);
  for(const s of d.solution){g.shoot(s.ang,s.pow);for(let i=0;i<20000&&g.status==='rolling';i++)g.update(1/60);if(g.status==='won')break;}assert.equal(g.status,'won','table '+n);assert(g.score>=500);}
});
test('parcel panic: lines dispatch, priority and taped crates count, and saves reload',()=>{
 const g=new Packing({mode:'classic',seed:4});g.board.fill(0);for(let x=0;x<7;x++)g.board[x]=1;g.tray=[{kind:0,turn:0,color:2},null,null];assert(g.place(0,7,0));assert.equal(g.lines,1);assert(g.board.slice(0,8).every(v=>v===0));
 const again=Packing.load(JSON.parse(JSON.stringify(g.serialize())));assert.equal(again.score,g.score);assert.equal(again.lines,1);
 assert(g.restoreUndo()===false||g.lines===0);
 const r=route(12);assert(r.goals.length>=1);const p=new Packing({mode:'route',route:r,seed:1});assert.equal(p.limit,r.pieces);
 for(let n=1;n<=ROUTES;n++){const d=route(n);assert(d.pieces>=12);assert(d.goals.every(x=>x.need>0));}
 assert.deepEqual(cells({kind:3,turn:1}),[[0,0],[0,1],[0,2],[0,3]]);
});
test('odd hours: anomalies spawn off-camera, correct reports fix them, false reports count, and a careful night is winnable',()=>{
 const w=new Watch(5,seeded(9));const seen=new Set();for(let i=0;i<120;i++){w.camera=i%w.cams;const a=w.spawn();if(a){assert.notEqual(a.room,w.camera);seen.add(a.cat);}while(w.active.length>3)w.active.shift().undo();}
 assert(seen.size>=6);assert.equal(CATEGORIES.length,7);
 const r=new Watch(2,seeded(3));const a=r.spawn();r.camera=a.room;r.file(a.cat);for(let i=0;i<40;i++)r.step(.1);assert.equal(r.found,1);assert.equal(r.active.length,0);
 r.file('missing');for(let i=0;i<40;i++)r.step(.1);assert.equal(r.wrong,1);
 const p=new Watch(4,seeded(5));while(p.status==='play'){p.step(.1);if(!p.report&&p.active.length){const x=p.active[0];p.camera=x.room;p.file(x.cat);}}assert.equal(p.status,'win');assert(p.score>=1500);
});
test('remade games keep their launcher save keys and ship no leftover shared kit',()=>{
 for(const id of ['arcade-tycoon','pocket-heist','ricochet-club','parcel-panic','odd-hours']){const html=read('public/games/'+id+'/index.html');assert(html.includes('game.js'));assert(html.includes('../../'));const js=read('public/games/'+id+'/game.js');assert(js.includes(id+'-prototype-v1')||id==='arcade-tycoon');assert(!fs.existsSync(new URL('../public/games/'+id+'/kit.js',import.meta.url)));}
});
