export const requestStatusSQL="COALESCE((SELECT value FROM arcade_request_events e WHERE e.request_id=r.id AND e.kind='status' ORDER BY e.id DESC LIMIT 1),'Unread')";
const lastEventSQL='COALESCE((SELECT MAX(id) FROM arcade_request_events e WHERE e.request_id=r.id),0)';
const unreadSQL='(SELECT COUNT(*) FROM arcade_request_events e WHERE e.request_id=r.id AND e.seen_at IS NULL)';
export async function handleRequestUpdates({request,url,action,db,now,admin,identity,reply,keyed,env,data}){
 if(!['mine','notifications','thread','seen','update'].includes(action))return;
 const sender=await identity(request,env);
 const counts=async()=>{if(!sender)return {unread:0,latestEventId:0};const row=await db.prepare('SELECT COUNT(CASE WHEN e.seen_at IS NULL THEN 1 END) AS unread,COALESCE(MAX(e.id),0) AS latestEventId FROM arcade_request_events e JOIN arcade_requests r ON r.id=e.request_id WHERE r.sender_hash=?').bind(sender.sender).first();return row;};
 if(action==='notifications'&&request.method==='GET')return reply(await counts());
 if(action==='mine'&&request.method==='GET'){
  if(!sender)return reply({letters:[],next:null,unread:0});
  const time=Number(url.searchParams.get('before'))||now+1,id=(url.searchParams.get('id')||'').slice(0,64);
  const rows=await db.prepare(`SELECT r.id,r.name,r.message,r.created_at,r.read_at,p.game_id,p.game_title,${requestStatusSQL} AS status,${unreadSQL} AS notifications,${lastEventSQL} AS latest_event_id FROM arcade_requests r LEFT JOIN arcade_playtest_requests p ON p.request_id=r.id WHERE r.sender_hash=? AND (r.created_at<? OR (r.created_at=? AND r.id<?)) ORDER BY r.created_at DESC,r.id DESC LIMIT 31`).bind(sender.sender,time,time,id).all();
  const letters=rows.results||[];return reply({letters:letters.slice(0,30),next:letters.length>30?{time:letters[29].created_at,id:letters[29].id}:null,...await counts()});
 }
 const id=request.method==='GET'?url.searchParams.get('id'):data?.id;
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))return reply({message:'Choose a valid request.'},400);
 const row=await db.prepare(`SELECT r.id,r.name,r.message,r.created_at,r.read_at,p.game_id,p.game_title,${requestStatusSQL} AS status,${lastEventSQL} AS latest_event_id FROM arcade_requests r LEFT JOIN arcade_playtest_requests p ON p.request_id=r.id WHERE r.id=?${admin?'':' AND r.sender_hash=?'}`).bind(...(admin?[id]:[id,sender?.sender||''])).first();
 if(!row)return reply({message:'This request is unavailable.'},404);
 if(action==='thread'&&request.method==='GET'){
  const before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER;
  const rows=(await db.prepare('SELECT id,kind,value,created_at,seen_at FROM arcade_request_events WHERE request_id=? AND id<? ORDER BY id DESC LIMIT 51').bind(id,before).all()).results||[];
  return reply({letter:row,events:rows.slice(0,50).reverse(),next:rows.length>50?rows[49].id:null});
 }
 if(request.method!=='POST')return reply({message:'Unsupported request.'},405);
 if(action==='seen'){
  // Owner access never acknowledges notifications on the sender's behalf.
  const owned=sender&&await db.prepare('SELECT id FROM arcade_requests WHERE id=? AND sender_hash=?').bind(id,sender.sender).first();
  if(!owned)return reply({message:'This request is unavailable.'},404);
  if(!Number.isSafeInteger(data.upTo)||data.upTo<0)return reply({message:'Refresh this request and try again.'},400);
  await db.prepare('UPDATE arcade_request_events SET seen_at=COALESCE(seen_at,?) WHERE request_id=? AND id<=?').bind(now,id,Math.min(data.upTo,row.latest_event_id)).run();return reply({ok:true,...await counts()});
 }
 if(action==='update'){
  if(!admin)return reply({message:'Only Rhett can reply or change a request status.'},403);
  if(!['reply','status'].includes(data.kind)||typeof data.key!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(data.key))return reply({message:'Refresh this request and try again.'},400);
  const value=typeof data.value==='string'?data.value.trim():'';
  if(data.kind==='status'&&!['Unread','In Progress','Released'].includes(value))return reply({message:'Choose Unread, In Progress or Released.'},400);
  if(data.kind==='reply'&&(!value||value.length>4000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)))return reply({message:'Write a reply between 1 and 4,000 characters.'},400);
  const key=await keyed('request-event:'+id+':'+data.key,env.SAVE_VAULT_PEPPER);
  const old=await db.prepare('SELECT id,kind,value FROM arcade_request_events WHERE event_key=?').bind(key).first();
  if(old){if(old.kind!==data.kind||old.value!==value)return reply({message:'This update changed while sending. Please send it again.'},409);return reply({ok:true,eventId:old.id});}
  const event=await db.prepare(`INSERT INTO arcade_request_events (event_key,request_id,kind,value,created_at) SELECT ?,?,?,?,? WHERE ?!='status' OR ?!=COALESCE((SELECT value FROM arcade_request_events WHERE request_id=? AND kind='status' ORDER BY id DESC LIMIT 1),'Unread') ON CONFLICT(event_key) DO NOTHING RETURNING id`).bind(key,id,data.kind,value,now,data.kind,value,id).first();
  const stored=event||await db.prepare('SELECT id FROM arcade_request_events WHERE event_key=?').bind(key).first();return reply({ok:true,eventId:stored?.id||null,unchanged:!stored});
 }
 return reply({message:'Unsupported request.'},405);
}
