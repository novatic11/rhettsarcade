import {renderStatsDashboard} from './stats-dashboard.js';
import {STATS_KEY,SETTINGS_KEY,validStats,validSettings,addSession,timeLabel,readJSON,gameRecord,achievementList,publicUpdateFeed} from './arcade-model.js';
const q=s=>document.querySelector(s),node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
let info={},previews={},updates=[],view=null,active=null,ready=false,visible=!document.hidden,tickAt=performance.now(),settings=validSettings(readJSON(localStorage,SETTINGS_KEY)),stats=validStats(readJSON(localStorage,STATS_KEY));
const catalog=()=>window.arcadeCatalog?.()||[],favoriteIds=()=>window.arcadeFavorites?.()||[],date=value=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
function storeStats(value){stats=value;try{localStorage.setItem(STATS_KEY,JSON.stringify(stats));}catch{}}
function syncAchievements(){
 const latest=validStats(readJSON(localStorage,STATS_KEY));let changed=false;for(const a of achievementList(localStorage,latest,catalog(),favoriteIds()))if(a.unlocked&&!latest.unlocked[a.id]){latest.unlocked[a.id]=Date.now();changed=true;}
 if(changed)storeStats(latest);else stats=latest;
}
function flush(){const now=performance.now(),dt=Math.min(15,Math.max(0,(now-tickAt)/1000));tickAt=now;if(active&&ready&&visible&&dt>0)storeStats(addSession(readJSON(localStorage,STATS_KEY),active.id,dt));}
function start(game,loaded=false){flush();active=game;ready=loaded;tickAt=performance.now();storeStats(addSession(readJSON(localStorage,STATS_KEY),game.id,0,true));}
function stop(){flush();active=null;ready=false;syncAchievements();if(view==='stats')renderStats();}
q('#game-frame').addEventListener('load',()=>{if(active){ready=true;tickAt=performance.now();}});
document.addEventListener('visibilitychange',()=>{flush();visible=!document.hidden;tickAt=performance.now();});
addEventListener('pagehide',flush);setInterval(flush,5000);

