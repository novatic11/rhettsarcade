import {decodeSaveCode} from '../public/save-code.js';
const COOKIE='arcade_save_session',TTL=30*24*60*60*1000,MAX=1500000;
const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
async function keyed(value,pepper){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)));
}
function fail(status,message){throw Object.assign(Error(message),{status});}
function reply(data,status=200,cookie){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});}
function cookie(request,token,clear=false){return `${COOKIE}=${token}; Path=/api/saves; HttpOnly; SameSite=Strict; Max-Age=${clear?0:TTL/1000}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export function validatePassword(value){if(typeof value!=='string'||!/^[A-Za-z]{2,64}$/.test(value))fail(400,'Use 2–64 letters only (A–Z). Capitals count as different letters.');return value;}
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send a JSON request.');
  const reader=request.body?.getReader();if(!reader)fail(400,'Missing request.');let size=0,parts=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX+8192){await reader.cancel();fail(413,'These saves are too large to sync. Your browser progress is safe.');}parts.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'Invalid request.');}
}
async function validatePayload(payload){if(typeof payload!=='string'||payload.length>MAX)fail(413,'These saves are too large to sync. Your browser progress is safe.');try{await decodeSaveCode(payload);}catch{fail(400,'The save data could not be checked. Your browser progress is safe.');}return payload;}
async function limit(db,key,max,windowMs){
  const now=Date.now(),bucket=Math.floor(now/windowMs),id=`${key}:${bucket}`;
  const row=await db.prepare('INSERT INTO save_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(id,now+windowMs*2).first();
  if(row.count>max)fail(429,'Too many attempts. Please wait a few minutes and try again.');
}
async function authenticated(request,db){
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if(!token||!/^[a-f0-9]{64}$/.test(token))fail(401,'Enter your save password to reconnect.');
  const row=await db.prepare('SELECT v.id,v.payload,v.revision,v.updated_at FROM save_sessions s JOIN save_vaults v ON v.id=s.vault_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token),Date.now()).first();
  if(!row)fail(401,'Enter your save password to reconnect.');return row;
}
const snapshot=row=>({id:row.id,payload:row.payload,revision:row.revision,updatedAt:row.updated_at});
async function session(db,id){const token=random();await db.prepare('INSERT INTO save_sessions (token_hash,vault_id,expires_at) VALUES (?,?,?)').bind(await hash(token),id,Date.now()+TTL).run();return token;}
export async function handleVault(request,env){
  try{
    const url=new URL(request.url),action=url.pathname.split('/').pop(),db=env.DB;
    if(!db||!env.SAVE_VAULT_PEPPER)fail(503,'Online saves are temporarily unavailable. Your browser progress is safe.');
    if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin))fail(403,'Open saves from the arcade itself.');
    if(request.method==='GET'&&action==='session')return reply(snapshot(await authenticated(request,db)));
    if(request.method!=='POST')fail(405,'Unsupported request.');
    const data=await body(request);
    if(['check','claim','load','connect'].includes(action)){
      const password=validatePassword(data.password);
      const ip=await keyed('ip:'+ (request.headers.get('cf-connecting-ip')||'local'),env.SAVE_VAULT_PEPPER);
      await limit(db,'auth:'+ip,30,15*60*1000);
      const key=await keyed('password:'+password,env.SAVE_VAULT_PEPPER);
      if(action==='check'){const found=await db.prepare('SELECT id FROM save_vaults WHERE password_key=?').bind(key).first();return reply({available:!found});}
      if(action==='claim'){
        if(data.confirmed!==true)fail(400,'Confirm this password before attaching your saves.');
        const payload=await validatePayload(data.payload),id=crypto.randomUUID(),now=Date.now();
        const row=await db.prepare('INSERT INTO save_vaults (id,password_key,payload,revision,updated_at) VALUES (?,?,?,1,?) ON CONFLICT(password_key) DO NOTHING RETURNING id').bind(id,key,payload,now).first();
        if(!row)fail(409,'That password is taken. Choose another one.');
        const token=await session(db,id);return reply({id,revision:1,updatedAt:now},201,cookie(request,token));
      }
      const row=await db.prepare('SELECT id,payload,revision,updated_at FROM save_vaults WHERE password_key=?').bind(key).first();
      if(!row)fail(404,'No saves use that password. Check the letters and capitals.');
      if(action==='load')return reply(snapshot(row));
      if(data.confirmed!==true||data.revision!==row.revision)fail(409,'These linked saves changed. Check the password again to review the latest copy.');
      return reply(snapshot(row),200,cookie(request,await session(db,row.id)));
    }
    const row=await authenticated(request,db);
    if(action==='leave'){
      const token=request.headers.get('cookie').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'=')).slice(COOKIE.length+1);
      await db.prepare('DELETE FROM save_sessions WHERE token_hash=?').bind(await hash(token)).run();return reply({ok:true},200,cookie(request,'',true));
    }
    if(action==='sync'){
      await limit(db,'write:'+row.id,120,60*1000);
      if(data.id!==row.id||!Number.isSafeInteger(data.revision)||data.revision!==row.revision)fail(409,'Linked saves changed on another device. Choose which progress to keep.');
      const payload=await validatePayload(data.payload),now=Date.now();
      const updated=await db.prepare('UPDATE save_vaults SET payload=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING revision').bind(payload,now,row.id,data.revision).first();
      if(!updated)fail(409,'Linked saves changed on another device. Choose which progress to keep.');
      // Best-effort bounded housekeeping does not turn a successful save into a retry.
      await db.batch([db.prepare('DELETE FROM save_sessions WHERE token_hash IN (SELECT token_hash FROM save_sessions WHERE expires_at<? LIMIT 100)').bind(now),db.prepare('DELETE FROM save_limits WHERE key IN (SELECT key FROM save_limits WHERE expires_at<? LIMIT 100)').bind(now)]).catch(()=>{});
      return reply({id:row.id,revision:updated.revision,updatedAt:now});
    }
    fail(404,'Unknown save action.');
  }catch(e){return reply({message:e.status?e.message:'Online saves are temporarily unavailable. Your browser progress is safe.'},e.status||503);}
}
