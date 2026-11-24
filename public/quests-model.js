// Daily quests: three quests in three different games, reset at midnight Central Time.
// Progress is measured from save counters that only go up, snapshotted when the day's quests are dealt.
import {STATS_KEY,readJSON} from './arcade-model.js';

export const QUESTS_KEY='rhetts-arcade-quests-v1',QUEST_ZONE='America/Chicago',QUESTS_PER_DAY=3;
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:QUEST_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const num=v=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(1e12,n)):0;};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};

/** The quest day (YYYY-MM-DD) in Central Time. */
export function questDay(now=Date.now()){return dayFormat.format(now);}
/** Timestamp of the next midnight in Central Time (handles daylight saving). */
export function nextQuestReset(now=Date.now()){
 const day=questDay(now);let lo=now,hi=now+27*3600e3;
 while(hi-lo>1){const mid=Math.floor((lo+hi)/2);if(questDay(mid)===day)lo=mid;else hi=mid;}
 return hi;
}
function previousDay(day){const [y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10);}

// --- Metrics: each reads a counter from a game's own save. ---
const field=(key,...path)=>storage=>{let v=readJSON(storage,key);for(const p of path)v=obj(v)[p];return num(v);};
const sum=(key,listKey,itemKey)=>storage=>Object.values(obj(obj(readJSON(storage,key))[listKey])).reduce((s,row)=>s+num(obj(row)[itemKey]),0);
const playSeconds=id=>storage=>num(obj(obj(obj(readJSON(storage,STATS_KEY)).games)[id]).seconds);

// Game-specific quests. Every main-library game also gets play-time quests below.
const SPECIFIC={
 'square-off-2':[
  ['win','Win a run on Square Off 2',field('square-off-2-save-v1','records','standardWins'),1,'win'],
  ['bosses','Beat 3 bosses in Square Off 2',field('square-off-2-save-v1','records','bossesBeaten'),3,'bosses'],
  ['modules','Break 2 weapon modules in Square Off 2',field('square-off-2-save-v1','records','modulesBroken'),2,'modules'],
  ['runs','Start 2 runs in Square Off 2',field('square-off-2-save-v1','records','runs'),2,'runs']],
 'car-spleef':[
  ['win','Win a race in Car Spleef',field('car-spleef-stats-v1','wins'),1,'win'],
  ['races','Finish 3 races in Car Spleef',field('car-spleef-stats-v1','races'),3,'races']],
 'car-spleef-3d':[
  ['win','Win a race in Car Spleef 3D',field('rhettsArcade.carSpleef3d','wins'),1,'win'],
  ['races','Play 3 races in Car Spleef 3D',field('rhettsArcade.carSpleef3d','played'),3,'races']],
 'ducks-vs-dogs':[
  ['win','Win a battle in Ducks vs Dogs',field('ducks-vs-dogs-save-v1','wins'),1,'win']],
 'ducks-vs-dogs-2':[
  ['clear','Clear 2 levels in Ducks vs. Dogs 2',sum('ducks-vs-dogs-2-save-v1','cleared','clears'),2,'levels']],
 'pocket-heist':[
  ['rounds','Attempt 3 jobs in Pocket Heist',field('pocket-heist-prototype-v1','plays'),3,'jobs']],
 'ricochet-club':[
  ['tables','Play 3 tables in Ricochet Club',field('ricochet-club-prototype-v1','plays'),3,'tables']],
 'parcel-panic':[
  ['routes','Play 3 routes in Parcel Panic',field('parcel-panic-prototype-v1','plays'),3,'routes']],
 'odd-hours':[
  ['shifts','Work 2 night shifts in Odd Hours',field('odd-hours-prototype-v1','plays'),2,'shifts']],
 'deep-signal':[
  ['dives','Start 2 dives in Deep Signal',field('deep-signal-prototype-v1','plays'),2,'dives']],
 'cargo-swing':[
  ['jobs','Play 3 jobs in Cargo Swing',field('cargo-swing-prototype-v1','plays'),3,'jobs']],
 'neon-slip':[
  ['runs','Finish 3 runs in Neon Slip',field('neon-slip-collection-v1','runs'),3,'runs']],
 'meridian-space-program':[
  ['science','Earn 50 science in Meridian Space Program',field('meridian_space_program_v1','totalScience'),50,'science']],
 'arcade-tycoon':[
  ['days','Run your arcade for 2 days in Arcade Tycoon',field('arcade-tycoon-prototype-v1','day'),2,'days']]
};
const PLAY_TIME=[[5,'Play {t} for 5 minutes'],[10,'Spend 10 minutes in {t}']];