function applySettings(){
 const reduced=settings.motion==='reduced'||settings.motion==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 document.documentElement.dataset.motion=reduced?'reduced':'full';document.documentElement.dataset.profile=settings.profile;
 document.querySelectorAll('[data-arcade-setting]').forEach(el=>{el.value=el.dataset.arcadeSetting==='volume'?String(Math.round(settings.volume*100)):settings[el.dataset.arcadeSetting];});
 document.querySelectorAll('[data-volume-output]').forEach(el=>el.textContent=Math.round(settings.volume*100)+'%');
}
function saveSetting(key,value){settings=validSettings({...settings,[key]:key==='volume'?Number(value)/100:value});try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));document.querySelectorAll('[data-settings-status]').forEach(el=>el.textContent='Saved on this browser.');}catch{document.querySelectorAll('[data-settings-status]').forEach(el=>el.textContent='This browser could not save settings.');}applySettings();}
function settingsForm(){
 const form=node('div','settings-form');
 form.innerHTML='<div class="setting-row"><div><label>Master volume</label><p>Scales audio across every built-in game. Each game keeps its own sound and music choices.</p></div><div class="volume-control"><input type="range" min="0" max="100" step="1" data-arcade-setting="volume" aria-label="Master volume"><output data-volume-output></output></div></div><div class="setting-row"><div><label>Motion</label><p>Reduce launcher animations and supported game motion effects.</p></div><select data-arcade-setting="motion" aria-label="Motion preference"><option value="system">Follow device preference</option><option value="reduced">Reduced motion</option><option value="full">Full motion</option></select></div><div class="setting-row"><div><label>Performance</label><p>Chromebook lowers rendering resolution and switches the 3D games to lighter graphics. Applies when you next open a game.</p></div><select data-arcade-setting="profile" aria-label="Performance profile"><option value="standard">Standard</option><option value="chromebook">Chromebook</option></select></div><p class="settings-status" data-settings-status role="status">Saved on this browser. Your game saves stay separate.</p>';
 form.querySelectorAll('[data-arcade-setting]').forEach(el=>el.addEventListener(el.type==='range'?'input':'change',()=>saveSetting(el.dataset.arcadeSetting,el.value)));
 const themes=themePicker();if(themes)form.prepend(themes);
 return form;
}
// Theme picker: each option shows a small preview painted with that theme's own colours (themes.css).
let themePickers=0;
function themePicker(){
 const api=window.arcadeThemes;if(!api)return null;
 const row=node('div','setting-row setting-theme'),copy=node('div'),title=node('p','setting-title','Theme'),picker=node('div','theme-picker'),name='arcade-theme-'+(++themePickers);
 title.id=name+'-label';
 copy.append(title,node('p','','Changes how the launcher looks on this browser. Games keep their own style.'));
 picker.setAttribute('role','radiogroup');picker.setAttribute('aria-labelledby',title.id);
 for(const theme of api.list()){
  const option=node('label','theme-option'),input=node('input'),preview=node('span','theme-preview');
  input.type='radio';input.name=name;input.value=theme.id;input.dataset.arcadeTheme='';input.checked=theme.id===api.get();
  input.addEventListener('change',()=>{if(!input.checked)return;const saved=api.set(theme.id);document.querySelectorAll('[data-settings-status]').forEach(el=>el.textContent=saved?theme.name+' theme saved on this browser.':'This browser could not save your theme.');});
  preview.dataset.theme=theme.id;preview.setAttribute('aria-hidden','true');
  preview.innerHTML='<span class="tp-side"><i></i><i></i><i></i><i></i></span><span class="tp-main"><span class="tp-bar"></span><span class="tp-body"><span class="tp-hero"><b></b><em></em></span><span class="tp-cards"><i></i><i></i><i></i></span></span></span>';
  option.append(input,preview,node('span','theme-name',theme.name),node('span','theme-note',theme.note));
  picker.append(option);
 }
 row.append(copy,picker);return row;
}
addEventListener('arcade-theme-changed',event=>document.querySelectorAll('input[data-arcade-theme]').forEach(input=>{input.checked=input.value===event.detail;}));
function quickSettings(){const dialog=q('#quick-settings');dialog.replaceChildren(dialogHeader('ARCADE SETTINGS','Make yourself comfortable.','quick-settings-title',dialog),settingsForm());dialog.showModal();applySettings();}
q('#player-settings').addEventListener('click',quickSettings);

