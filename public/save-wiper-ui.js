import {WIPE_GAMES,gameProgress,wipeGameProgress} from './save-wiper.js';

export function installSaveWiper({document,storage,getCatalog,getLinkId,isBusy,finishSave,setSyncBusy,withLock,pauseGames,keepBackup,changed,publish,saveFailure}){
 const q=id=>document.querySelector('#'+id),dialog=q('wipe-dialog'),select=q('wipe-game'),message=q('wipe-message');
 let reviewed=null,wiping=false;
 const status=(text,error=false)=>{message.textContent=text;message.classList.toggle('save-error',error);};
 function controls(disabled){for(const button of dialog.querySelectorAll('button'))button.disabled=disabled;select.disabled=disabled||!!reviewed;}
 function resetReview(){reviewed=null;q('wipe-review').hidden=true;q('wipe-confirm').hidden=true;q('wipe-check').hidden=false;select.disabled=false;}
 function describe(){resetReview();q('wipe-check').disabled=!select.value;status(select.value?(gameProgress(storage,select.value).length?'Saved progress found on this browser.':'No saved progress on this browser.'):'');}
 q('save-wiper').addEventListener('click',()=>{
  if(isBusy()||wiping)return;
  resetReview();select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a game…';placeholder.disabled=true;placeholder.selected=true;select.append(placeholder);
  const catalog=getCatalog(),groups=[['Main games',g=>catalog.some(row=>row.id===g.id&&!row.archived)],['Archives',g=>catalog.some(row=>row.id===g.id&&row.archived)],['Other games',g=>!catalog.some(row=>row.id===g.id)]];
  for(const [label,include]of groups){const games=WIPE_GAMES.filter(include).sort((a,b)=>a.title.localeCompare(b.title));if(!games.length)continue;const group=document.createElement('optgroup');group.label=label;for(const game of games){const option=document.createElement('option');option.value=game.id;option.textContent=game.title;group.append(option);}select.append(group);}
  describe();q('wipe-cancel').textContent='Cancel';dialog.showModal();select.focus();
 });
 select.addEventListener('change',describe);
 q('wipe-check').addEventListener('click',()=>{
  const game=WIPE_GAMES.find(g=>g.id===select.value);if(!game||wiping)return;
  reviewed=game.id;const text='Wipe '+game.title+'? This clears its progress and high scores on this browser'+(getLinkId()?' and from your linked save password':'')+'. Other games, preferences, favorites, playtime, and arcade achievements are kept.';
  q('wipe-review').textContent=text;q('wipe-review').hidden=false;q('wipe-confirm').textContent='Yes, wipe '+game.title;q('wipe-confirm').hidden=false;q('wipe-check').hidden=true;select.disabled=true;status('');q('wipe-cancel').focus();
 });
 for(const id of ['wipe-close','wipe-cancel'])q(id).addEventListener('click',()=>{if(!wiping)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(wiping)event.preventDefault();});
 q('wipe-confirm').addEventListener('click',async()=>{
  const game=WIPE_GAMES.find(g=>g.id===reviewed);if(!game||wiping||isBusy())return;
  wiping=true;controls(true);status('Preparing to clear '+game.title+'…');let cleared=false,syncBusy=false;
  try{
   const expected=getLinkId();
   if(expected&&!await finishSave())throw Error(saveFailure());
   setSyncBusy(true);syncBusy=true;
   await withLock(async()=>{
    if(getLinkId()!==expected)throw Error('Your save connection changed. Close Save Wiper and choose the game again. Nothing was cleared.');
    pauseGames();await wipeGameProgress(storage,game.id,keepBackup);cleared=true;changed();
    if(expected){status('Progress cleared here. Updating your password save…');await publish();}
   });
   resetReview();q('wipe-check').disabled=false;q('wipe-cancel').textContent='Done';status(game.title+' progress wiped'+(expected?' from this browser and your linked password save.':'. It will start fresh next time you play.'));
  }catch(error){
   if(cleared){resetReview();q('wipe-cancel').textContent='Done';status(game.title+' was wiped on this browser. '+saveFailure(true),true);}
   else status(error.message||'The save could not be wiped. Nothing was cleared.',true);
  }finally{if(syncBusy)setSyncBusy(false);wiping=false;controls(false);}
 });
}