/** Every quest a game can offer. Ids are stable: gameId:kind. */
export function questsFor(game){
 const rows=(SPECIFIC[game.id]||[]).map(([kind,text,metric,goal,unit])=>({id:game.id+':'+kind,gameId:game.id,text,metric,goal,unit}));
 for(const [minutes,text]of PLAY_TIME)rows.push({id:game.id+':play'+minutes,gameId:game.id,text:text.replace('{t}',game.title),metric:playSeconds(game.id),goal:minutes*60,unit:'seconds'});
 return rows;
}
export function questGames(catalog){return catalog.filter(g=>g&&!g.archived&&!g.upcoming&&g.url&&g.status!=='coming-soon').sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}

function rng(seed){let h=1779033703^seed.length;for(let i=0;i<seed.length;i++){h=Math.imul(h^seed.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}
/** The same three quests for everyone on a given day. Game-specific quests are favored over play-time ones. */
export function dealQuests(day,catalog){
 const random=rng('quests:'+day),pool=questGames(catalog),picks=[];
 while(pool.length&&picks.length<QUESTS_PER_DAY){
  const game=pool.splice(Math.floor(random()*pool.length),1)[0],options=questsFor(game),specific=options.filter(q=>!q.id.includes(':play'));
  const from=specific.length&&random()<.75?specific:options;picks.push(from[Math.floor(random()*from.length)]);
 }
 return picks;
}

function validState(raw){
 const s=obj(raw);
 return {v:1,day:typeof s.day==='string'?s.day:'',quests:(Array.isArray(s.quests)?s.quests:[]).slice(0,QUESTS_PER_DAY).filter(q=>q&&typeof q.id==='string').map(q=>({id:q.id,base:num(q.base),done:num(q.done)||null})),total:Math.floor(num(s.total)),streak:Math.floor(num(s.streak)),lastFull:typeof s.lastFull==='string'?s.lastFull:''};
}
function save(storage,state){try{storage.setItem(QUESTS_KEY,JSON.stringify(state));}catch{}return state;}
function lookup(catalog){const map=new Map();for(const g of questGames(catalog))for(const q of questsFor(g))map.set(q.id,{...q,game:g});return map;}

/** Loads today's quests, dealing a fresh set (with baselines) when the Central Time day changes. */
export function ensureQuests(storage,catalog,now=Date.now()){
 const day=questDay(now),state=validState(readJSON(storage,QUESTS_KEY));
 if(state.day===day&&state.quests.length)return state;
 const dealt=dealQuests(day,catalog);if(!dealt.length)return state;
 state.day=day;state.quests=dealt.map(q=>({id:q.id,base:q.metric(storage),done:null}));
 return save(storage,state);
}

/** Current progress for today's quests. Lowers a baseline if that game's save was wiped. */
export function questRows(storage,catalog,now=Date.now()){
 const state=ensureQuests(storage,catalog,now),defs=lookup(catalog);let changed=false;
 const rows=state.quests.map(entry=>{
  const def=defs.get(entry.id);if(!def)return null;
  const value=def.metric(storage);if(value<entry.base){entry.base=value;changed=true;}
  const done=!!entry.done,current=done?def.goal:Math.min(def.goal,value-entry.base);
  return {...def,current,done,doneAt:entry.done,progress:done?1:current/def.goal};
 }).filter(Boolean);
 if(changed)save(storage,state);
 const streak=state.lastFull===state.day||state.lastFull===previousDay(state.day)?state.streak:0;
 return {day:state.day,rows,total:state.total,streak,resetAt:nextQuestReset(now)};
}

/** Marks finished quests complete. Returns the quests completed by this call. */
export function checkQuests(storage,catalog,now=Date.now()){
 const state=ensureQuests(storage,catalog,now),defs=lookup(catalog),fresh=[];
 for(const entry of state.quests){
  const def=defs.get(entry.id);if(!def||entry.done)continue;
  const value=def.metric(storage);if(value<entry.base)entry.base=value;
  if(value-entry.base>=def.goal){entry.done=now;state.total++;fresh.push(def);}
 }
 if(fresh.length){
  if(state.quests.length&&state.quests.every(q=>q.done)&&state.lastFull!==state.day){state.streak=state.lastFull===previousDay(state.day)?state.streak+1:1;state.lastFull=state.day;}
  save(storage,state);
 }
 return fresh;
}

/** After saves are restored from another device, unfinished quests restart from the restored counters. */
export function rebaselineQuests(storage,catalog,now=Date.now()){
 const state=ensureQuests(storage,catalog,now),defs=lookup(catalog);
 for(const entry of state.quests){const def=defs.get(entry.id);if(def&&!entry.done)entry.base=def.metric(storage);}
 save(storage,state);
}