function pageHeader(eyebrow,title,description){const box=node('header','hub-heading');box.append(node('p','eyebrow',eyebrow),node('h1','',title),node('p','hub-description',description));return box;}
function dialogHeader(eyebrow,title,id,dialog){const box=node('header','dialog-heading'),copy=node('div');copy.append(node('p','eyebrow',eyebrow));const heading=node('h2','',title);heading.id=id;copy.append(heading);const close=node('button','dialog-close','×');close.type='button';close.setAttribute('aria-label','Close');close.onclick=()=>dialog.close();box.append(copy,close);return box;}
function playLink(game,label='Play now'){const a=node('a','primary launch',label+' ↗');a.href='?play='+encodeURIComponent(game.id);return a;}
function detailLink(game){const b=node('button','secondary-action','View details');b.type='button';b.onclick=()=>details(game.id);return b;}
function details(id){
 const game=catalog().find(g=>g.id===id);if(!game)return;
 const data=info[id]||{},preview=previews[id],dialog=q('#game-details'),content=node('div','detail-content');dialog.replaceChildren(dialogHeader(game.archived?'FROM THE ARCHIVES':game.genre.toUpperCase(),game.title,'detail-title',dialog));
 const figure=node('figure','detail-preview'),image=node('img');image.src=preview?.src||game.cover;image.alt=preview?.alt||game.title+' cover art';image.width=1280;image.height=720;figure.append(image,node('figcaption','',preview?'Game preview':'Cover art'));dialog.append(figure);
 const intro=node('div','detail-intro');intro.append(node('p','detail-description',game.description));const facts=node('div','detail-facts');facts.append(node('span','',data.session?'Typical session · '+data.session:'Play at your own pace'),node('span','',game.updatedAt?'Updated '+date(game.updatedAt):'Built into your arcade'));if(game.mobileFriendly)facts.append(node('span','','Mobile Friendly · touch controls'));intro.append(facts);
 const actions=node('div','detail-actions'),play=playLink(game);play.onclick=()=>dialog.close();actions.append(play,window.favoriteButton?window.favoriteButton(game):favoriteButton(game));intro.append(actions);content.append(intro);
 const columns=node('div','detail-columns'),features=node('section'),controls=node('section');features.append(node('h3','','Inside the game'));const list=node('ul');for(const text of data.features||[game.description])list.append(node('li','',text));features.append(list);controls.append(node('h3','','Controls'));for(const text of data.controls||[game.controls])controls.append(node('p','',text));columns.append(features,controls);content.append(columns);
 const record=gameRecord(id,localStorage),time=stats.games[id];if(record||time){const box=node('section','detail-record');box.append(node('h3','','Your progress'));if(record)box.append(node('p','',record.label+': '+record.value+(record.extra?' · '+record.extra:'')));if(time)box.append(node('p','',timeLabel(time.seconds)+' tracked · '+time.launches+(time.launches===1?' launch':' launches')));content.append(box);}
 const recent=updates.filter(u=>u.gameId===id).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,3),notes=node('section','detail-notes');notes.append(node('h3','','Update notes'));
 if(recent.length)for(const update of recent){notes.append(node('h4','',update.title),node('p','note-date',date(update.date)));const items=node('ul');for(const change of update.changes||[])items.append(node('li','',change));notes.append(items);}else notes.append(node('p','',game.updatedAt?'Latest build: '+date(game.updatedAt)+'. Detailed notes will appear here with future updates.':'Detailed notes will appear here with future updates.'));
 content.append(notes);dialog.append(content);dialog.showModal();
}
for(const dialog of [q('#game-details'),q('#quick-settings')])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});

