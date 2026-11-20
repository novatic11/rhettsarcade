import {validStats,gameRecord,achievementList} from './arcade-model.js';

export function statsOverview(storage,raw,catalog,favorites=[],now=Date.now()){
 const stats=validStats(raw,now),all=catalog.filter(g=>g.status!=='coming-soon');
 const entries=all.map(game=>({game,seconds:0,launches:0,lastPlayed:0,...stats.games[game.id],record:gameRecord(game.id,storage)}));
 const played=entries.filter(e=>e.launches>0),ranked=[...played].sort((a,b)=>b.seconds-a.seconds||b.launches-a.launches||a.game.title.localeCompare(b.game.title));
 const total=entries.reduce((n,e)=>n+e.seconds,0),launches=entries.reduce((n,e)=>n+e.launches,0),byGenre=new Map();
 for(const entry of entries)if(entry.seconds>0){const genre=entry.game.genre||'Other';byGenre.set(genre,(byGenre.get(genre)||0)+entry.seconds);}
 const achievements=achievementList(storage,stats,all,favorites),unlocked=achievements.filter(a=>a.unlocked);
 return {stats,entries,played,ranked,total,launches,achievements,unlocked,
  recent:[...played].filter(e=>e.lastPlayed>0).sort((a,b)=>b.lastPlayed-a.lastPlayed).slice(0,4),
  genres:[...byGenre].map(([name,seconds])=>({name,seconds,share:total?seconds/total:0})).sort((a,b)=>b.seconds-a.seconds),
  next:achievements.filter(a=>!a.unlocked&&a.current>0).sort((a,b)=>b.progress-a.progress||a.target-b.target).slice(0,3),
  main:{played:played.filter(e=>!e.game.archived).length,total:entries.filter(e=>!e.game.archived).length},
  archives:{played:played.filter(e=>e.game.archived).length,total:entries.filter(e=>e.game.archived).length}
 };
}

export function filterAchievements(rows,{status='all',game='all',query=''}={}){
 const search=query.trim().toLowerCase();
 return rows.filter(a=>(status==='all'||(status==='unlocked'?a.unlocked:!a.unlocked))&&(game==='all'||(game==='arcade'?!a.gameId:a.gameId===game))&&(!search||[a.title,a.description,a.gameTitle].some(v=>v.toLowerCase().includes(search))))
  .sort((a,b)=>status==='unlocked'?(b.at||0)-(a.at||0)||a.title.localeCompare(b.title):Number(a.unlocked)-Number(b.unlocked)||b.progress-a.progress||a.gameTitle.localeCompare(b.gameTitle)||a.target-b.target);
}

export function filterRecords(entries,{scope='all',query='',sort='time'}={}){
 const search=query.trim().toLowerCase();
 return entries.filter(e=>(scope==='all'||(scope==='archives'?e.game.archived:scope==='library'?!e.game.archived:!!e.record||e.launches>0))&&(!search||e.game.title.toLowerCase().includes(search)))
  .sort((a,b)=>sort==='name'?a.game.title.localeCompare(b.game.title):sort==='recent'?b.lastPlayed-a.lastPlayed||a.game.title.localeCompare(b.game.title):b.seconds-a.seconds||b.launches-a.launches||a.game.title.localeCompare(b.game.title));
}
