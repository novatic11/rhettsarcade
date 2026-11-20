export function requestThreads({api,make,onCount}){
 const post=(action,data)=>api(action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const date=value=>new Date(value).toLocaleString();
 const statusNode=value=>make('span','request-state state-'+value.toLowerCase().replaceAll(' ','-'),value);
 function card(letter,admin=false){
  const details=make('details','request-letter'+(admin&&!letter.read_at?' unread':'')),summary=make('summary'),copy=make('span','request-summary-copy'),title=make('b','',admin?letter.name:letter.message.slice(0,90)),state=statusNode(letter.status||'Unread'),meta=make('span','request-summary-meta'),time=make('time','',date(letter.created_at)),badge=make('span','request-notification-count',letter.notifications||'');badge.hidden=!letter.notifications;
  meta.append(state,badge,time);copy.append(title);if(!admin)copy.append(make('small','',letter.name));
  if(letter.game_title)copy.append(make('span','request-playtest-tag','Playtest · '+letter.game_title));
  summary.append(copy,meta);details.dataset.id=letter.id;details.append(summary,make('p','request-original',letter.message),make('small','inbox-receipt','Receipt '+letter.id));
  const history=make('div','request-timeline'),notice=make('p','thread-notice'),more=make('button','thread-more','Earlier updates'),refresh=make('button','thread-refresh','Refresh conversation');more.type=refresh.type='button';more.hidden=true;details.append(history,more,refresh,notice);
  let loading=false,next=null,loaded=false,seen=false;
  async function load(older=false){if(loading)return;loading=true;refresh.disabled=more.disabled=true;notice.textContent='Loading conversation…';try{const data=await api('thread?id='+encodeURIComponent(letter.id)+(older&&next?'&before='+next:''));state.textContent=data.letter.status;state.className=statusNode(data.letter.status).className;const fragment=document.createDocumentFragment();for(const event of data.events){const row=make('article','request-event event-'+event.kind),heading=make('div','event-heading');heading.append(make('b','',event.kind==='reply'?'Rhett replied':'Status update'),make('time','',date(event.created_at)));row.append(heading,event.kind==='reply'?make('p','',event.value):statusNode(event.value));fragment.append(row);}if(older)history.prepend(fragment);else history.replaceChildren(fragment);next=data.next;more.hidden=!next;loaded=true;notice.textContent=history.children.length?'':'No replies or status updates yet.';
    if(!admin){const counts=await post('seen',{id:letter.id,upTo:Math.max(0,...data.events.map(event=>event.id))});badge.hidden=true;onCount(counts);seen=true;}
   }catch(error){notice.textContent=error.message;}finally{loading=false;refresh.disabled=more.disabled=false;}}
  refresh.onclick=()=>load();more.onclick=()=>load(true);
  details.addEventListener('toggle',async()=>{if(!details.open)return;if(!loaded||!seen)await load();if(admin&&details.classList.contains('unread'))try{await post('read',{id:letter.id});details.classList.remove('unread');window.dispatchEvent(new Event('arcade-request-read'));}catch(error){notice.textContent=error.message;}});
  if(admin){
   const controls=make('div','request-owner-controls'),label=make('label','','Status'),select=make('select'),save=make('button','','Update status');select.setAttribute('aria-label','Request status');for(const value of ['Unread','In Progress','Released']){const option=make('option','',value);option.value=value;select.append(option);}select.value=letter.status||'Unread';save.type='button';label.append(select);controls.append(label,save);
   const form=make('form','request-reply-form'),replyLabel=make('label','','Reply to '+letter.name),text=make('textarea');text.rows=4;text.maxLength=4000;text.required=true;text.placeholder='Write a reply…';text.setAttribute('aria-label','Reply to '+letter.name);replyLabel.append(text);const send=make('button','','Send reply');send.type='submit';form.append(replyLabel,send);details.append(controls,form);
   const draftKey='rhetts-request-reply-'+letter.id;let replyKey=null,statusKey=null,statusValue=null,busy=false;
   try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft){text.value=draft.value||'';replyKey=draft.key||null;}}catch{}
   const remember=()=>{try{localStorage.setItem(draftKey,JSON.stringify({value:text.value,key:replyKey}));}catch{}};
   text.oninput=()=>{replyKey=null;remember();};
   async function update(kind,value,key){if(busy)return false;busy=true;send.disabled=save.disabled=select.disabled=text.disabled=true;notice.textContent='Sending update…';try{await post('update',{id:letter.id,kind,value,key});await load();notice.textContent=kind==='reply'?'Reply sent.':state.textContent===value?'Status saved.':'Status updated.';return true;}catch(error){notice.textContent=error.message;return false;}finally{busy=false;send.disabled=save.disabled=select.disabled=text.disabled=false;}}
   save.onclick=async()=>{if(!statusKey||statusValue!==select.value){statusValue=select.value;statusKey=crypto.randomUUID();}if(await update('status',select.value,statusKey))statusKey=null;};
   form.onsubmit=async event=>{event.preventDefault();if(!text.value.trim()||busy)return;replyKey||=crypto.randomUUID();remember();if(await update('reply',text.value,replyKey)){text.value='';replyKey=null;remember();}};
  }
  return details;
 }
 return {card};
}
