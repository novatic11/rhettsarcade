const $ = selector => document.querySelector(selector);
let baseGames=[],games=[],mainDisplay=[],junkyardGames=[],filter='All',query='',lastPlayed=null,favorites=new Set();
const choiceDateFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'numeric',day:'numeric'});
let featureTimer,featuredDay=null,choiceDayCache=null;
function centralDayNumber(now){
  const parts=Object.fromEntries(choiceDateFormat.formatToParts(now).map(part=>[part.type,part.value]));
  return Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/86400000;
}
function choiceSchedule(now=Date.now()){
  if(choiceDayCache&&now>=choiceDayCache.start&&now<choiceDayCache.next)return choiceDayCache;
  const day=centralDayNumber(now);
  // Locate actual Central midnights; DST days can contain 23 or 25 hours.
  const midnight=target=>{let low=now-30*3600000,high=now+30*3600000;while(high-low>1){const middle=Math.floor((low+high)/2);if(centralDayNumber(middle)<target)low=middle;else high=middle;}return high;};
  return choiceDayCache={day,start:midnight(day),next:midnight(day+1)};
}
const arcadeTints={'ducks-vs-dogs-2':'#9ed4c7','meridian-space-program':'#91c6f4','slide-between':'#a6bde8','crazy-sort':'#a9bdff','car-spleef-3d':'#6cc8ff','cargo-swing':'#9bd8ea','pocket-heist':'#e4bd8d','deep-signal':'#8ddfc8','ducks-vs-dogs':'#9ed4c7','switchyard':'#9acdbd','arcade-tycoon':'#9cc9dc','car-spleef':'#9cdcff','square-off':'#79d3ed','neon-slip':'#b29aff','rustbound':'#91bdff','the-rooms-between':'#aaa7ff','stellar-forge':'#88cdf6','the-undercroft':'#b29df0'};
function updateChoiceClock(now=Date.now()){
  const schedule=choiceSchedule(now);
  $('.choice-progress span').style.width=((now-schedule.start)/(schedule.next-schedule.start)*100)+'%';
  if(games.length&&featuredDay!==schedule.day)renderFeatured(now);
}
function renderFeatured(now=Date.now()){
  const choices=games.filter(game=>typeof game.choiceQuote==='string'&&game.choiceQuote.trim());
  $('.choice-header').hidden=!choices.length;
  $('.featured').hidden=!choices.length;
  if(!choices.length)return;
  featuredDay=choiceSchedule(now).day;
  const index=((featuredDay%choices.length)+choices.length)%choices.length,game=choices[index];
  $('.featured').style.setProperty('--game-tint',arcadeTints[game.id]||'#91bdff');
  const image=$('.feature-background');image.src=game.cover;image.alt=game.title+' cover';
  const title=$('#featured-title');title.replaceChildren(document.createTextNode(game.title),element('span','','.'));
  $('.feature-category').textContent=game.genre.toUpperCase();
  $('.choice-quote').textContent='“'+game.choiceQuote+'”';
  $('.feature-hint').textContent=game.controls;
  $('.feature-number').textContent=String(index+1).padStart(2,'0')+' / '+String(choices.length).padStart(2,'0');
  const play=$('.feature-actions .primary');
  play.href=game.external?game.url:'?play='+encodeURIComponent(game.id);
  play.classList.toggle('launch',!game.external);play.setAttribute('aria-label','Play '+game.title);
  if(game.external){play.target='_blank';play.rel='noopener';}else{play.removeAttribute('target');play.removeAttribute('rel');}
  play.onclick=game.external?()=>{lastPlayed=game.id;save();}:null;
}
function syncFeatured(){
  const now=Date.now();
  clearTimeout(featureTimer);renderFeatured(now);
  updateChoiceClock(now);
  if(games.length)featureTimer=setTimeout(syncFeatured,choiceSchedule(now).next-now);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncFeatured();});
