import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {questDay,nextQuestReset,dealQuests,questGames,questsFor,ensureQuests,checkQuests,questRows,rebaselineQuests,QUESTS_KEY} from '../public/quests-model.js';
import {STATS_KEY} from '../public/arcade-model.js';
class Storage{constructor(rows=[]){this.rows=new Map(rows);}getItem(k){return this.rows.get(k)??null;}setItem(k,v){this.rows.set(k,String(v));}removeItem(k){this.rows.delete(k);}}
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=[...json('public/games.json').map(g=>({...g,archived:false})),...json('public/junkyard-games.json').map(g=>({...g,archived:true}))];
const so2=(wins)=>JSON.stringify({records:{standardWins:wins,runs:wins,bossesBeaten:wins,modulesBroken:0}});

test('quest days roll over at midnight Central Time, including across daylight saving',()=>{
 assert.equal(questDay(Date.parse('2026-11-25T05:59:59Z')),'2026-11-24');
 assert.equal(questDay(Date.parse('2026-11-25T06:00:00Z')),'2026-11-25');
 assert.equal(questDay(Date.parse('2026-07-01T04:59:59Z')),'2026-06-30');
 assert.equal(nextQuestReset(Date.parse('2026-11-24T20:00:00Z')),Date.parse('2026-11-25T06:00:00Z'));
 assert.equal(nextQuestReset(Date.parse('2026-06-30T20:00:00Z')),Date.parse('2026-07-01T05:00:00Z'));
 assert.equal(nextQuestReset(Date.parse('2026-03-08T03:00:00Z')),Date.parse('2026-03-08T06:00:00Z'));
 assert.equal(nextQuestReset(Date.parse('2026-03-08T12:00:00Z')),Date.parse('2026-03-09T05:00:00Z'));
});

test('every day deals three quests in three different main-library games, the same for everyone',()=>{
 const main=new Set(questGames(catalog).map(g=>g.id));assert(!main.has('rustbound-2'));
 for(let d=1;d<=60;d++){const day='2026-12-'+String(d%28+1).padStart(2,'0'),a=dealQuests(day,catalog),b=dealQuests(day,[...catalog].reverse());
  assert.equal(a.length,3);assert.equal(new Set(a.map(q=>q.gameId)).size,3);for(const q of a)assert(main.has(q.gameId));assert.deepEqual(a.map(q=>q.id),b.map(q=>q.id));}
 for(const g of questGames(catalog))assert(questsFor(g).length>=2);
});

test('quests count only progress made after they are dealt, and finish once',()=>{
 const now=Date.parse('2026-11-24T18:00:00Z'),storage=new Storage([['square-off-2-save-v1',so2(4)]]);
 const quest=questsFor(catalog.find(g=>g.id==='square-off-2')).find(q=>q.text==='Win a run on Square Off 2');
 storage.setItem(QUESTS_KEY,JSON.stringify({day:questDay(now),quests:[{id:quest.id,base:4,done:null}],total:2,streak:0,lastFull:''}));
 assert.equal(ensureQuests(storage,catalog,now).quests.length,1);
 assert.deepEqual(checkQuests(storage,catalog,now),[]);
 storage.setItem('square-off-2-save-v1',so2(5));
 assert.equal(checkQuests(storage,catalog,now)[0].id,quest.id);assert.deepEqual(checkQuests(storage,catalog,now),[]);
 const view=questRows(storage,catalog,now);assert.equal(view.rows[0].done,true);assert.equal(view.total,3);assert.equal(view.streak,1);
});

test('play-time quests use launcher time, a wiped save lowers the baseline, and restores restart unfinished quests',()=>{
 const now=Date.parse('2026-11-24T18:00:00Z'),storage=new Storage([[STATS_KEY,JSON.stringify({games:{'neon-slip':{seconds:100}}})],['car-spleef-stats-v1','{"wins":9,"races":20}']]);
 storage.setItem(QUESTS_KEY,JSON.stringify({day:questDay(now),quests:[{id:'neon-slip:play5',base:100,done:null},{id:'car-spleef:win',base:9,done:null}]}));
 storage.setItem(STATS_KEY,JSON.stringify({games:{'neon-slip':{seconds:250}}}));
 let rows=questRows(storage,catalog,now).rows;assert.equal(rows[0].current,150);assert.equal(rows[0].done,false);
 storage.setItem('car-spleef-stats-v1','{"wins":0,"races":0}');rows=questRows(storage,catalog,now).rows;assert.equal(rows[1].current,0);
 storage.setItem('car-spleef-stats-v1','{"wins":1,"races":1}');assert.equal(checkQuests(storage,catalog,now).length,1);
 storage.setItem(STATS_KEY,JSON.stringify({games:{'neon-slip':{seconds:9000}}}));rebaselineQuests(storage,catalog,now);
 rows=questRows(storage,catalog,now).rows;assert.equal(rows[0].current,0);assert.equal(rows[1].done,true);
});

test('a new Central Time day deals fresh quests and malformed state is tolerated',()=>{
 const storage=new Storage([[QUESTS_KEY,'{"day":5,"quests":"x","total":-3}']]),now=Date.parse('2026-11-24T18:00:00Z');
 const state=ensureQuests(storage,catalog,now);assert.equal(state.day,'2026-11-24');assert.equal(state.quests.length,3);assert.equal(state.total,0);
 const tomorrow=ensureQuests(storage,catalog,Date.parse('2026-11-25T06:00:01Z'));assert.equal(tomorrow.day,'2026-11-25');
 for(const value of ['null','[]','{"records":"x"}','1'])for(const key of ['square-off-2-save-v1','ducks-vs-dogs-2-save-v1',STATS_KEY]){storage.setItem(key,value);assert.doesNotThrow(()=>questRows(storage,catalog,now));}
});
