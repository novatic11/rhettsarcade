import {timeLabel} from './arcade-model.js';
import {statsOverview,filterAchievements,filterRecords} from './stats-dashboard-model.js';

const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const date=value=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const compact=n=>Math.floor(n).toLocaleString();
const percent=n=>Math.round(n*100)+'%';
let current='overview',awardStatus='all',awardGame='all',awardQuery='',recordQuery='',recordScope='all',recordSort='time',awardLimit=12,recordLimit=8;
function link(game,label='Play'){const n=el('a','sd-link launch',label+' ↗');n.href='?play='+encodeURIComponent(game.id);return n;}
function button(text,action,cls='sd-button'){const n=el('button',cls,text);n.type='button';n.onclick=action;return n;}
function image(game){const n=el('img');n.src=game.cover;n.alt='';n.loading='lazy';return n;}
function section(title,note){const n=el('section','sd-panel'),head=el('header','sd-section-head');head.append(el('h2','',title));if(note)head.append(el('p','sd-note',note));n.append(head);return n;}
function progress(value,label){const n=el('progress','sd-progress');n.max=1;n.value=value;n.setAttribute('aria-label',label);return n;}
function empty(title,text){const n=el('div','sd-empty');n.append(el('strong','',title),el('p','',text));return n;}
function goalText(a){return a.unit==='seconds'?timeLabel(a.current)+' / '+timeLabel(a.target):compact(a.current)+' / '+compact(a.target)+(a.unit==='milestone'?'':' '+a.unit);}
function achievement(a,gameById){
 const n=el('article','sd-award'+(a.unlocked?' sd-earned':'')),top=el('div','sd-award-top'),badge=el('span','sd-badge',a.unlocked?'✦':'◇');badge.setAttribute('aria-hidden','true');
 top.append(badge,el('span','sd-kicker',a.gameTitle),el('span','sd-award-status',a.unlocked?'Unlocked':'To earn'));n.append(top,el('h3','',a.title),el('p','sd-award-description',a.description));
 const foot=el('div','sd-award-foot');foot.append(el('span','',a.unlocked?(a.at?'Recognized '+date(a.at):'Recognized from your save'):goalText(a)));
 if(a.gameId&&gameById.has(a.gameId))foot.append(link(gameById.get(a.gameId),'Play'));
 n.append(progress(a.progress,a.title+': '+(a.unlocked?'unlocked':goalText(a))),foot);return n;
}
function select(label,options,value,change){const wrap=el('label','sd-select-label');wrap.append(el('span','',label));const s=el('select');s.setAttribute('aria-label',label);for(const [v,t]of options){const o=el('option','',t);o.value=v;s.append(o);}s.value=value;s.onchange=()=>change(s.value);wrap.append(s);return wrap;}
function search(label,value,change){const wrap=el('label','sd-search');const sr=el('span','sd-sr',label),input=el('input');input.type='search';input.placeholder=label;input.value=value;input.setAttribute('aria-label',label);input.oninput=()=>change(input.value);wrap.append(sr,input);return wrap;}
function more(shown,total,action){const n=el('div','sd-more');n.append(el('span','',shown+' of '+total+' shown'));if(shown<total)n.append(button('Show more',action));return n;}

