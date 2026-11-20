export const STATS_KEY='rhetts-arcade-stats-v1',SETTINGS_KEY='rhetts-arcade-settings-v1';
const number=(n,max=1e10)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
export function validSettings(raw){return {volume:Number.isFinite(raw?.volume)?Math.max(0,Math.min(1,raw.volume)):1,motion:['system','reduced','full'].includes(raw?.motion)?raw.motion:'system',profile:raw?.profile==='chromebook'?'chromebook':'standard'};}
export function validStats(raw,now=Date.now()){
 const result={v:1,since:Number.isFinite(raw?.since)&&raw.since>0&&raw.since<=now?raw.since:now,games:Object.create(null),unlocked:Object.create(null)};
 for(const [id,row]of Object.entries(raw?.games||{}).slice(0,256))if(/^[a-z][a-z0-9-]{0,63}$/.test(id)&&row&&typeof row==='object')result.games[id]={seconds:number(row.seconds),launches:Math.floor(number(row.launches,1e9)),lastPlayed:number(row.lastPlayed,now)};
 for(const [id,at]of Object.entries(raw?.unlocked||{}).slice(0,128))if(/^[a-z][a-z0-9-]{0,63}$/.test(id)&&Number.isFinite(at)&&at>0&&at<=now)result.unlocked[id]=at;
 return result;
}
export function addSession(raw,id,seconds=0,launch=false,now=Date.now()){
 const stats=validStats(raw,now);if(!/^[a-z][a-z0-9-]{0,63}$/.test(id))return stats;
 const old=stats.games[id]||{seconds:0,launches:0,lastPlayed:0};stats.games[id]={seconds:old.seconds+number(seconds,15),launches:old.launches+Number(launch),lastPlayed:now};return stats;
}
export function timeLabel(seconds){const n=Math.floor(number(seconds));return n<60?n+' sec':n<3600?Math.floor(n/60)+' min':Math.floor(n/3600)+'h '+Math.floor(n%3600/60)+'m';}
export function publicUpdateFeed(updates,catalog){
 const games=catalog.filter(g=>!g.archived),ids=new Set(games.map(g=>g.id));
 const rows=updates.filter(u=>u.gameId===null||ids.has(u.gameId));
 for(const game of games)if(game.updatedAt&&!rows.some(u=>u.gameId===game.id&&Date.parse(u.date)>=Date.parse(game.updatedAt)))rows.push({id:game.id+'-latest',gameId:game.id,date:game.updatedAt,title:game.title+' · current build',summary:game.description,changes:[],current:true});
 return rows.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
export function readJSON(storage,key){try{return JSON.parse(storage.getItem(key)||'null');}catch{return null;}}
export function forgeSave(storage){try{const code=storage.getItem('stellar-forge-save')||'';if(code.length>4e6)return null;return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.replace(/^SF1-/,'').replaceAll('-','')),c=>c.charCodeAt(0))));}catch{return null;}}
export function gameRecord(id,storage){
 const prototype=readJSON(storage,id+'-prototype-v1'),n=value=>Math.floor(number(value));
 if(['ricochet-club','parcel-panic','odd-hours','starball','cloudkeeper','bridgewright'].includes(id)&&prototype&&typeof prototype==='object'&&!Array.isArray(prototype)){const extra=id==='ricochet-club'?'Highest unlocked table '+Math.max(1,n(prototype.level)):id==='odd-hours'?'Highest unlocked night '+Math.max(1,n(prototype.level)):id==='cloudkeeper'?'Highest unlocked season '+Math.max(1,n(prototype.level)):id==='bridgewright'?'Highest unlocked crossing '+Math.max(1,n(prototype.level)):n(prototype.plays)+' completed rounds';return {label:'Best score',value:n(prototype.best).toLocaleString(),extra};}
 if(id==='slide-between'){const times=Object.values(readJSON(storage,'sb.best')||{}).filter(v=>Number.isFinite(v)&&v>0);return times.length?{label:'Fastest winning time',value:Math.min(...times).toFixed(2)+' sec',extra:'Across saved courses and difficulties'}:null;}
 if(['cargo-swing','pocket-heist','deep-signal','laserline','afterimage','midnight-kitchen'].includes(id)){
  if(!prototype)return null;
  if(id==='cargo-swing')return {label:'Most cargo stacked',value:String(n(prototype.bestCargo)),extra:'Best score '+n(prototype.best).toLocaleString()};
  if(id==='pocket-heist')return {label:'Campaign jobs cleared',value:Math.min(100,n(prototype.cleared))+' / 100',extra:Math.max(0,n(prototype.cleared)-100)+' endless jobs cleared'};
  if(id==='deep-signal')return {label:'Deepest sector',value:String(n(prototype.bestDepth)),extra:'Best score '+n(prototype.best).toLocaleString()};
  if(id==='laserline')return {label:'Circuits cleared',value:Math.min(6,n(prototype.cleared))+' / 6',extra:'Best score '+n(prototype.best).toLocaleString()};
  return {label:id==='midnight-kitchen'?'Best shift earnings':'Best score',value:n(prototype.best).toLocaleString(),extra:''};
 }
 if(id==='square-off'||id==='neon-slip'){const value=storage.getItem(id+'-best');return value===null?null:{label:id==='square-off'?'Boss rounds won':'Best score',value:n(Number(value)).toLocaleString(),extra:''};}
 const keys={'ducks-vs-dogs-2':'ducks-vs-dogs-2-save-v1','meridian-space-program':'meridian_space_program_v1','crazy-sort':'crazysort.v1','car-spleef-3d':'rhettsArcade.carSpleef3d','rustbound':'rustbound-save-v1','rustbound-2':'rustbound-2-demo-v1','the-undercroft':'undercroft-save','car-spleef':'car-spleef-stats-v1','arcade-tycoon':'arcade-tycoon-prototype-v1','ducks-vs-dogs':'ducks-vs-dogs-save-v1','switchyard':'switchyard-stats-v1','stardust-foundry':'stardust-foundry-v1','frontier':'frontier-save-v1','squircle-siege':'squircle-siege-v1'};
 const data=keys[id]?readJSON(storage,keys[id]):null;if(data){
  if(id==='meridian-space-program')return {label:'Science earned',value:n(data.totalScience).toLocaleString(),extra:Object.keys(data.tech||{}).filter(k=>k!=='start'&&data.tech[k]===true).length+' technologies unlocked'};
  if(id==='crazy-sort')return {label:'Most bombs sorted',value:String(Math.max(0,...Object.values(data.best||{}).map(n))),extra:'Best across all difficulties'};
  if(id==='car-spleef-3d')return {label:'Races won',value:String(n(data.wins)),extra:n(data.played)+' races played · '+Object.values(data.mapWins||{}).filter(v=>Number.isFinite(v)&&v>0).length+' / 30 arenas won'};
  if(id==='car-spleef')return {label:'Races won',value:String(n(data.wins)),extra:n(data.races)+' races completed'};
  if(id==='the-undercroft')return {label:'Deepest room',value:String(n(data.best)),extra:''};
  if(id==='ducks-vs-dogs-2')return {label:'Levels cleared',value:String(Object.values(data.cleared||{}).filter(row=>row&&n(row.clears)>0).length),extra:(Array.isArray(data.owned)?data.owned.length:0)+' ducks collected · best endless wave '+n(data.endless?.best)};
  if(id==='ducks-vs-dogs')return {label:'Best endless wave',value:String(n(data.bestEndless)),extra:n(data.wins)+' wins'};
  if(id==='rustbound')return {label:'Current credits',value:n(data.credits).toLocaleString(),extra:Array.isArray(data.buildings)?data.buildings.length+' buildings':''};
  if(id==='rustbound-2')return {label:'Worlds landed on',value:String(new Set(Array.isArray(data.campaign?.progress?.landed)?data.campaign.progress.landed:[]).size),extra:n(data.campaign?.money).toLocaleString()+' credits'};
  if(id==='arcade-tycoon')return {label:'Lifetime earnings',value:n(data.totalEarned).toLocaleString(),extra:'Day '+n(data.day)};
  if(id==='switchyard')return {label:'Trains delivered',value:n(data.delivered).toLocaleString(),extra:n(data.runs)+' runs'};
  if(id==='stardust-foundry')return {label:'Stardust earned',value:n(data.total).toLocaleString(),extra:''};
  if(id==='frontier')return {label:'Colony population',value:String(n(data.colony?.pop)),extra:'Sol '+n(data.colony?.sol)};
  if(id==='squircle-siege')return {label:'Medals earned',value:String(Object.values(data.progress||{}).reduce((sum,map)=>sum+Object.values(map||{}).filter(r=>r&&Number.isFinite(r.lives)&&typeof r.at==='string').length,0)),extra:''};
 }
 if(id==='stellar-forge'){const data=forgeSave(storage);if(data)return {label:'Achievements found',value:String(Array.isArray(data.ac)?data.ac.length:0),extra:Array.isArray(data.pl)?data.pl.length+' planets unlocked':''};}
 if(id==='the-rooms-between'){const data=readJSON(storage,'trb:index');if(Array.isArray(data))return {label:'Saved worlds',value:String(data.length),extra:''};}
 return null;
}
export {achievementList} from './achievements.js';
