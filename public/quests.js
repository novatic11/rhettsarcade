import {questRows} from './quests-model.js';
import {timeLabel} from './arcade-model.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
let timer=null;

function untilLabel(ms){const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?h+'h '+String(m).padStart(2,'0')+'m':m?m+'m':s+'s';}
function amount(q){return q.unit==='seconds'?timeLabel(q.current)+' / '+timeLabel(q.goal):Math.floor(q.current)+' / '+q.goal;}

export function renderQuests({root,catalog,storage,onDetails}){
 clearInterval(timer);
 const data=questRows(storage,catalog),done=data.rows.filter(q=>q.done).length;
 root.replaceChildren();
 const heading=el('header','hub-heading quest-heading'),copy=el('div');
 copy.append(el('p','eyebrow','DAILY QUESTS'),el('h1','','Today’s quests'),el('p','hub-description','Three things to do in three games. New quests arrive every day at midnight Central Time.'));
 const clock=el('div','quest-clock'),label=el('span','','New quests in'),count=el('strong','quest-countdown');clock.append(label,count);heading.append(copy,clock);root.append(heading);

 const summary=el('div','quest-summary');
 for(const [name,value]of [['Done today',done+' / '+data.rows.length],['Daily streak',data.streak+(data.streak===1?' day':' days')],['Quests completed',String(data.total)]]){const tile=el('div','quest-stat');tile.append(el('span','',name),el('strong','',value));summary.append(tile);}
 root.append(summary);

 const list=el('ol','quest-list');list.setAttribute('aria-label','Today’s quests');
 data.rows.forEach((q,i)=>{
  const card=el('li','quest-card'+(q.done?' quest-done':'')),art=el('img','quest-cover');art.src=q.game.cover;art.alt='';art.loading='lazy';
  const body=el('div','quest-body'),top=el('div','quest-top');top.append(el('span','quest-number','Quest '+(i+1)),el('span','quest-game',q.game.title),el('span','quest-status',q.done?'✓ Complete':'In progress'));
  const bar=el('progress','quest-progress');bar.max=1;bar.value=q.progress;bar.setAttribute('aria-label',q.text+': '+(q.done?'complete':amount(q)));
  const foot=el('div','quest-foot');foot.append(el('span','quest-amount',q.done?'Completed':amount(q)));
  const details=el('button','details-link','Details');details.type='button';details.onclick=()=>onDetails?.(q.game.id);
  const play=el('a','play-link launch',q.done?'Play again ↗':'Play ↗');play.href='?play='+encodeURIComponent(q.game.id);foot.append(details,play);
  body.append(top,el('h2','quest-text',q.text),bar,foot);card.append(art,body);list.append(card);
 });
 if(!data.rows.length)list.append(el('li','hub-empty','No quests today. Check back after the library loads.'));
 root.append(list);
 root.append(el('p','quest-note',done===data.rows.length&&data.rows.length?'All done for today. Nice work — come back tomorrow for three more.':'Progress updates as you play. Quests count what you do after they’re dealt, so earlier records don’t count.'));

 const tick=()=>{if(!count.isConnected){clearInterval(timer);return;}const left=data.resetAt-Date.now();if(left<=0){clearInterval(timer);renderQuests({root,catalog,storage,onDetails});return;}count.textContent=untilLabel(left);};
 tick();timer=setInterval(tick,1000);
}

/** Number of unfinished quests today, for the sidebar badge. */
export function questsLeft(storage,catalog){const {rows}=questRows(storage,catalog);return rows.filter(q=>!q.done).length;}