window.addEventListener('pageshow',syncFeatured);
setInterval(()=>{if(!document.hidden)updateChoiceClock();},1000);
let storageWorks=true;
try { const saved=JSON.parse(localStorage.getItem('rhetts-arcade')||'{}');favorites=new Set(Array.isArray(saved.favorites)?saved.favorites:[]);lastPlayed=saved.lastPlayed||null; } catch { storageWorks=false; }
function save(){try{localStorage.setItem('rhetts-arcade',JSON.stringify({favorites:[...favorites],lastPlayed}));}catch{storageWorks=false;toast('This browser can’t save favorites right now.');}}
window.addEventListener('arcade-saves-restored',()=>{try{const data=JSON.parse(localStorage.getItem('rhetts-arcade')||'{}');favorites=new Set(Array.isArray(data.favorites)?data.favorites:[]);lastPlayed=data.lastPlayed||null;render();}catch{toast('Game saves restored; arcade favorites could not be read.');}});
let toastTimer;function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
const releaseDateFormat=new Intl.DateTimeFormat('en-US',{
  timeZone:'America/Chicago',year:'numeric',month:'short',day:'numeric',
  hour:'numeric',minute:'2-digit',timeZoneName:'short'
});
let scheduledGames=[],releaseSignature=null,releaseLoading=null,lastReleaseCheck=-Infinity;
let releaseClock={now:Date.now(),received:performance.now()};
const releaseNow=()=>releaseClock.now+performance.now()-releaseClock.received;
function combineCollections(){
  const positions=new Map(baseGames.map(game=>[game.id,[]]));
  const end=[];
  for(const game of scheduledGames)(positions.get(game.beforeId)||end).push(game);
  mainDisplay=baseGames.flatMap(game=>[...positions.get(game.id),game]).concat(end);
  games=mainDisplay.filter(game=>!game.upcoming);
}
function refreshReleases(repaint=true){
  if(releaseLoading)return releaseLoading;
  lastReleaseCheck=performance.now();
  releaseLoading=(async()=>{
    try{
      const response=await fetch('/api/playtest/releases',{cache:'no-store',signal:AbortSignal.timeout(5000)});
      if(!response.ok)return;
      const data=await response.json();
      if(!Array.isArray(data.games)||!Number.isFinite(data.now))return;
      releaseClock={now:data.now,received:performance.now()};
      const signature=JSON.stringify(data.games);
      if(signature===releaseSignature)return;
      releaseSignature=signature;
      scheduledGames=data.games;
      combineCollections();
      if(repaint){
        syncFeatured();
        render();
        window.dispatchEvent(new Event('arcade-library-ready'));
      }
    }catch{}
  })().finally(()=>{releaseLoading=null;});
  return releaseLoading;
}
function updateReleaseCountdowns(){
  const now=releaseNow();
  for(const clock of document.querySelectorAll('[data-release-at]')){
    const seconds=Math.max(0,Math.ceil((Number(clock.dataset.releaseAt)-now)/1000));
    if(seconds===0){clock.textContent='Unlocking…';continue;}
    const units=[Math.floor(seconds/86400)+'d',Math.floor(seconds/3600)%24+'h',Math.floor(seconds/60)%60+'m',seconds%60+'s'];
    clock.textContent=units.slice(seconds>=86400?0:seconds>=3600?1:seconds>=60?2:3).join(' ');
  }
  if(!document.hidden&&performance.now()-lastReleaseCheck>3000&&scheduledGames.some(game=>game.upcoming&&game.releaseAt<=now)){
    refreshReleases();
  }
}
function upcomingReleaseCard(game){
  const card=element('article','game-card upcoming-release-card');
  if(game.cover){
    const art=element('div','card-art'),image=element('img');
    image.src=game.cover;image.alt=game.coverAlt||'';image.loading='lazy';image.width=640;image.height=400;
    art.append(image);card.append(art);
  }
  const body=element('div','card-body');
  const countdown=element('strong','release-countdown');countdown.dataset.releaseAt=game.releaseAt;
  const date=element('time','release-countdown-date',releaseDateFormat.format(game.releaseAt));
  date.dateTime=new Date(game.releaseAt).toISOString();
  body.append(element('div','card-meta','COMING SOON'),element('h3','',game.title),element('p','card-description',game.description),countdown,date);
  card.append(body);
  return card;
}
window.addEventListener('arcade-releases-changed',async()=>{await releaseLoading;await refreshReleases();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&baseGames.length)refreshReleases();});
setInterval(()=>{if(!document.hidden&&baseGames.length)refreshReleases();},45000);
setInterval(updateReleaseCountdowns,1000);
function allCatalog(){return [...games,...junkyardGames];}
function matchesLibrary(game){
  const category=filter==='All'||(filter==='Favorites'?favorites.has(game.id):filter==='Mobile Friendly'?game.mobileFriendly===true:game.genre===filter);
  return category&&(`${game.title} ${game.genre} ${game.description} ${game.mobileFriendly?'mobile friendly touch':''}`.toLowerCase().includes(query));
}
window.arcadeCatalog=()=>[...games.map(g=>({...g,archived:false})),...junkyardGames.map(g=>({...g,archived:true}))];
window.arcadeFavorites=()=>[...favorites];
function favoriteButton(game){const button=element('button','favorite',favorites.has(game.id)?'♥':'♡');button.type='button';button.dataset.favoriteId=game.id;button.setAttribute('aria-label','Favorite '+game.title);button.setAttribute('aria-pressed',String(favorites.has(game.id)));button.addEventListener('click',()=>{if(favorites.has(game.id))favorites.delete(game.id);else favorites.add(game.id);save();render();window.arcadeRenderJunkyard?.();window.dispatchEvent(new Event('arcade-favorites-changed'));const next=document.querySelector('[data-favorite-id="'+game.id+'"]');if(!document.querySelector('dialog[open]'))next?.focus({preventScroll:true});});return button;}
function detailButton(game){const button=element('button','details-link','Details');button.type='button';button.setAttribute('aria-label','Details for '+game.title);button.onclick=()=>window.arcadeHub?.details(game.id);return button;}
function render(){
  const latestUpdate=games.reduce((latest,game)=>Number.isFinite(Date.parse(game.updatedAt))&&(!latest||Date.parse(game.updatedAt)>Date.parse(latest.updatedAt))?game:latest,null);
  const previous=allCatalog().find(game=>game.id===lastPlayed),resume=$('#continue-game');resume.hidden=!previous;
  if(previous){resume.href=previous.external?previous.url:'?play='+encodeURIComponent(previous.id);resume.classList.toggle('launch',!previous.external);$('#continue-title').textContent=previous.title;$('#continue-cover').src=previous.cover;resume.setAttribute('aria-label','Play '+previous.title+' again');if(previous.external){resume.target='_blank';resume.rel='noopener';}else{resume.removeAttribute('target');resume.removeAttribute('rel');}}
  const pool=filter==='Favorites'?allCatalog():mainDisplay;
  const matches=pool.filter(matchesLibrary);
  const list=window.arcadeSortGames?.(matches)||matches;
  const grid=$('#game-grid');grid.replaceChildren();
  for(const game of list){
    if(game.upcoming){grid.append(upcomingReleaseCard(game));continue;}
    const card=element('article','game-card');
    card.style.setProperty('--game-tint',arcadeTints[game.id]||'#91bdff');
    const cover=element('a',game.external?'card-art':'card-art launch');cover.href=game.external?game.url:'?play='+encodeURIComponent(game.id);cover.setAttribute('aria-label','Play '+game.title);
    const image=element('img');image.src=game.cover;image.alt='';image.loading='lazy';image.width=640;image.height=400;cover.append(image);
    cover.append(element('span','card-index',game.number||String(games.indexOf(game)+1).padStart(2,'0')));
    const favorite=favoriteButton(game);
    const body=element('div','card-body'),meta=element('div','card-meta');meta.append(element('span','',game.genre.toUpperCase()));if(game.mobileFriendly)meta.append(element('span','mobile-tag','Mobile Friendly'));if(junkyardGames.some(g=>g.id===game.id))meta.append(element('span','archive-tag','ARCHIVES'));if(lastPlayed===game.id)meta.append(element('span','recent','LAST PLAYED'));
    const title=element('h3');const titleLink=element('a',game.external?'':'launch',game.title);titleLink.href=cover.href;title.append(titleLink);
    const bottom=element('div','card-bottom');bottom.append(element('span','control-label',game.controls));const play=element('a',game.external?'play-link':'play-link launch','Play ↗');play.href=cover.href;play.setAttribute('aria-label','Play '+game.title);bottom.append(detailButton(game),play);
    if(game.external)for(const link of [cover,titleLink,play]){link.target='_blank';link.rel='noopener';link.addEventListener('click',()=>{lastPlayed=game.id;save();});}
    body.append(meta,title,element('p','card-description',game.description),bottom);card.append(cover);
    if(game.id===latestUpdate?.id){card.classList.add('has-new-update');const newlyReleased=game.releasedAt&&Date.parse(game.releasedAt)===Date.parse(game.updatedAt);card.append(element('span','new-update',newlyReleased?'NEW GAME':'NEW UPDATE'));}
    card.append(favorite,body);grid.append(card);
  }
  $('#result-count').textContent=String(list.length).padStart(2,'0');$('#total-games').textContent=filter==='Favorites'?allCatalog().length:games.length;$('#collection-label').textContent=filter==='Favorites'?'Your favorites':filter==='Mobile Friendly'?'Mobile friendly':'Your collection';$('#favorite-count').textContent=[...favorites].filter(id=>allCatalog().some(g=>g.id===id)).length;
  $('#empty').hidden=list.length>0;$('#empty').textContent=filter==='Favorites'&&!query?'Tap the heart on a game to keep it here.':'No games match yet. Try another search or filter.';
  $('#random').disabled=!list.some(game=>!game.upcoming);
  updateReleaseCountdowns();
  $('#library-nav').classList.toggle('nav-active',filter!=='Favorites');$('#favorites-nav').classList.toggle('nav-active',filter==='Favorites');
  document.querySelectorAll('[data-filter]').forEach(button=>{const active=button.dataset.filter===filter;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
}
function flushGame(){
  const frame=$('#game-frame');if(!frame.hasAttribute('src'))return false;window.arcadeHub?.flush();
  // Flush the games' existing leave handlers before collecting their save keys.
  try{frame.contentWindow.dispatchEvent(new Event('beforeunload'));frame.contentWindow.dispatchEvent(new PageTransitionEvent('pagehide'));}catch{}
  return true;
}
function stopGame(saveOnExit=true){window.arcadeSetPresenceGame?.(null);const leaving=flushGame(),frame=$('#game-frame');window.arcadeHub?.stop();frame.removeAttribute('src');document.title='Rhett’s Arcade — Your game library';$('#library').hidden=false;$('#player').hidden=true;document.body.style.overflow='';render();window.arcadeGameStopped?.();if(leaving&&saveOnExit)window.dispatchEvent(new Event('arcade-game-left'));}
window.addEventListener('arcade-save-notice',e=>toast(e.detail));
window.addEventListener('arcade-saves-loading',()=>{stopGame(false);history.replaceState(null,'','./');});
function openGame(id,playtestGame){
  window.arcadeSetPresenceGame?.(null);
  const leaving=flushGame();window.arcadeHub?.stop();if(leaving)window.dispatchEvent(new Event('arcade-game-left'));
  const game=playtestGame||[...games,...junkyardGames].find(g=>g.id===id);if(!game){$('#library').hidden=true;$('#player').hidden=false;$('#player-error').hidden=false;$('#game-frame').hidden=true;$('#player-title').textContent='Game unavailable';$('#standalone').hidden=true;$('#fullscreen').hidden=true;return;}
  if(game.external){lastPlayed=id;save();location.assign(game.url);return;}
  $('#back').href=playtestGame?'?view=playtest':'./';
  $('#back-label').textContent=playtestGame?'Playtest':'Library';
  $('#loading-standalone').hidden=!!playtestGame;
  $('#player-error').hidden=true;$('#game-frame').hidden=false;$('#standalone').hidden=!!playtestGame;$('#fullscreen').hidden=false;$('#library').hidden=true;$('#player').hidden=false;document.body.style.overflow='hidden';
  window.arcadePrepareGame?.(game);
  $('#player-title').textContent=game.title;$('#player-controls').textContent=game.controls;$('#game-frame').title=game.title;$('#game-frame').src=game.url;window.arcadeSetPresenceGame?.(game.id);$('#standalone').href=game.url;document.title=game.title+' — Rhett’s Arcade';if(allCatalog().some(g=>g.id===id)){lastPlayed=id;save();}if(!playtestGame)window.arcadeHub?.start(game);
}
let routeRevision=0;
async function openPlaytestGame(id,revision){
  const launchUrl=location.href;
  const stillRequested=()=>revision===routeRevision&&location.href===launchUrl;
  let message='This game is unavailable in Playtest.';
  try{
    const response=await fetch('/api/playtest/catalog',{cache:'no-store'});
    if(response.ok){
      const {games:playtestGames}=await response.json();
      const game=playtestGames.find(entry=>entry.id===id&&entry.url&&entry.status!=='coming-soon');
      if(game&&stillRequested()){openGame(id,game);return;}
    }else if(response.status===401)message='Unlock Playtest to play this game.';
    else message='Could not load Playtest. Try again.';
  }catch{message='Could not load Playtest. Try again.';}
  if(!stillRequested())return;
  history.replaceState({},'','?view=playtest');
  route();
  toast(message);
}
function route(){
  const revision=++routeRevision;
  const params=new URL(location.href).searchParams,id=params.get('play'),view=params.get('view');
  if(id&&view==='playtest'){void openPlaytestGame(id,revision);return;}
  if(id){openGame(id);return;}
  stopGame();
  window.arcadeShowSecret?.(params.has('workshop'));
  window.arcadeShowJunkyard?.(params.has('junkyard'));
  window.arcadeHub?.show(view);
}
document.addEventListener('click',event=>{const launch=event.target.closest('a.launch');if(launch&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();history.pushState({},'',launch.href);route();}});
$('#back').addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;event.preventDefault();const params=new URL(location.href).searchParams,junk=junkyardGames.some(g=>g.id===params.get('play'));history.pushState({},'',params.get('view')==='playtest'?'?view=playtest':junk?'?junkyard=1':'./');route();window.scrollTo(0,0);});
window.addEventListener('popstate',route);
$('#filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(button){filter=button.dataset.filter;render();}});
$('#search').addEventListener('input',event=>{query=event.target.value.trim().toLowerCase();render();window.arcadeRenderJunkyard?.();});
$('#favorites-nav').addEventListener('click',()=>{history.replaceState({},'','./');window.arcadeShowSecret?.(false);window.arcadeShowJunkyard?.(false);window.arcadeHub?.show(null);filter='Favorites';query='';$('#search').value='';render();$('#collection').scrollIntoView({behavior:'smooth'});});
$('#library-nav').addEventListener('click',()=>{history.replaceState({},'','./');window.arcadeShowSecret?.(false);window.arcadeShowJunkyard?.(false);window.arcadeHub?.show(null);filter='All';query='';$('#search').value='';render();});
$('#random').addEventListener('click',()=>{const visible=(filter==='Favorites'?allCatalog():games).filter(matchesLibrary);if(visible.length){const game=visible[Math.floor(Math.random()*visible.length)];if(game.external){lastPlayed=game.id;save();window.open(game.url,'_blank','noopener');render();}else{history.pushState({},'','?play='+encodeURIComponent(game.id));openGame(game.id);}}});
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#game-frame').requestFullscreen();}catch{toast('Fullscreen isn’t supported here. Try Open game.');}});
async function load(){try{const [response,junk]=await Promise.all([fetch('games.json'),fetch('junkyard-games.json')]);if(!response.ok||!junk.ok)throw Error('Library unavailable');baseGames=await response.json();junkyardGames=await junk.json();if(!Array.isArray(junkyardGames))throw Error('Junkyard unavailable');window.arcadeRenderJunkyard?.();if(!Array.isArray(baseGames)||!baseGames.length)throw Error('Invalid library');combineCollections();await refreshReleases(false);$('#library-error').hidden=true;syncFeatured();render();window.dispatchEvent(new Event('arcade-library-ready'));route();}catch{$('#game-grid').replaceChildren();$('#empty').hidden=true;$('#library-error').hidden=false;$('#random').disabled=true;}}
$('#retry').addEventListener('click',load);load();
