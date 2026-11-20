import {BOARDS} from './model.js';
const number=n=>Number.isFinite(n)&&n>=0&&n<1e10?Math.floor(n):0;
const rank={BRONZE:1,SILVER:2,GOLD:3};
export const PAINTS=[
 {id:'classic',name:'Classic',body:null,requirement:'Always available'},
 {id:'copper',name:'Copper',body:'#ca936a',requirement:'Deliver 5 trains in ranked shifts'},
 {id:'midnight',name:'Midnight',body:'#8292b6',requirement:'Finish a clean ranked shift with 10 deliveries'},
 {id:'gold',name:'Gilded',body:'#d9bd79',requirement:'Earn a gold medal'},
 {id:'glacier',name:'Glacier',body:'#9bd2d8',requirement:'Finish a ranked shift on every board'}
];
export function readStats(stored){
 const s=stored&&typeof stored==='object'?stored:{},stats={best:number(s.best),rushBest:number(s.rushBest),runs:number(s.runs),delivered:number(s.delivered),streak:number(s.streak),rankedDelivered:number(s.rankedDelivered),selectedShift:['local','rush','practice'].includes(s.selectedShift)?s.selectedShift:'local',selectedBoard:Object.hasOwn(BOARDS,s.selectedBoard)?s.selectedBoard:'meadow',paint:'classic',tutorial:['done','skipped'].includes(s.tutorial)?s.tutorial:'unseen',records:{},unlocked:['classic']};
 for(const board of Object.keys(BOARDS))for(const shift of ['local','rush']){
  const key=board+':'+shift,r=s.records?.[key]||{};
  stats.records[key]={best:number(r.best),medal:Object.hasOwn(rank,r.medal)?r.medal:null,completed:!!r.completed};
 }
 stats.records['meadow:local'].best=Math.max(stats.best,stats.records['meadow:local'].best);
 stats.records['meadow:rush'].best=Math.max(stats.rushBest,stats.records['meadow:rush'].best);
 stats.best=stats.records['meadow:local'].best;stats.rushBest=stats.records['meadow:rush'].best;
 for(const paint of PAINTS.slice(1))if(Array.isArray(s.unlocked)&&s.unlocked.includes(paint.id))stats.unlocked.push(paint.id);
 if(stats.unlocked.includes(s.paint))stats.paint=s.paint;
 return stats;
}
export function bestFor(stats,shift,board='meadow'){return shift==='practice'?null:stats.records[board+':'+shift]?.best||0;}
export function recordScore(stats,shift,score,board='meadow'){
 if(!['local','rush'].includes(shift)||!Object.hasOwn(BOARDS,board))return false;
 const r=stats.records[board+':'+shift];if(number(score)<=r.best)return false;r.best=number(score);
 if(board==='meadow')stats[shift==='local'?'best':'rushBest']=r.best;return true;
}
export function recordRun(stats,result){
 const board=Object.hasOwn(BOARDS,result.board)?result.board:'meadow';recordScore(stats,result.shift,result.score,board);
 stats.runs++;stats.delivered+=number(result.delivered);stats.streak=Math.max(stats.streak,number(result.streak));
 if(result.shift==='practice')return [];
 stats.rankedDelivered+=number(result.delivered);
 const r=stats.records[board+':'+result.shift];if(!r)return [];
 if(rank[result.medal]>(rank[r.medal]||0))r.medal=result.medal;
 if(result.reason==='complete'&&result.delivered>=8)r.completed=true;
 const earned=[];const unlock=id=>{if(!stats.unlocked.includes(id)){stats.unlocked.push(id);earned.push(PAINTS.find(p=>p.id===id).name);}};
 if(stats.rankedDelivered>=5)unlock('copper');
 if(result.reason==='complete'&&result.errors===0&&result.delivered>=10)unlock('midnight');
 if(Object.values(stats.records).some(r=>r.medal==='GOLD'))unlock('gold');
 if(Object.keys(BOARDS).every(id=>['local','rush'].some(shift=>stats.records[id+':'+shift].completed)))unlock('glacier');
 return earned;
}
