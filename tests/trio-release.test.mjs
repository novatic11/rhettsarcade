import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {gameBuildFingerprint} from '../scripts/sync-games.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),json=p=>JSON.parse(read(p));
const ids=['ricochet-club','parcel-panic','odd-hours'];
const quotes={
 'ricochet-club':'A puzzle game about hitting a few stars with a bouncing ball. Fun for a quick little arcade game.',
 'parcel-panic':'A puzzle game much like Block Blast about putting blocks into place. Filling a row or column up destroys it.',
 'odd-hours':'A spooky anomaly game about spotting weird anomalies as a night guard of a museum.'
};
test('the three games are released exactly once with unchanged save ownership and user-supplied quotes',()=>{
 const main=json('public/games.json'),other=[...json('public/secret-games.json'),...json('public/junkyard-games.json')],sources=json('game-sources.json');
 for(const id of ids){const matches=main.filter(g=>g.id===id);assert.equal(matches.length,1);const g=matches[0];assert.equal(g.status,'released');assert.equal(g.choiceQuote,quotes[id]);assert(!other.some(g=>g.id===id));assert(!sources.find(g=>g.id===id).collection);assert.equal(g.url,'games/'+id+'/');assert.equal(g.buildSha256,gameBuildFingerprint(new URL('../public/games/'+id+'/',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')));assert(!/ADMIN PROTOTYPE|Admin prototype|WORK IN PROGRESS|Playable prototype/.test(read('public/games/'+id+'/index.html')));assert(!read('public/covers/'+id+'.svg').includes('ADMIN PROTOTYPE'));}
});
test('daily rotation excludes every game without a quote, includes it when supplied, and handles no eligible games',()=>{
 const source=read('public/app.js'),a=source.indexOf('function renderFeatured('),b=source.indexOf('function syncFeatured(',a),nodes=new Map();
 const node=k=>{if(!nodes.has(k))nodes.set(k,{style:{setProperty(){}},classList:{toggle(){}},replaceChildren(){},setAttribute(){},removeAttribute(){}});return nodes.get(k);};
 const games=json('public/games.json'),choices=games.filter(g=>g.choiceQuote?.trim()),ctx={games,arcadeTints:{},$:node,document:{createTextNode:s=>s},element:()=>'',Date,Intl};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('const choiceDateFormat'),source.indexOf('const arcadeTints')),ctx);vm.runInContext(source.slice(a,b),ctx);
 for(let i=0;i<choices.length*3;i++){const start=Date.UTC(2026,9,1+i,5),schedule=ctx.choiceSchedule(start),index=schedule.day%choices.length;for(const time of [schedule.start,schedule.next-1]){ctx.renderFeatured(time);assert.equal(node('.feature-actions .primary').href,'?play='+choices[index].id);assert.equal(node('.feature-number').textContent,String(index+1).padStart(2,'0')+' / '+String(choices.length).padStart(2,'0'));}}
 ctx.games=[{...games.find(g=>g.id===ids[0]),choiceQuote:'A supplied quote.'}];ctx.renderFeatured(0);assert.equal(node('.choice-quote').textContent,'“A supplied quote.”');assert.equal(node('.featured').hidden,false);
 ctx.games=[{choiceQuote:'  '},{choiceQuote:null},{}];ctx.renderFeatured(0);assert.equal(node('.featured').hidden,true);assert.equal(node('.choice-header').hidden,true);
});
