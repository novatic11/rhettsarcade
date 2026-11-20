import {collectSaves,summarizeSaves,encodeSaveCode,decodeSaveCode,restoreSnapshot,undoRestore} from './save-code.js';
import {createSaveQueue} from './save-queue.js';
import {installSaveWiper} from './save-wiper-ui.js';
const $=s=>document.querySelector(s),dialog=$('#save-dialog'),field=$('#save-password'),message=$('#save-message'),LINK='arcade-save-link-v1';
let mode='claim',review=null,busy=false,ready=false,conflict=false;
const readLink=()=>{try{return JSON.parse(localStorage.getItem(LINK));}catch{return null;}};
let link=readLink();
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('arcade-save-loads'):null;
function pauseGames(){window.dispatchEvent(new Event('arcade-saves-loading'));channel?.postMessage('pause');}
if(channel)channel.onmessage=e=>{if(e.data==='pause')window.dispatchEvent(new Event('arcade-saves-loading'));if(e.data==='restored')window.dispatchEvent(new Event('arcade-saves-restored'));};
const fingerprint=async entries=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(entries))))].map(n=>n.toString(16).padStart(2,'0')).join('');
function status(text,error=false){message.textContent=text;message.classList.toggle('save-error',error);}
function connection(text,error=false){$('#save-link-status').textContent=text;$('#save-link-status').classList.toggle('save-error',error);$('#save-now').hidden=!link;$('#save-disconnect').hidden=!link;$('#save-resolve').hidden=!conflict;}
function setBusy(value){busy=value;dialog.setAttribute('aria-busy',String(value));for(const b of dialog.querySelectorAll('button'))b.disabled=value;field.disabled=value;}
function summary(entries){const list=$('#save-summary');list.replaceChildren();for(const g of summarizeSaves(entries)){const li=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');name.textContent=g.title;value.textContent=g.count?'Saved':'No saved data';li.append(name,value);list.append(li);}list.hidden=false;}
async function api(action,data){
  const response=await fetch('/api/saves/'+action,{method:data?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:data?{'Content-Type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(30000)});
  const result=await response.json().catch(()=>({message:'Online saves could not be reached. Your browser progress is safe.'}));
  if(!response.ok)throw Object.assign(Error(result.message||'Online saves could not be reached.'),{status:response.status});return result;
}
async function backupStore(action,value,key='last-import'){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('rhetts-arcade-save-backups',1);r.onupgradeneeded=()=>r.result.createObjectStore('backups');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('A safety backup could not be saved. Your progress was not changed.'));r.onblocked=()=>reject(Error('Close other arcade tabs and try again.'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('backups',action==='get'?'readonly':'readwrite'),store=tx.objectStore('backups');let out;const r=action==='get'?store.get(key):action==='put'?store.put(value,key):store.delete(key);r.onsuccess=()=>out=r.result;tx.oncomplete=()=>resolve(out);tx.onabort=tx.onerror=()=>reject(Error('The safety backup is unavailable. Your progress was not changed.'));});}finally{db.close();}
}
function remember(row,hash){link={id:row.id,revision:row.revision,hash};localStorage.setItem(LINK,JSON.stringify(link));}
function blocked(e){ready=false;if(e.status===409){conflict=true;connection('Saves changed on another device. Choose which progress to keep.',true);}else connection(e.message||'Offline — progress stays here until it reconnects.',true);}
async function reconnect(){
  if(busy||conflict)return;link=readLink();if(!link){ready=false;connection('Create a password to link the saves already on this device.');return;}
  try{const row=await api('session');if(row.id!==link.id)throw Object.assign(Error('Enter your save password to reconnect.'),{status:401});
    if(row.revision!==link.revision){const decoded=await decodeSaveCode(row.payload),hash=await fingerprint(decoded.entries);if(hash===await fingerprint(collectSaves(localStorage)))remember(row,hash);else throw Object.assign(Error('Saves changed on another device.'),{status:409});}
    ready=true;connection('Linked. Progress saves online automatically.');
  }catch(e){blocked(e);}
}
async function locked(work){return navigator.locks?navigator.locks.request('arcade-save-sync',work):work();}
const sync=createSaveQueue(async(force=false)=>{
  if(busy||conflict)return false;link=readLink();if(!link)return false;
  try{return await locked(async()=>{link=readLink();if(!link||busy||conflict)return false;if(!ready){await reconnect();if(!ready)return false;}
    const entries=collectSaves(localStorage),hash=await fingerprint(entries);if(!force&&hash===link.hash)return true;
    const row=await api('sync',{id:link.id,revision:link.revision,payload:await encodeSaveCode(entries)});remember(row,hash);connection('Saved online at '+new Date(row.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'.');
    return true;
  });}catch(e){blocked(e);return false;}
});
window.addEventListener('arcade-game-left',async()=>{
  if(!readLink())return;
  connection('Saving your progress online…');
  const saved=await sync(true);
  window.dispatchEvent(new CustomEvent('arcade-save-notice',{detail:saved?'Progress saved to your password.':conflict?'Progress kept here. Choose which saves to keep in Your saves.':ready?'Progress kept here. Check Your saves to finish saving.':'Progress kept here. Check Your saves; online saving will retry.'}));
});
async function open(next){
  if(sync.pending){connection('Finishing your save. Try again in a moment.');return;}
  mode=next;review=null;field.value='';field.type='password';field.hidden=next==='conflict';$('#save-password-label').hidden=field.hidden;$('#save-show').hidden=field.hidden;$('#save-show').textContent='Show password';
  $('#save-title').textContent=next==='claim'?'One password. All your saves.':next==='load'?'Continue your arcade.':'Choose your progress.';
  $('#save-description').textContent=next==='claim'?'Choose a unique password using 2–64 letters only. It links your games and your favorites. Keep it safe: anyone with it can load your saves. Capitals matter.':next==='load'?'Enter your password to review its saves, then confirm loading them. Your current progress gets a safety backup. Close games in other arcade tabs first.':'Another device changed your linked saves. Load that copy, or keep this device’s progress. A safety backup is kept before either choice.';
  $('#save-check').textContent=next==='claim'?'Check availability':'Check password';$('#save-check').hidden=field.hidden;$('#save-confirm').hidden=true;$('#save-keep').hidden=true;$('#save-summary').hidden=true;$('#save-undo').hidden=true;status('');dialog.showModal();
  try{if(await backupStore('get'))$('#save-undo').hidden=false;}catch{}
  if(next==='conflict'){setBusy(true);try{const row=await api('session');if(row.id!==readLink()?.id)throw Error('Reconnect using Load saves.');review={row,decoded:await decodeSaveCode(row.payload)};summary(review.decoded.entries);$('#save-confirm').textContent='Load linked saves';$('#save-confirm').hidden=false;$('#save-keep').hidden=false;status('Linked copy saved '+new Date(row.updatedAt).toLocaleString()+'.');}catch(e){status(e.message,true);}finally{setBusy(false);}}else field.focus();
}
function password(){if(!/^[A-Za-z]{2,64}$/.test(field.value))throw Error('Use 2–64 letters only (A–Z). Capitals matter.');return field.value;}
$('#create-saves').addEventListener('click',()=>open('claim'));$('#load-saves').addEventListener('click',()=>open('load'));$('#save-resolve').addEventListener('click',()=>open('conflict'));$('#save-now').addEventListener('click',()=>sync(true));
$('#save-close').addEventListener('click',()=>dialog.close());$('#save-show').addEventListener('click',()=>{field.type=field.type==='password'?'text':'password';$('#save-show').textContent=field.type==='password'?'Show password':'Hide password';});
dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>{field.value='';review=null;if(!conflict)reconnect();});
field.addEventListener('input',()=>{review=null;$('#save-confirm').hidden=true;$('#save-summary').hidden=true;status('');});field.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!busy&&!$('#save-check').hidden)$('#save-check').click();}});
$('#save-check').addEventListener('click',async()=>{
  setBusy(true);review=null;$('#save-confirm').hidden=true;
  try{const value=password();if(mode==='claim'){const result=await api('check',{password:value});if(!result.available)throw Error('That password is taken. Choose another one.');review={password:value};summary(collectSaves(localStorage));$('#save-confirm').textContent='Yes, use this password';status('This password is available. Are you sure you want to attach your current saves to it? Keep a copy of the password somewhere safe.');}
    else{const row=await api('load',{password:value});review={password:value,row,decoded:await decodeSaveCode(row.payload)};summary(review.decoded.entries);$('#save-confirm').textContent='Yes, load these saves';status('Saved '+new Date(row.updatedAt).toLocaleString()+'. Loading replaces your games’ progress and favorites on this device.');}$('#save-confirm').hidden=false;
  }catch(e){status(e.message,true);}finally{setBusy(false);}
});
$('#save-confirm').addEventListener('click',async()=>{
  if(!review)return;setBusy(true);ready=false;
  try{await locked(async()=>{if(mode==='claim'){const entries=collectSaves(localStorage),row=await api('claim',{password:review.password,confirmed:true,payload:await encodeSaveCode(entries)});remember(row,await fingerprint(entries));status('Password claimed. Your current saves are linked and will save online automatically.');}
    else{pauseGames();const row=mode==='conflict'?await api('session'):await api('connect',{password:review.password,confirmed:true,revision:review.row.revision});if(mode==='conflict'&&row.id!==readLink()?.id)throw Error('Reconnect using Load saves.');const decoded=await decodeSaveCode(row.payload);await restoreSnapshot(localStorage,decoded.entries,b=>backupStore('put',b));remember(row,await fingerprint(decoded.entries));window.dispatchEvent(new Event('arcade-saves-restored'));channel?.postMessage('restored');$('#save-undo').hidden=false;status('Saves loaded. Open a game to continue. Use Undo load to recover your previous progress.');}
    ready=true;conflict=false;connection('Linked. Progress saves online automatically.');field.value='';review=null;$('#save-confirm').hidden=true;$('#save-check').hidden=true;$('#save-keep').hidden=true;
  });}catch(e){status(e.message,true);blocked(e);}finally{setBusy(false);}
});
$('#save-keep').addEventListener('click',async()=>{
  if(!review)return;setBusy(true);try{await locked(async()=>{if(review.row.id!==readLink()?.id)throw Error('Reconnect using Load saves.');
    await backupStore('put',{version:1,createdAt:new Date().toISOString(),groups:summarizeSaves([]).map(g=>g.id),entries:review.decoded.entries});const entries=collectSaves(localStorage),row=await api('sync',{id:review.row.id,revision:review.row.revision,payload:await encodeSaveCode(entries)});remember(row,await fingerprint(entries));ready=true;conflict=false;connection('Linked. This device’s progress is saved online.');status('This device’s progress is saved. The other copy is available with Undo load.');$('#save-keep').hidden=true;$('#save-confirm').hidden=true;$('#save-undo').hidden=false;review=null;
  });}catch(e){status(e.message,true);}finally{setBusy(false);}
});
$('#save-undo').addEventListener('click',async()=>{
  setBusy(true);try{await locked(async()=>{const backup=await backupStore('get');if(!backup)throw Error('No safety backup is available.');pauseGames();if(readLink())await api('leave',{});localStorage.removeItem(LINK);link=null;ready=false;conflict=false;undoRestore(localStorage,backup);await backupStore('delete');window.dispatchEvent(new Event('arcade-saves-restored'));channel?.postMessage('restored');$('#save-undo').hidden=true;connection('Previous progress restored here. Create or load a password to link it.');status('Undo complete. Online saves were kept; this device is now disconnected.');});}catch(e){status(e.message,true);}finally{setBusy(false);}
});
$('#save-disconnect').addEventListener('click',async()=>{if(busy||sync.pending)return;try{if(!conflict){await sync();if(!ready)return;}await api('leave',{});localStorage.removeItem(LINK);link=null;ready=false;conflict=false;connection('Disconnected. Your password’s online saves and this device’s progress are kept.');}catch(e){blocked(e);}});
installSaveWiper({document,storage:localStorage,getCatalog:()=>window.arcadeCatalog?.()||[],getLinkId:()=>readLink()?.id||null,isBusy:()=>busy,finishSave:()=>sync(true),setSyncBusy:value=>{busy=value;},withLock:locked,pauseGames,keepBackup:backup=>backupStore('put',backup,'last-wipe'),changed:()=>{window.dispatchEvent(new Event('arcade-saves-restored'));channel?.postMessage('restored');},publish:async()=>{
 try{link=readLink();if(!link)throw Error('Your save connection changed.');const entries=collectSaves(localStorage),hash=await fingerprint(entries),row=await api('sync',{id:link.id,revision:link.revision,payload:await encodeSaveCode(entries)});remember(row,hash);ready=true;conflict=false;connection('Selected game wiped. Your linked password save is up to date.');}catch(error){blocked(error);throw error;}
},saveFailure:cleared=>conflict?(cleared?'Online saves changed on another device. Use Choose progress in Your saves to resolve the conflict.':'Online saves changed on another device. Use Choose progress first; nothing was cleared.'):(cleared?'The password save has not confirmed the change yet. Online saving will retry; check Your saves for its status.':'Your linked password save could not be reached. Reconnect in Your saves and try again. Nothing was cleared.')});
window.addEventListener('storage',e=>{if(e.key===LINK){ready=false;link=readLink();}else setTimeout(()=>sync(),800);});window.addEventListener('online',()=>sync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(()=>{if(!dialog.open)sync();},5000);reconnect();
