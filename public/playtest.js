import {normalizePanel,readPanels,writePanels} from './personal-games.js';
import {openReleaseScheduler} from './playtest-release-editor.js';

const q=(selector,root=document)=>root.querySelector(selector);
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const page=el('section','playtest-page');
const heading=el('header','hub-heading');
heading.append(el('p','eyebrow','EARLY ACCESS'),el('h1','','Playtest'),el('p','hub-description','Try unfinished games before they reach the arcade.'));
const gate=el('form','playtest-gate');
gate.innerHTML='<h2>Playtest is locked</h2><p>Enter the Playtest password to play and send feedback.</p><label>Playtest password<input type="password" name="password" required maxlength="128" autocomplete="current-password"></label><button class="primary" type="submit">Unlock Playtest</button><p role="status"></p>';
const ownerSignIn=el('a','secondary-action','Owner sign-in for release scheduling');
ownerSignIn.href='/signin-with-chatgpt?return_to=%2F%3Fview%3Dplaytest';
ownerSignIn.target='_top';
const library=el('div','playtest-library'),toolbar=el('div','playtest-toolbar'),grid=el('div','game-grid'),add=el('button','secondary-action','Add personal link'),lock=el('button','secondary-action','Lock Playtest'),lockStatus=el('p','playtest-status');
lockStatus.setAttribute('role','status');toolbar.append(add,lock,ownerSignIn);library.append(toolbar,lockStatus,grid);library.hidden=true;
page.append(heading,gate,library);
const field=q('input',gate),submit=q('button',gate),message=q('[role=status]',gate),dialog=q('#secret-dialog');
let games=[],panels=[],editing=null,unlocked=false,owner=false,revision=0;
async function api(action,body){
 const response=await fetch('/api/playtest/'+action,{cache:'no-store',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message),{status:response.status});return data;
}
function render(){
 grid.replaceChildren();
 if(!games.length&&!panels.length){grid.append(el('p','playtest-status','No games are ready to playtest yet. Check back for the next build.'));return;}
 for(const [game,personal] of [...games.map(g=>[g,false]),...panels.map(g=>[g,true])]){
  const card=el('article','game-card secret-card'),art=el('div','card-art secret-placeholder'),body=el('div','card-body'),bottom=el('div','card-bottom');
  if(game.cover){const image=el('img');image.src=game.cover;image.alt=game.coverAlt||'';art.classList.remove('secret-placeholder');art.append(image);}else art.append(el('span','','◇'));
  body.append(el('div','card-meta',personal?'PERSONAL LINK':'PLAYTEST'),el('h3','',game.title),el('p','card-description',game.description||'An unfinished game.'));
  bottom.append(el('span','control-label',game.controls||'In development'));
  if(personal){const edit=el('button','secret-edit','Edit');edit.type='button';edit.setAttribute('aria-label','Edit '+game.title);edit.onclick=()=>openForm(game);bottom.append(edit);}
  if(game.url&&game.status!=='coming-soon'){
   const play=el('a',personal?'play-link':'play-link launch',personal?'Play ↗':'Play');
   if(personal){play.href=game.url;play.target='_blank';play.rel='noopener noreferrer';}
   else play.href='?view=playtest&play='+encodeURIComponent(game.id);
   play.setAttribute('aria-label','Play '+game.title);
   bottom.append(play);
  }
  else{const pending=el('button','play-link','Not playable yet');pending.disabled=true;bottom.append(pending);}
  body.append(bottom);
  if(!personal){
   const feedback=el('a','secondary-action playtest-feedback','Send playtest feedback');
   feedback.href='?view=requests&playtestGame='+encodeURIComponent(game.id);
   feedback.dataset.hubNav='requests';
   feedback.setAttribute('aria-label','Send playtest feedback for '+game.title);
   body.append(feedback);
   if(owner&&game.url&&game.status!=='coming-soon'){
    const release=el('button','secondary-action release-admin-button','Manage release');
    release.type='button';
    release.setAttribute('aria-label','Manage release for '+game.title);
    release.onclick=()=>openReleaseScheduler(game,()=>{
     dispatchEvent(new Event('arcade-releases-changed'));
     lockStatus.textContent='Release settings saved.';
    });
    body.append(release);
   }
  }
  card.append(art,body);grid.append(card);
 }
}
function show(data){
 unlocked=!!data;owner=!!data?.owner;games=data?.games||[];panels=[];
 ownerSignIn.hidden=owner;lock.hidden=owner;
 gate.hidden=unlocked;library.hidden=!unlocked;lockStatus.textContent='';
 if(unlocked){try{panels=readPanels(localStorage);}catch{}render();}
 else{grid.replaceChildren();if(dialog.open)dialog.close();}
}
async function open(){
 const stamp=++revision;
 try{const data=await api('catalog');if(stamp===revision){show(data);message.textContent='';}}
 catch(error){if(stamp===revision){show(null);message.textContent=error.status===401?'':error.message;}}
}
gate.onsubmit=async event=>{
 event.preventDefault();const stamp=++revision;submit.disabled=field.disabled=true;message.textContent='Checking password…';
 try{const data=await api('unlock',{password:field.value});if(stamp===revision){field.value='';message.textContent='';show(data);}}
 catch(error){if(stamp===revision)message.textContent=error.message||'Could not unlock Playtest. Try again.';}
 finally{submit.disabled=field.disabled=false;if(!gate.hidden&&page.isConnected){field.select();field.focus();}}
};
lock.onclick=async()=>{
 const stamp=++revision;lock.disabled=true;
 try{await api('lock',{});if(stamp===revision){show(null);message.textContent='Playtest is locked.';field.focus();}}
 catch{if(stamp===revision)lockStatus.textContent='Could not lock Playtest. Try again.';}
 finally{lock.disabled=false;}
};
function openForm(game=null){
 if(!unlocked)return;editing=game?.id||null;q('#secret-dialog-title').textContent=game?'Edit personal link':'Add a personal link';q('#secret-name').value=game?.title||'';q('#secret-url').value=game?.url||'';q('#secret-description').value=game?.description||'';q('#secret-status').value=game?.status||'development';q('#secret-delete').hidden=!game;q('#secret-message').textContent='';dialog.showModal();
}
add.onclick=()=>openForm();q('#secret-close').onclick=()=>dialog.close();
q('#secret-form').onsubmit=event=>{
 event.preventDefault();if(!unlocked)return;
 try{const panel=normalizePanel({id:editing||crypto.randomUUID(),title:q('#secret-name').value,url:q('#secret-url').value,description:q('#secret-description').value,status:q('#secret-status').value});const next=editing?panels.map(g=>g.id===editing?panel:g):[...panels,panel];writePanels(localStorage,next);panels=next;render();dialog.close();}
 catch(error){q('#secret-message').textContent=error.message;}
};
q('#secret-delete').onclick=()=>{
 if(!unlocked)return;
 try{const next=panels.filter(g=>g.id!==editing);writePanels(localStorage,next);panels=next;render();dialog.close();}
 catch(error){q('#secret-message').textContent=error.message;}
};
window.arcadePlaytest={page,open};
dispatchEvent(new Event('arcade-playtest-ready'));
