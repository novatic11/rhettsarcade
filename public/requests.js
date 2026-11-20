import {requestThreads} from './request-threads.js';
const q=s=>document.querySelector(s)||requestPage?.querySelector(s),make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const requestPage=make('section','request-page');requestPage.id='requests-page';
const pageHeading=make('header','hub-heading');pageHeading.append(make('p','eyebrow','A LETTER TO RHETT'),make('h1','','Requests.'),make('p','hub-description','Send an idea, follow its progress, and read replies from Rhett.'));requestPage.append(pageHeading);
const dialog=make('section','request-dialog request-compose');dialog.id='request-dialog';dialog.setAttribute('aria-labelledby','request-title');dialog.innerHTML='<form id="request-form" novalidate><header><div><span class="eyebrow">TO RHETT / FROM YOUR ARCADE</span><h2 id="request-title">Got an idea?</h2></div></header><p id="request-intro">Ask for a feature, share a game idea, or tell me what needs fixing.</p><label for="request-name">Your name <span>2–60 characters</span></label><input id="request-name" name="name" required minlength="2" maxlength="60" autocomplete="name" placeholder="Sign your letter"><label for="request-letter">Your request <span>10–4,000 characters</span></label><textarea id="request-letter" name="message" rows="6" required minlength="10" maxlength="4000" placeholder="Dear Rhett,…"></textarea><div class="request-bottom"><span id="request-counter">0 / 4,000</span><button type="submit" id="request-send">Request</button></div><p id="request-message" role="status" aria-live="polite"></p><button id="request-retry" type="button" hidden>Reconnect</button><p id="request-receipt" class="request-receipt" hidden></p><small id="request-draft-note">Delivered online to Rhett’s inbox from any browser or network. Your requests and replies are available from this browser. Please leave two minutes between requests.</small></form>';const feedbackBack=make('a','secondary-action request-feedback-back','Back to Playtest');
feedbackBack.href='?view=playtest';feedbackBack.dataset.hubNav='playtest';feedbackBack.hidden=true;
dialog.querySelector('header').after(feedbackBack);requestPage.append(dialog);requestPage.hidden=true;document.body.append(requestPage);
let retryAt=0,sending=false,submissionKey=null,ready=false;try{retryAt=Number(localStorage.getItem('rhetts-request-next'))||0;}catch{}
async function api(action,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch('/api/requests/'+action,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});let data;try{data=await response.json();}catch{throw Error('The server returned an unexpected response. Please retry.');}if(!response.ok)throw Object.assign(Error(data.message||'Requests are unavailable.'),{retryAt:data.retryAt,status:response.status});return data;}catch(error){if(error.name==='AbortError'||error instanceof TypeError)throw Error('Connection interrupted. Unsent text has been kept. Please retry to confirm delivery.');throw error;}finally{clearTimeout(timer);}}
const DRAFT='rhetts-request-draft-v1',RECEIPT='rhetts-request-receipt-v1';
let gameId=null,openRevision=0,pendingStatus;
const requestedGame=()=>new URL(location.href).searchParams.get('playtestGame')?.slice(0,80)||null;
const draftKey=()=>gameId?DRAFT+':playtest:'+gameId:DRAFT;
function draft(){try{localStorage.setItem(draftKey(),JSON.stringify({name:q('#request-name').value,message:q('#request-letter').value,key:submissionKey}));}catch{q('#request-draft-note').textContent='This browser cannot keep drafts after you leave. Keep this page open until delivery is confirmed.';}}
function receipt(value){if(!value?.id)return;const el=q('#request-receipt');el.hidden=false;el.textContent='Last delivered '+new Date(value.at).toLocaleString()+' · Receipt '+value.id;}
function restoreDraft(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem(draftKey()));}catch{}
 q('#request-name').value=String(saved?.name||'').slice(0,60);
 q('#request-letter').value=String(saved?.message||'').slice(0,4000);
 submissionKey=typeof saved?.key==='string'?saved.key:null;
 q('#request-counter').textContent=q('#request-letter').value.length.toLocaleString()+' / 4,000';
}
restoreDraft();try{receipt(JSON.parse(localStorage.getItem(RECEIPT)));}catch{}
function countdown(){q('#request-name').disabled=q('#request-letter').disabled=sending;const remaining=Math.max(0,Math.ceil((retryAt-Date.now())/1000));q('#request-send').disabled=sending||!ready||remaining>0;q('#request-send').textContent=sending?'Sending…':remaining?'Wait '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):gameId?'Send feedback':'Request';}
async function feedbackGame(id){
 const response=await fetch('/api/playtest/catalog',{cache:'no-store'});
 if(response.status===401)throw Error('Unlock Playtest to send feedback. Your draft is saved on this browser.');
 if(!response.ok)throw Error('Could not load the Playtest game. Please try again.');
 const {games}=await response.json();
 const game=games.find(entry=>entry.id===id);
 if(!game)throw Error('Choose a current game from the Playtest tab.');
 return game;
}
async function openRequest(){
 if(sending)return;
 const nextGame=requestedGame(),stamp=++openRevision;
 if(nextGame!==gameId){gameId=nextGame;restoreDraft();}
 feedbackBack.hidden=!gameId;q('#request-title').textContent=gameId?'Playtest feedback':'Got an idea?';
 q('#request-intro').textContent=gameId?'Tell Rhett what worked, what went wrong, or what could be better.':'Ask for a feature, share a game idea, or tell me what needs fixing.';
 ready=false;q('#request-retry').hidden=true;countdown();q('#request-message').textContent='Connecting…';
 try{
  pendingStatus||=api('status').finally(()=>{pendingStatus=null;});
  const [data,game]=await Promise.all([pendingStatus,nextGame?feedbackGame(nextGame):null]);
  if(stamp!==openRevision)return;
  if(game)q('#request-title').textContent='Playtest feedback for '+game.title;
  retryAt=Math.max(0,data.retryAt);ready=true;countdown();q('#request-message').textContent='';
 }catch(e){if(stamp!==openRevision)return;q('#request-message').textContent=e.message;q('#request-retry').hidden=false;}
 if(requestsVisible())q('#request-name').focus();
}
q('#request-retry').onclick=openRequest;q('#request-letter').oninput=()=>{q('#request-counter').textContent=q('#request-letter').value.length.toLocaleString()+' / 4,000';submissionKey=null;draft();};q('#request-name').oninput=()=>{submissionKey=null;draft();};
q('#request-form').onsubmit=async e=>{e.preventDefault();if(sending||Date.now()<retryAt||!ready)return;const invalid=q('#request-name').value.trim().length<2?q('#request-name'):q('#request-letter').value.trim().length<10?q('#request-letter'):null;if(invalid){q('#request-message').textContent=invalid.id==='request-name'?'Please sign your name using at least 2 characters.':'Please write at least 10 characters so Rhett knows what you mean.';invalid.focus();return;}sending=true;countdown();submissionKey||=crypto.randomUUID();draft();q('#request-message').textContent='Sending your letter…';try{const data=await api('send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:q('#request-name').value,message:q('#request-letter').value,key:submissionKey,gameId:gameId||undefined})});if(data.ok!==true||typeof data.receipt!=='string'||!Number.isFinite(data.createdAt))throw Error('Delivery was not confirmed. Your letter is still here; please retry.');retryAt=data.retryAt;const delivered={id:data.receipt,at:data.createdAt};receipt(delivered);try{localStorage.setItem(RECEIPT,JSON.stringify(delivered));localStorage.setItem('rhetts-request-next',String(retryAt));}catch{}q('#request-message').textContent=gameId?'Playtest feedback delivered. Thanks for testing!':'Request delivered. Thanks for the letter!';loadMine();q('#request-letter').value='';q('#request-counter').textContent='0 / 4,000';submissionKey=null;draft();}catch(error){if(error.retryAt){retryAt=error.retryAt;try{localStorage.setItem('rhetts-request-next',String(retryAt));}catch{}}q('#request-message').textContent=error.message;}finally{sending=false;countdown();if(requestsVisible()&&requestedGame()!==gameId)openRequest();}};
setInterval(()=>{if(new URL(location.href).searchParams.get('view')==='requests')countdown();},1000);addEventListener('storage',e=>{if(e.key==='rhetts-request-next'){retryAt=Math.max(retryAt,Number(e.newValue)||0);countdown();}});
const threads=requestThreads({api,make,onCount:updateNotificationCount});
const inbox=q('#request-inbox'),list=q('#request-inbox-list');let next=null,inboxLoading=false,unread=0,inboxAdmin=false,accessLoading=false,checkingMail=false;
const search=make('input','inbox-search');search.type='search';search.placeholder='Search loaded letters';search.setAttribute('aria-label','Search loaded letters');search.hidden=true;list.before(search);search.oninput=()=>{const term=search.value.trim().toLowerCase();for(const row of list.children)row.hidden=!row.textContent.toLowerCase().includes(term);};
const onlineNote=make('p','inbox-online-note','One online inbox. New requests start as Unread and keep that status until you change it. Opening a letter does not change its status.');q('#request-inbox>header').after(onlineNote);
const newMail=make('button','inbox-new-mail','New requests — show latest');newMail.type='button';newMail.hidden=true;list.before(newMail);newMail.onclick=()=>{search.value='';loadInbox();};
async function checkMailbox(){
 if(checkingMail||inboxLoading||accessLoading||!inboxAdmin)return;
 checkingMail=true;
 try{const data=await api('summary');const changed=unread!==data.unread||!!data.latestId&&list.firstElementChild?.dataset.id!==data.latestId;
  unread=data.unread;q('#inbox-unread').textContent=unread?' · '+unread+' unread':'';
  const busy=!!next||!!search.value||!!list.querySelector('details[open]')||list.contains(document.activeElement);
  if(changed&&!busy)await loadInbox();
  else if(data.latestId&&list.firstElementChild?.dataset.id!==data.latestId){newMail.hidden=false;q('#inbox-status').textContent='New requests have arrived online. Show latest when you are ready.';}
 }catch(error){q('#inbox-status').textContent='Inbox check failed. '+error.message;if(error.status===401||error.status===403){inboxAdmin=false;list.replaceChildren();search.hidden=true;newMail.hidden=true;q('#inbox-sign-in').hidden=false;}}
 finally{checkingMail=false;}
}
async function loadInbox(append=false){if(inboxLoading)return;inboxLoading=true;q('#inbox-status').textContent='Loading requests…';q('#inbox-more').disabled=true;q('#inbox-refresh').disabled=true;try{const data=await api('inbox'+(append&&next?'?before='+next.time+'&id='+encodeURIComponent(next.id):''));const opened=new Set([...list.querySelectorAll('details[open]')].map(el=>el.dataset.id));if(!append){list.replaceChildren();newMail.hidden=true;}unread=data.unread;q('#inbox-unread').textContent=data.unread?' · '+data.unread+' unread':'';for(const letter of data.letters){const details=threads.card(letter,true);details.open=opened.has(letter.id);list.append(details);}next=data.next;q('#inbox-more').hidden=!next;q('#inbox-status').textContent=!list.children.length?'Your online inbox is empty. Letters sent from any browser or network will appear here.':'Up to date · '+new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})+' · Refreshes automatically';search.oninput();}catch(error){q('#inbox-status').textContent=error.message;}finally{inboxLoading=false;q('#inbox-refresh').disabled=false;q('#inbox-more').disabled=false;}}
async function initializeInbox(){if(accessLoading||inboxLoading)return;accessLoading=true;q('#inbox-refresh').hidden=false;try{const data=await api('access');inboxAdmin=data.admin;search.hidden=!data.admin;q('#inbox-sign-in').hidden=data.admin;q('#inbox-sign-in').href=data.signIn;q('#inbox-refresh').hidden=false;if(data.admin)await loadInbox();else{list.replaceChildren();q('#inbox-more').hidden=true;q('#inbox-unread').textContent='';q('#inbox-status').textContent=data.signedIn?'This inbox is private to Rhett’s owner account.':'Sign in with Rhett’s owner ChatGPT account on this browser to open the same online inbox.';}}catch(error){q('#inbox-status').textContent=error.message;}finally{accessLoading=false;}}
q('#inbox-refresh').onclick=initializeInbox;q('#inbox-more').onclick=()=>loadInbox(true);
const inboxVisible=()=>!document.hidden&&!q('#secret-games').hidden;
new MutationObserver(()=>{if(inboxVisible())initializeInbox();}).observe(q('#secret-games'),{attributes:true,attributeFilter:['hidden']});
document.addEventListener('visibilitychange',()=>{if(inboxVisible())initializeInbox();});addEventListener('focus',()=>{if(inboxVisible())initializeInbox();});addEventListener('online',()=>{if(inboxVisible())initializeInbox();if(requestsVisible()&&!ready)openRequest();});
setInterval(()=>{if(inboxVisible())checkMailbox();},30000);
if(inboxVisible())initializeInbox();

const own=make('section','own-requests'),ownHeader=make('header','own-requests-header'),ownRefresh=make('button','','Refresh requests'),ownList=make('div','own-requests-list'),ownStatus=make('p','inbox-online-note'),ownMore=make('button','thread-more','Older requests'),ownNotice=make('button','inbox-new-mail','New updates — refresh requests');ownRefresh.type=ownMore.type=ownNotice.type='button';ownMore.hidden=ownNotice.hidden=true;ownHeader.append(make('h2','','Your requests'),ownRefresh);own.append(ownHeader,make('p','inbox-online-note','Requests sent from this browser appear here. Open a request to read replies and clear its notifications.'),ownStatus,ownNotice,ownList,ownMore);requestPage.append(own);
let ownNext=null,ownLoading=false,notificationChecking=false,lastEventId=0;
const requestsVisible=()=>new URL(location.href).searchParams.get('view')==='requests'&&!q('#library').hidden;
function updateNotificationCount(data){const count=Math.max(0,Number(data.unread)||0),badge=q('#request-notifications');badge.textContent=count>99?'99+':String(count);badge.hidden=!count;q('#request-open').setAttribute('aria-label',count?'Request, '+count+' unread notification'+(count===1?'':'s'):'Request');}
async function loadMine(append=false){if(ownLoading)return;ownLoading=true;ownRefresh.disabled=ownMore.disabled=true;ownStatus.textContent='Loading your requests…';try{const data=await api('mine'+(append&&ownNext?'?before='+ownNext.time+'&id='+encodeURIComponent(ownNext.id):''));if(!append)ownList.replaceChildren();for(const letter of data.letters)ownList.append(threads.card(letter));ownNext=data.next;ownMore.hidden=!ownNext;ownNotice.hidden=true;lastEventId=data.latestEventId||0;updateNotificationCount(data);ownStatus.textContent=ownList.children.length?'':'No requests yet. Send your first letter above.';}catch(error){ownStatus.textContent=error.message;}finally{ownLoading=false;ownRefresh.disabled=ownMore.disabled=false;}}
ownRefresh.onclick=ownNotice.onclick=()=>loadMine();ownMore.onclick=()=>loadMine(true);
async function checkNotifications(){if(notificationChecking||document.hidden)return;notificationChecking=true;try{const data=await api('notifications');updateNotificationCount(data);if(requestsVisible()&&data.latestEventId!==lastEventId){if(!ownList.querySelector('details[open]'))await loadMine();else if(data.unread)ownNotice.hidden=false;}lastEventId=data.latestEventId||0;}catch{}finally{notificationChecking=false;}}
window.arcadeRequests={page:requestPage,open(){requestPage.hidden=false;openRequest();loadMine();}};
window.dispatchEvent(new Event('arcade-requests-ready'));
addEventListener('arcade-request-read',()=>checkMailbox());
setInterval(checkNotifications,30000);addEventListener('focus',checkNotifications);addEventListener('online',checkNotifications);document.addEventListener('visibilitychange',checkNotifications);checkNotifications();