export function renderStatsDashboard({root,catalog,stats,storage,favorites,onDetails}){
 const data=statsOverview(storage,stats,catalog,favorites),byId=new Map(data.entries.map(e=>[e.game.id,e.game]));root.replaceChildren();root.classList.add('stats-dashboard');
 const heading=el('header','sd-heading'),copy=el('div');copy.append(el('p','eyebrow','YOUR ARCADE'),el('h1','','Your Stats'),el('p','','Your time, personal records, and milestones in one place.'));
 const stamp=el('div','sd-since');stamp.append(el('span','sd-live-dot'),el('span','','Tracking since '+date(data.stats.since)));heading.append(copy,stamp);root.append(heading);
 const metrics=el('div','sd-metrics');
 for(const [label,value,note]of [['Time in games',timeLabel(data.total),'Visible game time'],['Games explored',data.played.length+' / '+data.entries.length,data.main.played+' library · '+data.archives.played+' Archives'],['Achievements',data.unlocked.length+' / '+data.achievements.length,percent(data.unlocked.length/Math.max(1,data.achievements.length))+' unlocked'],['Game launches',compact(data.launches),'Across your tracked games']]){const tile=el('article','sd-metric');tile.append(el('span','',label),el('strong','',value),el('small','',note));metrics.append(tile);}root.append(metrics);
 const tabs=el('div','sd-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Stats sections');const body=el('div','sd-tab-panel');body.id='stats-section';body.setAttribute('role','tabpanel');body.tabIndex=0;const controls=[];
 for(const [id,label]of [['overview','Overview'],['achievements','Achievements'],['records','Game records']]){const b=button(label,()=>{current=id;renderPanel();},'sd-tab');b.id='stats-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',body.id);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=controls.indexOf(b),next=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;controls[next].click();controls[next].focus();};controls.push(b);tabs.append(b);}root.append(tabs,body);
 function renderPanel(){controls.forEach((b,i)=>{const selected=['overview','achievements','records'][i]===current;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});body.setAttribute('aria-labelledby','stats-tab-'+current);body.replaceChildren();({overview,achievements,records})[current]();}
 function overview(){
  const layout=el('div','sd-overview-grid'),top=data.ranked[0],favorite=section('Your most-played game');
  if(top){const spotlight=el('div','sd-spotlight');spotlight.append(image(top.game));const copy=el('div','sd-spotlight-copy');copy.append(el('span','sd-kicker',top.game.genre+(top.game.archived?' · Archives':'')),el('h3','',top.game.title),el('strong','sd-big-time',timeLabel(top.seconds)),el('p','sd-note',top.launches+' '+(top.launches===1?'launch':'launches')+' · '+percent(data.total?top.seconds/data.total:0)+' of tracked time'));const actions=el('div','sd-actions');actions.append(link(top.game,'Jump back in'),button('Details',()=>onDetails(top.game.id)));copy.append(actions);spotlight.append(copy);favorite.append(spotlight);}else{favorite.append(empty('Your next favorite is waiting.','Open a game from the library to start your story.'),button('Browse the library',()=>{location.href='./';}));}
  const genre=section('Where your time goes','Tracked time by genre');
  if(!data.genres.length)genre.append(empty('A blank canvas','Your most-played genres will appear as you play.'));
  data.genres.slice(0,5).forEach((g,i)=>{const row=el('div','sd-genre'),line=el('div');line.append(el('span','',g.name),el('span','',timeLabel(g.seconds)+' · '+percent(g.share)));const bar=progress(g.share,g.name+': '+percent(g.share)+' of tracked time');bar.style.setProperty('--sd-bar',['#a6c9ff','#95d5ca','#c0b4ef','#e0ba9c','#9db9d5'][i]);row.append(line,bar);genre.append(row);});if(data.genres.length>5)genre.append(el('p','sd-note','Other genres · '+timeLabel(data.genres.slice(5).reduce((s,g)=>s+g.seconds,0))));layout.append(favorite,genre);body.append(layout);
  const next=section('Your next milestones','A few goals already within reach.');
  const goals=data.next.length?data.next:data.achievements.filter(a=>!a.unlocked).slice(0,3),grid=el('div','sd-award-grid sd-next-grid');for(const a of goals)grid.append(achievement(a,byId));if(!goals.length)grid.append(empty('Every milestone unlocked','You have collected every available arcade achievement.'));next.append(grid,button('See all achievements',()=>{current='achievements';renderPanel();}));body.append(next);
  const bottom=el('div','sd-overview-grid'),recent=section('Recently played');
  if(!data.recent.length)recent.append(empty('Start anywhere','Your recent games will be ready here when you return.'));
  for(const e of data.recent){const row=el('div','sd-recent-row'),copy=el('div');copy.append(el('strong','',e.game.title),el('span','sd-note','Last played '+date(e.lastPlayed)));row.append(image(e.game),copy,link(e.game));recent.append(row);}
  const explored=section('Explore your collection','Counted when you launch a game through the arcade.');
  for(const [label,c]of [['Main library',data.main],['Archives',data.archives]]){const row=el('div','sd-exploration');row.append(el('strong','',label),el('span','',c.played+' / '+c.total+' tried'),progress(c.total?c.played/c.total:0,label+': '+c.played+' of '+c.total+' games tried'));explored.append(row);}explored.append(button('View all game records',()=>{current='records';renderPanel();}));bottom.append(recent,explored);body.append(bottom);
 }
 function achievements(){
  const panel=section('Arcade achievements','Milestones recognize progress in your saves. Once unlocked, they stay unlocked.'),toolbar=el('div','sd-toolbar'),filters=el('div','sd-segment'),result=el('p','sd-results'),grid=el('div','sd-award-grid'),footer=el('div');result.setAttribute('role','status');
  const buttons=[];for(const [id,label]of [['all','All'],['locked','To earn'],['unlocked','Unlocked']]){const b=button(label,()=>{awardStatus=id;awardLimit=12;update();});buttons.push([id,b]);filters.append(b);}
  toolbar.append(search('Search achievements',awardQuery,v=>{awardQuery=v;awardLimit=12;update();}),select('Game',[['all','Every game'],['arcade','Across the arcade'],...data.entries.filter(e=>data.achievements.some(a=>a.gameId===e.game.id)).map(e=>[e.game.id,e.game.title]).sort((a,b)=>a[1].localeCompare(b[1]))],awardGame,v=>{awardGame=v;awardLimit=12;update();}));panel.append(toolbar,filters,result,grid,footer);body.append(panel);
  function update(){for(const [id,b]of buttons)b.setAttribute('aria-pressed',String(id===awardStatus));const rows=filterAchievements(data.achievements,{status:awardStatus,game:awardGame,query:awardQuery});result.textContent=rows.length+' '+(rows.length===1?'achievement':'achievements')+' · '+rows.filter(a=>a.unlocked).length+' unlocked';grid.replaceChildren(...rows.slice(0,awardLimit).map(a=>achievement(a,byId)));if(!rows.length)grid.append(empty('No matching achievements','Try another game, search, or achievement filter.'));footer.replaceChildren(more(Math.min(rows.length,awardLimit),rows.length,()=>{awardLimit+=12;update();}));}update();
 }
 function records(){
  const panel=section('Game records','Your saved milestones alongside time, launches, and last played date.'),toolbar=el('div','sd-toolbar'),result=el('p','sd-results'),list=el('div','sd-record-list'),footer=el('div');result.setAttribute('role','status');
  toolbar.append(search('Search games',recordQuery,v=>{recordQuery=v;recordLimit=8;update();}),select('Collection',[['all','All games'],['played','Played or saved'],['library','Main library'],['archives','Archives']],recordScope,v=>{recordScope=v;recordLimit=8;update();}),select('Sort by',[['time','Most played'],['recent','Last played'],['name','Game name']],recordSort,v=>{recordSort=v;update();}));panel.append(toolbar,result,list,footer);body.append(panel);
  function update(){const rows=filterRecords(data.entries,{scope:recordScope,query:recordQuery,sort:recordSort});result.textContent=rows.length+' '+(rows.length===1?'game':'games');list.replaceChildren();for(const e of rows.slice(0,recordLimit)){
   const row=el('article','sd-record'),identity=el('div','sd-record-identity'),copy=el('div');copy.append(el('h3','',e.game.title),el('span','sd-note',e.game.genre+(e.game.archived?' · Archives':'')));identity.append(image(e.game),copy);row.append(identity);
   const facts=el('dl','sd-record-facts');for(const [label,value]of [['Time',e.seconds>0?timeLabel(e.seconds):'Not tracked yet'],['Launches',compact(e.launches)],['Last played',e.lastPlayed?date(e.lastPlayed):'Not tracked yet']]){const f=el('div');f.append(el('dt','',label),el('dd','',value));facts.append(f);}row.append(facts);
   const record=el('div','sd-record-score');if(e.record){record.append(el('span','sd-kicker',e.record.label),el('strong','',e.record.value));if(e.record.extra)record.append(el('p','sd-note',e.record.extra));}else record.append(el('span','sd-note','No saved record yet'));row.append(record,link(e.game));list.append(row);
  }if(!rows.length)list.append(empty('No matching games','Try a different search or collection.'));footer.replaceChildren(more(Math.min(recordLimit,rows.length),rows.length,()=>{recordLimit+=8;update();}));}update();
 }
 renderPanel();const note=el('details','sd-data-note');note.append(el('summary','','About these numbers'));const text=el('p','','Playtime starts when a game loads and counts while its tab is visible, including game menus. Earlier playtime is not estimated. Dates reflect your activity in the arcade. Records come from your current saves; earned achievements remain unlocked after resetting a game.');const save=el('p','','Your tracked time and unlocked achievements travel with your arcade save password. Achievement dates show when the arcade recognized the milestone.');note.append(text,save);root.append(note);
}