function renderUpdates(){
 const root=q('#arcade-hub');root.replaceChildren(pageHeader('RECENTLY IN THE ARCADE','What’s New','New worlds, new features, and the little improvements worth knowing about.'));
 const toolbar=node('div','updates-toolbar'),label=node('label','','Show '),select=node('select');select.setAttribute('aria-label','Filter updates');for(const [value,text]of [['all','Everything'],['launcher','Launcher'],['games','Main games']]){const option=node('option','',text);option.value=value;select.append(option);}label.append(select);toolbar.append(label);root.append(toolbar);const feed=node('div','updates-feed');root.append(feed);
 const render=()=>{feed.replaceChildren();const all=catalog().filter(g=>!g.archived);let rows=publicUpdateFeed(updates,catalog());
 rows=rows.filter(u=>{const game=all.find(g=>g.id===u.gameId);return select.value==='all'||select.value==='launcher'&&!u.gameId||select.value==='games'&&game&&!game.archived;}).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 for(const update of rows){const game=all.find(g=>g.id===update.gameId),article=node('article','update-entry'),when=node('time','update-date',date(update.date));when.dateTime=update.date;article.append(when);const body=node('div','update-body'),top=node('div','update-identity');if(game){const img=node('img');img.src=game.cover;img.alt='';img.loading='lazy';top.append(img);}top.append(node('span','',game?game.title+(game.archived?' · Archives':''):'Rhett’s Arcade'));body.append(top,node('h2','',update.title),node('p','',update.summary));if(update.changes?.length){const changes=node('ul');for(const text of update.changes)changes.append(node('li','',text));body.append(changes);}else body.append(node('p','current-build-note','Current game overview. Detailed notes will accompany future changes.'));if(game){const actions=node('div','update-actions');actions.append(detailLink(game),playLink(game,'Play'));body.append(actions);}article.append(body);feed.append(article);}if(!rows.length)feed.append(node('p','hub-empty','No updates in this category yet.'));};select.onchange=render;render();
}
function renderStats(){
 syncAchievements();renderStatsDashboard({root:q('#arcade-hub'),catalog:catalog(),stats,storage:localStorage,favorites:favoriteIds(),onDetails:details});
}
function renderSettings(){const root=q('#arcade-hub');root.replaceChildren(pageHeader('FEEL RIGHT AT HOME','Your arcade. Your settings.','One set of controls for the whole arcade, saved on this browser.'),settingsForm());applySettings();}
function show(next){
 view=['updates','stats','settings','requests','teasers','playtest'].includes(next)?next:null;q('#library').classList.toggle('hub-mode',!!view);q('#arcade-hub').hidden=!view;q('#arcade-hub').classList.toggle('stats-dashboard',view==='stats');document.querySelectorAll('[data-hub-nav]').forEach(a=>{a.classList.toggle('nav-active',a.dataset.hubNav===view);if(a.dataset.hubNav===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(!view){if(!q('#library').classList.contains('junkyard-mode')&&!q('#library').classList.contains('secret-mode'))q('.breadcrumb b').textContent='LIBRARY';return;}q('#library-nav').classList.remove('nav-active');q('#favorites-nav').classList.remove('nav-active');q('.breadcrumb b').textContent={updates:'WHAT’S NEW',stats:'YOUR STATS',settings:'SETTINGS',requests:'REQUESTS',teasers:'NEWS',playtest:'PLAYTEST'}[view];if(view==='playtest'){q('#arcade-hub').replaceChildren();if(window.arcadePlaytest){q('#arcade-hub').append(window.arcadePlaytest.page);window.arcadePlaytest.open();}}else if(view==='teasers'){q('#arcade-hub').replaceChildren();if(window.arcadeTeasers){q('#arcade-hub').append(window.arcadeTeasers.page);window.arcadeTeasers.open();}}else if(view==='requests'){q('#arcade-hub').replaceChildren();if(window.arcadeRequests){q('#arcade-hub').append(window.arcadeRequests.page);window.arcadeRequests.open();}}else ({updates:renderUpdates,stats:renderStats,settings:renderSettings})[view]();
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-hub-nav]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;e.preventDefault();history.pushState({},'',a.href);stopGame();window.arcadeShowSecret?.(false);window.arcadeShowJunkyard?.(false);show(a.dataset.hubNav);scrollTo(0,0);});
function libraryReady(){syncAchievements();const params=new URL(location.href).searchParams;if(view)show(view);else if(params.has('view')&&!params.has('play'))show(params.get('view'));const id=params.get('play');if(id&&!active&&q('#game-frame').hasAttribute('src')){const game=catalog().find(g=>g.id===id);if(game)start(game,q('#game-frame').contentDocument?.readyState==='complete');}}
window.arcadeHub={show,details,start,stop,flush};
addEventListener('arcade-library-ready',libraryReady);
addEventListener('arcade-favorites-changed',()=>{for(const button of document.querySelectorAll('[data-favorite-id]')){const selected=favoriteIds().includes(button.dataset.favoriteId);button.textContent=selected?'♥':'♡';button.setAttribute('aria-pressed',String(selected));}syncAchievements();if(view==='stats')renderStats();});
addEventListener('arcade-saves-restored',()=>{stats=validStats(readJSON(localStorage,STATS_KEY));syncAchievements();window.arcadeRenderJunkyard?.();if(view)show(view);});
addEventListener('storage',e=>{if(e.key===SETTINGS_KEY){settings=validSettings(readJSON(localStorage,SETTINGS_KEY));applySettings();}if(e.key===STATS_KEY&&view==='stats')renderStats();});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',applySettings);applySettings();libraryReady();
Promise.all(['game-info.json','game-previews.json','updates.json'].map(file=>fetch(file).then(r=>{if(!r.ok)throw Error(file);return r.json();}))).then(([a,b,c])=>{info=a;previews=b;updates=Array.isArray(c)?c:[];if(view)show(view);}).catch(()=>{if(view==='updates')renderUpdates();});

addEventListener('arcade-requests-ready',()=>{if(new URL(location.href).searchParams.get('view')==='requests')show('requests');});

addEventListener('arcade-teasers-ready',()=>{if(new URL(location.href).searchParams.get('view')==='teasers')show('teasers');});

addEventListener('arcade-playtest-ready',()=>{if(new URL(location.href).searchParams.get('view')==='playtest')show('playtest');});
