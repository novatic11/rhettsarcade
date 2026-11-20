// Browsing preferences stay on this device and never replace game saves.
const BROWSE_KEY='rhetts-arcade-browse-v1';
function validBrowse(value){return {sort:['default','title','updated'].includes(value?.sort)?value.sort:'default',compact:value?.compact===true};}
function sortArcadeGames(list,order){
  const copy=[...list];
  if(order==='title')copy.sort((a,b)=>a.title.localeCompare(b.title));
  if(order==='updated')copy.sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));
  return copy;
}
let browse=validBrowse(null);
try{browse=validBrowse(JSON.parse(localStorage.getItem(BROWSE_KEY)));}catch{}
window.arcadeSortGames=list=>sortArcadeGames(list,browse.sort);
function saveBrowse(){try{localStorage.setItem(BROWSE_KEY,JSON.stringify(browse));}catch{}}
function syncBrowse(){
  document.body.classList.toggle('compact-cards',browse.compact);
  document.querySelectorAll('[data-game-sort]').forEach(node=>node.value=browse.sort);
  document.querySelectorAll('[data-compact]').forEach(node=>{node.setAttribute('aria-pressed',String(browse.compact));});
  $('#clear-search').hidden=!$('#search').value;
  $('#reset-browse').hidden=filter==='All'&&!query;
}
document.querySelectorAll('[data-game-sort]').forEach(node=>node.addEventListener('change',()=>{browse.sort=node.value;saveBrowse();render();window.arcadeRenderJunkyard?.();syncBrowse();}));
document.querySelectorAll('[data-compact]').forEach(node=>node.addEventListener('click',()=>{browse.compact=!browse.compact;saveBrowse();syncBrowse();}));
function clearSearch(){query='';$('#search').value='';render();window.arcadeRenderJunkyard?.();syncBrowse();}
$('#clear-search').addEventListener('click',()=>{clearSearch();$('#search').focus();});
$('#reset-browse').addEventListener('click',()=>{filter='All';clearSearch();});
$('#search').addEventListener('input',syncBrowse);
document.addEventListener('keydown',event=>{
  const editing=event.target.closest('input,textarea,select,[contenteditable="true"]');
  if(event.key==='/'&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!$('#library').hidden&&!$('#library').classList.contains('secret-mode')&&!$('#library').classList.contains('hub-mode')&&!document.querySelector('dialog[open]')){event.preventDefault();$('#search').focus();}
  if(event.key==='Escape'&&event.target===$('#search')){clearSearch();$('#search').blur();}
});
let returnPlace=null,loadingTimer;
document.addEventListener('click',event=>{
  if(!event.target.closest('a.launch')||event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0||$('#library').hidden)return;
  returnPlace={scroll:window.scrollY,path:location.search};
},true);
const loading=$('#game-loading'),frame=$('#game-frame');
window.arcadePrepareGame=game=>{
  clearTimeout(loadingTimer);loading.hidden=false;$('#loading-help').hidden=true;
  $('#loading-title').textContent='Opening '+game.title+'…';$('#loading-note').textContent='Getting everything ready.';$('#loading-standalone').href=game.url;
  loadingTimer=setTimeout(()=>{if(frame.hasAttribute('src')){$('#loading-note').textContent='Taking a little longer. You can retry or open the game on its own.';$('#loading-help').hidden=false;}},12000);
};
frame.addEventListener('load',()=>{if(!frame.hasAttribute('src'))return;clearTimeout(loadingTimer);loading.hidden=true;});
$('#reload-game').addEventListener('click',()=>{const src=frame.getAttribute('src');if(src){window.arcadePrepareGame({title:frame.title,url:src});frame.src=src;}});
window.arcadeGameStopped=()=>{
  clearTimeout(loadingTimer);loading.hidden=true;
  if(returnPlace&&location.search===returnPlace.path){const top=returnPlace.scroll;returnPlace=null;requestAnimationFrame(()=>window.scrollTo({top,behavior:'instant'}));}
};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen');});
// Keep controls accurate after favorites, navigation, or restored password saves.
new MutationObserver(syncBrowse).observe($('#game-grid'),{childList:true});
syncBrowse();
