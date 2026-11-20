import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Pond} from '../public/games/ducks-vs-dogs/model.js';
import {packBriefing,launchMessage} from '../public/games/ducks-vs-dogs/briefing.js';
import {SAVE_KEY,freshProfile,encodeProfile,readProfile,recordResult} from '../public/games/ducks-vs-dogs/profile.js';
import {collectSaves,saveGroup,encodeSaveCode,decodeSaveCode,restoreSnapshot} from '../public/save-code.js';
const root=new URL('../',import.meta.url),read=f=>fs.readFileSync(new URL(f,root),'utf8'),json=f=>JSON.parse(read(f));

test('DVD launches publicly with the exact quote, retained release date, Strategy filter and its authoritative source',()=>{
 const main=json('public/games.json'),dvd=main.find(g=>g.id==='ducks-vs-dogs');assert.equal(main.length,8);assert(dvd);assert.equal(dvd.choiceQuote,'A tower defense game where ducks must defend against dogs!');assert.equal(dvd.url,'games/ducks-vs-dogs/');assert.equal(dvd.genre,'Strategy');assert(read('public/index.html').includes('data-filter="Strategy"'));
 assert(Date.parse(dvd.updatedAt)>=Date.parse(dvd.releasedAt));assert.equal([...main].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0].id,dvd.id);assert.match(dvd.buildSha256,/^[a-f0-9]{64}$/);assert(!json('public/junkyard-games.json').some(g=>g.id===dvd.id));assert(!read('public/secret-games.js').includes("id:'ducks-vs-dogs'"));
 const registered=json('game-sources.json').find(g=>g.id===dvd.id);assert.equal(registered.mode,'bundled');assert(registered.source.endsWith('/public/games/ducks-vs-dogs'));assert(fs.existsSync(new URL('public/'+dvd.cover,root)));
});

test('Rhett’s Choice includes DVD once per cycle and changes exactly on quarter-hour boundaries',()=>{
 const games=json('public/games.json'),source=read('public/app.js'),nodes=new Map(),node=k=>{if(!nodes.has(k))nodes.set(k,{style:{setProperty(){}},classList:{toggle(){}},replaceChildren(){},setAttribute(){},removeAttribute(){}});return nodes.get(k);};
 const context={games,FEATURE_INTERVAL:900000,arcadeTints:{},$:node,document:{createTextNode:s=>s},element:()=>({}),save(){},Date};vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function renderFeatured('),source.indexOf('function syncFeatured(')),context);
 let appearances=0;for(let i=0;i<games.length*2;i++){vm.runInContext('renderFeatured('+i+'*FEATURE_INTERVAL)',context);const href=node('.feature-actions .primary').href;assert.equal(href,'?play='+games[i%games.length].id);if(href==='?play=ducks-vs-dogs'){appearances++;assert.equal(node('.choice-quote').textContent,'“A tower defense game where ducks must defend against dogs!”');}vm.runInContext('renderFeatured('+i+'*FEATURE_INTERVAL+899999)',context);assert.equal(node('.feature-actions .primary').href,href);}assert.equal(appearances,2);
});

test('pack scouting counts active and arriving dogs without modifying the schedule, RNG or save',()=>{
 const g=new Pond(0,123,{mode:'endless'}),before=g.serialize(),plan=packBriefing(g);assert.equal(plan.wave,1);assert.equal(plan.groups.reduce((n,d)=>n+d.arriving,0),g.schedule.length);assert.equal(g.serialize(),before);
 g.startWave();for(let i=0;i<80;i++)g.step(.025);const current=g.serialize(),report=packBriefing(g);assert.equal(report.groups.reduce((n,d)=>n+d.onField,0),g.dogs.length);assert.equal(report.groups.reduce((n,d)=>n+d.arriving,0),g.schedule.length-g.spawnIndex);assert.equal(g.serialize(),current);
 g.schedule=[];g.spawnIndex=0;g.dogs=[];g.step(.025);assert.equal(g.phase,'intermission');assert.equal(packBriefing(g).wave,2);assert.match(launchMessage(g),/Wave 2 is next/);g.startWave();assert.match(launchMessage(g),/Wave 2 is in progress/);g.finish(false);assert.deepEqual(packBriefing(g).groups,[]);
});

test('password snapshots retain pre-release DVD progress, all three runs and mute without unrelated browser data',async()=>{
 const profile=freshProfile();recordResult(profile,{mode:'campaign',level:0,won:true,kills:20,medal:'GOLD'});profile.bestEndless=8;const runs={campaign:new Pond(0,18,{mode:'campaign',level:1}),endless:new Pond(0,123,{mode:'endless'}),legacy:new Pond(0,541)};runs.endless.startWave();runs.endless.step(1);
 const encoded=encodeProfile(profile,null,runs),values=new Map([[SAVE_KEY,encoded],['ducks-vs-dogs-muted','true'],['unrelated-private','keep'],['ducks-vs-dogs-save-v1-backup','private backup']]),storage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(saveGroup(SAVE_KEY).id,'ducks-vs-dogs');assert.equal(saveGroup('ducks-vs-dogs-muted').id,'ducks-vs-dogs');const decoded=await decodeSaveCode(await encodeSaveCode(collectSaves(storage)));assert.equal(decoded.entries.length,2);values.set(SAVE_KEY,encodeProfile(freshProfile()));let backup;await restoreSnapshot(storage,decoded.entries,async b=>backup=b);assert(backup);assert.equal(values.get(SAVE_KEY),encoded);const loaded=readProfile(values.get(SAVE_KEY));assert(!loaded.invalid);assert.equal(loaded.profile.campaignMedals.shooter,'GOLD');assert.equal(loaded.profile.bestEndless,8);for(const mode of Object.keys(runs))assert.equal(loaded.runs[mode].serialize(),runs[mode].serialize());assert.equal(values.get('ducks-vs-dogs-muted'),'true');assert.equal(values.get('unrelated-private'),'keep');
 const controller=read('public/games/ducks-vs-dogs/game.js');assert(controller.includes("['beforeunload','pagehide']"));assert(controller.includes("$('#scout-dialog').open"));assert.match(launchMessage(new Pond(0,1,{mode:'endless'})),/All 30 ducks unlocked/);
});
