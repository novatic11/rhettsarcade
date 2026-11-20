import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {BOARDS,STATIONS,Switchyard,pointOn,nextEdge,crossingWarnings} from '../public/games/switchyard/model.js';
import {Lesson} from '../public/games/switchyard/tutorial.js';
import {readStats,bestFor,recordRun,recordScore} from '../public/games/switchyard/stats.js';
import {collectSaves,saveGroup,encodeSaveCode,decodeSaveCode,restoreSnapshot} from '../public/save-code.js';
const root=new URL('../',import.meta.url),json=f=>JSON.parse(fs.readFileSync(new URL(f,root),'utf8'));
test('Archives contains the five requested games and never enters the main collection or featured rotation',()=>{
 const main=json('public/games.json'),junk=json('public/junkyard-games.json'),sources=json('game-sources.json');
 assert.equal(main.length,8);assert.deepEqual(junk.map(g=>g.id),['the-rooms-between','switchyard','stardust-foundry','frontier','squircle-siege']);assert(junk.every(g=>!main.some(m=>m.id===g.id)));
 assert.equal(junk.find(g=>g.id==='switchyard').choiceQuote,'A quick, fun arcade game about bringing trains to stations.');
 for(const game of junk){assert(fs.existsSync(new URL('public/'+game.url+'index.html',root)));assert(sources.some(s=>s.id===game.id&&s.collection==='junkyard'));}
 const source=fs.readFileSync(new URL('public/app.js',root),'utf8'),nodes=new Map(),node=k=>{if(!nodes.has(k))nodes.set(k,{style:{setProperty(){}},classList:{toggle(){}},replaceChildren(){},setAttribute(){},removeAttribute(){}});return nodes.get(k);};
 const context={games:main,junkyardGames:junk,FEATURE_INTERVAL:900000,arcadeTints:{},$:node,document:{createTextNode:s=>s},element:()=>({}),save(){},Date};vm.createContext(context);const a=source.indexOf('function renderFeatured('),b=source.indexOf('function syncFeatured(',a);vm.runInContext(source.slice(a,b),context);
 for(let i=0;i<32;i++){vm.runInContext('renderFeatured('+i+'*FEATURE_INTERVAL)',context);assert.equal(node('.feature-actions .primary').href,'?play='+main[i%main.length].id);}
 const html=fs.readFileSync(new URL('public/index.html',root),'utf8');assert(html.indexOf('id="junkyard-nav"')<html.indexOf('class="sidebar-bottom"'));assert(!fs.readFileSync(new URL('public/secret-games.js',root),'utf8').split('window.arcadeSecretGames')[0].includes("id:'switchyard'"));
});
test('all four boards have distinct continuous routes and the advertised number of real crossings',()=>{
 assert.deepEqual(Object.values(BOARDS).map(b=>b.crossings.length),[2,0,1,2]);assert.equal(new Set(Object.values(BOARDS).map(b=>JSON.stringify(b.edges))).size,4);
 for(const board of Object.values(BOARDS)){
  for(const edge of Object.values(board.edges)){assert(edge.length>0);for(let d=0;d<edge.length;d+=10){const p=pointOn(edge.id,d,board);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));}if(edge.station!==null)assert.deepEqual(edge.path.at(-1),[STATIONS[edge.station].x,STATIONS[edge.station].y]);}
  for(let id=0;id<3;id++)for(let choice=0;choice<2;choice++)assert.deepEqual(board.edges[nextEdge(id,choice)].path[0],[board.junctions[id].x,board.junctions[id].y]);
  for(const cross of board.crossings){const a=pointOn(cross.pair[0],cross.at[cross.pair[0]],board),b=pointOn(cross.pair[1],cross.at[cross.pair[1]],board);assert(Math.hypot(a.x-b.x,a.y-b.y)<.01);}
 }
});
test('crossing alerts give advance notice, react to holds and routes, and ignore clear crossings',()=>{
 const g=new Switchyard(()=>.4);g.spawnIn=1e9;const cross=g.board.crossings[0],a=g.spawn(),b=g.spawn();Object.assign(a,{edge:'A',target:0,distance:cross.at.A-150,speed:80});Object.assign(b,{edge:'B',target:1,distance:cross.at.B-145,speed:80});
 let warnings=crossingWarnings(g);assert.equal(warnings.length,1);assert.deepEqual(warnings[0].ids,[a.id,b.id]);assert(warnings[0].canHold);
 g.hold(warnings[0].holdId);assert.equal(crossingWarnings(g).length,0);
 a.distance=cross.at.A+100;b.distance=cross.at.B+100;assert.equal(crossingWarnings(g).length,0);
 const harbor=new Switchyard(()=>.4,'local','harbor');harbor.spawn();harbor.spawn();assert.equal(crossingWarnings(harbor).length,0);
});
test('the real tutorial sequence can be completed and ignores unrelated controls',()=>{
 const flow=new Lesson(),g=new Switchyard(()=>.5,'practice');g.spawnIn=1e9;const t=g.spawn();Object.assign(t,{target:3,distance:g.board.edges.entry.length-120,speed:180});
 assert(!flow.input('delivery'));assert(!flow.allows('flip',2));g.flip(0);assert(flow.input('flip',0));g.flip(2);assert(flow.input('flip',2));assert(g.hold(t.id));assert(flow.input('hold'));assert(g.slowTime());assert(flow.input('slow'));
 for(let i=0;i<1200&&!g.delivered;i++)g.step(.025);assert.equal(g.delivered,1);assert.equal(g.errors,0);assert(flow.input('delivery'));assert(flow.done);assert(!flow.input('delivery'));
});
test('medals, board records, and all four paint achievements survive reload without mixing Practice scores',()=>{
 let stats=readStats({best:4100,rushBest:5000});assert.equal(bestFor(stats,'local'),4100);assert.equal(bestFor(stats,'rush'),5000);
 for(const board of Object.keys(BOARDS)){recordRun(stats,{board,shift:'local',score:4500,medal:'GOLD',reason:'complete',delivered:22,streak:22,errors:0});stats=readStats(JSON.parse(JSON.stringify(stats)));assert.equal(stats.records[board+':local'].medal,'GOLD');}
 assert.deepEqual(stats.unlocked,['classic','copper','midnight','gold','glacier']);const before=JSON.stringify(stats.records);recordRun(stats,{board:'harbor',shift:'practice',score:99000,delivered:12,streak:12,errors:0,reason:'complete'});assert.equal(JSON.stringify(stats.records),before);
 recordScore(stats,'rush',6000,'timber');assert.equal(bestFor(stats,'rush','timber'),6000);assert.equal(bestFor(stats,'rush','meadow'),5000);stats.paint='glacier';assert.equal(readStats(stats).paint,'glacier');assert.equal(readStats({paint:'glacier'}).paint,'classic');
});
test('password snapshots carry Switchyard tutorial, board medals, paint, mute, and archived saves without private storage',async()=>{
 const stats=readStats(null);stats.tutorial='done';stats.records['quarry:local']={best:4300,medal:'GOLD',completed:true};stats.unlocked.push('gold');stats.paint='gold';
 const map=new Map([['switchyard-stats-v1',JSON.stringify(stats)],['switchyard-muted','true'],['stardust-foundry-v1','{"dust":10}'],['squircle-siege-v1','{"version":1}'],['private-test','keep']]);const storage={get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 assert.equal(saveGroup('switchyard-stats-v1').id,'switchyard');const decoded=await decodeSaveCode(await encodeSaveCode(collectSaves(storage)));assert(!decoded.entries.some(([k])=>k==='private-test'));map.set('switchyard-stats-v1','{}');await restoreSnapshot(storage,decoded.entries,async()=>{});const restored=readStats(JSON.parse(map.get('switchyard-stats-v1')));assert.equal(restored.tutorial,'done');assert.equal(restored.paint,'gold');assert.equal(restored.records['quarry:local'].medal,'GOLD');assert.equal(map.get('switchyard-muted'),'true');assert.equal(map.get('private-test'),'keep');
});
test('all boards and shifts finish across varied traffic without invalid positions or stranded trains',()=>{
 let rounds=0;
 for(const board of Object.values(BOARDS))for(const shift of ['local','rush','practice'])for(const seed of [18,123,541,918]){
  let state=seed;const g=new Switchyard(()=>((state=(state*1664525+1013904223)>>>0)/4294967296),shift,board.id);
  for(let tick=0;tick<6500&&!g.result;tick++){
   for(const t of g.trains){const e=board.edges[t.edge];if(e.junction!==null&&e.length-t.distance<35)g.switches[e.junction]=e.junction===0?Number(t.target>=2):t.target%2;}
   for(const cross of board.crossings)for(let i=0;i<g.trains.length;i++)for(let j=i+1;j<g.trains.length;j++){const a=g.trains[i],b=g.trains[j];if([a.edge,b.edge].sort().join('')!==cross.pair)continue;const eta=t=>(cross.at[t.edge]-t.distance)/t.speed+t.hold,ea=eta(a),eb=eta(b);if(ea>0&&eb>0&&Math.abs(ea-eb)<.65){const selected=ea>=eb?a:b;if(!selected.holdUsed)g.hold(selected.id);}}
   g.step(.025);assert(g.trains.every(t=>Number.isFinite(t.distance)));
  }
  assert.equal(g.result?.reason,'complete',board.id+'/'+shift+'/'+seed);assert.equal(g.trains.length,0);assert(g.delivered>=10);assert(g.errors<3);rounds++;
 }
 console.log('Completed '+rounds+' Switchyard board/shift playthroughs.');
});
