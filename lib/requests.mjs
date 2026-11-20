import {handleRequestUpdates,requestStatusSQL} from './request-updates.mjs';
import {canPlaytest} from './playtest.mjs';
export {isArcadeOwner as isRequestAdmin} from './arcade-owner.mjs';
import {isArcadeOwner as isRequestAdmin} from './arcade-owner.mjs';
const WAIT=120000,COOKIE='arcade_request_sender';
const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
async function keyed(value,pepper){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));}
export function validateLetter(data){const name=typeof data?.name==='string'?data.name.trim():'',message=typeof data?.message==='string'?data.message.trim():'';if(name.length<2||name.length>60||/[\u0000-\u001f\u007f]/.test(name))throw Object.assign(Error('Sign your name using 2–60 characters.'),{status:400});if(message.length<10||message.length>4000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(message))throw Object.assign(Error('Write a request between 10 and 4,000 characters.'),{status:400});if(typeof data.key!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(data.key))throw Object.assign(Error('Reopen the request form and try again.'),{status:400});return {name,message,key:data.key};}
function reply(data,status=200,cookie){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});}
async function ensure(db){await db.exec('CREATE TABLE IF NOT EXISTS arcade_requests (id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, sender_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, name TEXT NOT NULL, message TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER); CREATE INDEX IF NOT EXISTS arcade_requests_sender ON arcade_requests(sender_hash,created_at); CREATE INDEX IF NOT EXISTS arcade_requests_created ON arcade_requests(created_at DESC); CREATE INDEX IF NOT EXISTS arcade_requests_ip ON arcade_requests(ip_hash,created_at); CREATE TABLE IF NOT EXISTS arcade_playtest_requests (request_id TEXT PRIMARY KEY REFERENCES arcade_requests(id), game_id TEXT NOT NULL, game_title TEXT NOT NULL);');}
async function identity(request,env,create=false){let raw=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1),token=raw?.split('.')[0],valid=/^[a-f0-9]{32}$/.test(token||'')&&raw===token+'.'+await keyed('request-cookie:'+token,env.SAVE_VAULT_PEPPER);if(!valid&&!create)return null;let cookie;if(!valid){token=hex(crypto.getRandomValues(new Uint8Array(16)));raw=token+'.'+await keyed('request-cookie:'+token,env.SAVE_VAULT_PEPPER);cookie=`${COOKIE}=${raw}; Path=/api/requests; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`;}return {sender:await keyed('request-sender:'+token,env.SAVE_VAULT_PEPPER),cookie};}
export async function handleRequests(request,env,playtestCatalog=[]){try{
 const url=new URL(request.url),action=url.pathname.split('/').pop(),db=env.DB;
 if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return reply({message:'Open Requests from the arcade itself.'},403);
 const admin=isRequestAdmin(request,env);
 if(action==='access'&&request.method==='GET')return reply({admin,signedIn:!!request.headers.get('oai-authenticated-user-id'),signIn:'/signin-with-chatgpt?return_to=%2F%3Fworkshop%3D1%26inbox%3D1'});
 if(!db||!env.SAVE_VAULT_PEPPER)return reply({message:'Requests are temporarily unavailable. Your letter has not been sent.'},503);
 if(['inbox','summary','read','update'].includes(action)&&!admin)return reply({message:'This inbox is private to Rhett’s owner account.'},request.headers.get('oai-authenticated-user-id')?403:401);
 await ensure(db);const now=Date.now();
 if(request.method==='GET'){const result=await handleRequestUpdates({request,url,action,db,now,admin,identity,reply,keyed,env});if(result)return result;}
 if(action==='summary'&&request.method==='GET'){const counts=await db.prepare('SELECT COUNT(*) AS total,COALESCE(SUM(read_at IS NULL),0) AS unread FROM arcade_requests').first(),latest=await db.prepare('SELECT id FROM arcade_requests ORDER BY created_at DESC,id DESC LIMIT 1').first();return reply({total:counts.total,unread:counts.unread,latestId:latest?.id||null,storage:'online'});}
 if(action==='status'&&request.method==='GET'){const sender=await identity(request,env,true),row=await db.prepare('SELECT MAX(created_at) AS latest FROM arcade_requests WHERE sender_hash=?').bind(sender.sender).first();return reply({retryAt:Math.max(0,(row?.latest||0)+WAIT),waitMs:WAIT},200,sender.cookie);}
 if(action==='inbox'&&request.method==='GET'){const cursor=Number(url.searchParams.get('before'))||now+1,beforeId=(url.searchParams.get('id')||'').slice(0,64),rows=await db.prepare('SELECT r.id,r.name,r.message,r.created_at,r.read_at,p.game_id,p.game_title,'+requestStatusSQL+' AS status FROM arcade_requests r LEFT JOIN arcade_playtest_requests p ON p.request_id=r.id WHERE r.created_at<? OR (r.created_at=? AND r.id<?) ORDER BY r.created_at DESC,r.id DESC LIMIT 31').bind(cursor,cursor,beforeId).all(),unread=await db.prepare('SELECT COUNT(*) AS count FROM arcade_requests WHERE read_at IS NULL').first(),list=rows.results||[];return reply({letters:list.slice(0,30),unread:unread.count,next:list.length>30?{time:list[29].created_at,id:list[29].id}:null});}
 if(request.method!=='POST')return reply({message:'Unsupported request.'},405);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({message:'Use the arcade’s request form.'},415);
 const reader=request.body?.getReader();if(!reader)return reply({message:'Missing request.'},400);let text='',size=0;const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>18000){await reader.cancel();return reply({message:'That request is too long.'},413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}let data;try{data=JSON.parse(text);}catch{return reply({message:'The request could not be read.'},400);}
 const updateResult=await handleRequestUpdates({request,url,action,db,now,admin,identity,reply,keyed,env,data});if(updateResult)return updateResult;
 if(action==='read'){if(typeof data.id!=='string'||data.id.length>64)return reply({message:'Choose a valid letter.'},400);await db.prepare('UPDATE arcade_requests SET read_at=COALESCE(read_at,?) WHERE id=?').bind(now,data.id).run();return reply({ok:true});}
 if(action!=='send')return reply({message:'Unsupported request.'},404);
 const letter=validateLetter(data),sender=await identity(request,env);if(!sender)return reply({message:'Reopen the request form before sending.'},400);
 const requestKey=await keyed(sender.sender+':'+letter.key,env.SAVE_VAULT_PEPPER),old=await db.prepare('SELECT id,created_at FROM arcade_requests WHERE request_key=? AND sender_hash=?').bind(requestKey,sender.sender).first();if(old)return reply({ok:true,receipt:old.id,createdAt:old.created_at,retryAt:old.created_at+WAIT});
 let playtestGame=null;
 if(data.gameId!==undefined){
  if(!await canPlaytest(request,env))return reply({message:'Unlock Playtest before sending feedback. Your draft is saved.'},403);
  playtestGame=playtestCatalog.find(game=>game.id===data.gameId);
  if(!playtestGame)return reply({message:'Choose a current game from the Playtest tab.'},400);
 }
 const ip=await keyed('requests-ip:'+(request.headers.get('cf-connecting-ip')||sender.sender),env.SAVE_VAULT_PEPPER),id=crypto.randomUUID();
 // A shared school or home network must not act as a single sender.
 const insert=db.prepare('INSERT INTO arcade_requests (id,request_key,sender_hash,ip_hash,name,message,created_at) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM arcade_requests WHERE sender_hash=? AND created_at>?) AND (SELECT COUNT(*) FROM arcade_requests WHERE ip_hash=? AND created_at>?)<300 ON CONFLICT(request_key) DO NOTHING RETURNING id').bind(id,requestKey,sender.sender,ip,letter.name,letter.message,now,sender.sender,now-WAIT,ip,now-3600000);
 let row;
 if(playtestGame){
  const tag=db.prepare('INSERT INTO arcade_playtest_requests (request_id,game_id,game_title) SELECT id,?,? FROM arcade_requests WHERE id=?').bind(playtestGame.id,playtestGame.title,id);
  const [inserted]=await db.batch([insert,tag]);
  row=inserted.results?.[0];
 }else row=await insert.first();
 if(!row){const duplicate=await db.prepare('SELECT id,created_at FROM arcade_requests WHERE request_key=? AND sender_hash=?').bind(requestKey,sender.sender).first();if(duplicate)return reply({ok:true,receipt:duplicate.id,createdAt:duplicate.created_at,retryAt:duplicate.created_at+WAIT});const latest=await db.prepare('SELECT MAX(created_at) AS latest FROM arcade_requests WHERE sender_hash=?').bind(sender.sender).first();if(latest?.latest>now-WAIT)return reply({message:'Please wait two minutes between requests.',retryAt:latest.latest+WAIT},429);const network=await db.prepare('SELECT MIN(created_at) AS earliest FROM arcade_requests WHERE ip_hash=? AND created_at>?').bind(ip,now-3600000).first();return reply({message:'This network has sent many requests. Your draft is safe; please try again later.',retryAt:Math.max(now+1000,(network?.earliest||now)+3600000)},429);}
 const stored=await db.prepare('SELECT id,created_at FROM arcade_requests WHERE request_key=? AND sender_hash=?').bind(requestKey,sender.sender).first();
 if(!stored)return reply({message:'Delivery could not be confirmed. Please retry the same letter.'},503);
 return reply({ok:true,receipt:stored.id,createdAt:stored.created_at,retryAt:stored.created_at+WAIT},201);
 }catch(error){return reply({message:error.status?error.message:'Requests could not be reached. Your letter has not been cleared.'},error.status||503);}}
