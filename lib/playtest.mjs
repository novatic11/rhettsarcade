import {isArcadeOwner} from './arcade-owner.mjs';
import {readGameRelease,releaseableGame,releasedGameMetadata} from './playtest-releases.mjs';

const encoder=new TextEncoder();
const ttl=8*60*60;
const cookieName='arcade_playtest_session';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{...headers,...extra}});
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function sign(env,text){
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.SAVE_VAULT_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,encoder.encode('arcade-playtest-v1\0'+env.PLAYTEST_PASSWORD+'\0'+text)));
}
function equal(a,b){if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
const now=()=>Math.floor(Date.now()/1000);
const configured=env=>!!(env.PLAYTEST_PASSWORD&&env.SAVE_VAULT_PEPPER);
const cookie=(value,age)=>cookieName+'='+value+'; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age='+age;
export async function canPlaytest(request,env){
 if(isArcadeOwner(request,env))return true;
 if(!configured(env))return false;
 const value=request.headers.get('cookie')?.split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
 const m=/^(\d{10})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(value);
 return !!(m&&Number(m[1])>now()&&equal(m[3],await sign(env,m[1]+'.'+m[2])));
}
async function readPassword(request){
 const reader=request.body?.getReader();if(!reader)return null;
 const decoder=new TextDecoder();let size=0,body='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512){await reader.cancel();return null;}body+=decoder.decode(value,{stream:true});}return JSON.parse(body+decoder.decode())?.password;}catch{return null;}
}
export async function handlePlaytest(request,env,catalog){
 const url=new URL(request.url),action=url.pathname.split('/').at(-1);
 const owner=isArcadeOwner(request,env);
 if(action==='catalog'&&request.method==='GET'){
  if(await canPlaytest(request,env))return json({games:catalog,...(owner?{owner:true}:{})});
  return configured(env)?json({message:'Unlock Playtest first.'},401):json({message:'Playtest is temporarily unavailable.'},503);
 }
 if(!configured(env))return json({message:'Playtest is temporarily unavailable.'},503);
 if(request.method==='POST'){
  if(request.headers.get('sec-fetch-site')==='cross-site'||request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({message:'Open Playtest from the arcade.'},403);
  if(action==='lock')return json({ok:true},200,{'Set-Cookie':cookie('',0)});
  if(action==='unlock'){
   const password=await readPassword(request);
   if(typeof password!=='string'||!equal(await sign(env,password),await sign(env,env.PLAYTEST_PASSWORD)))return json({message:'That password is incorrect.'},403);
   const data=(now()+ttl)+'.'+crypto.randomUUID();
   return json({games:catalog,...(owner?{owner:true}:{})},200,{'Set-Cookie':cookie(data+'.'+await sign(env,data),ttl)});
  }
 }
 return json({message:'Not found.'},404);
}
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',ico:'image/x-icon',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',wasm:'application/wasm',woff2:'font/woff2'};
export async function servePlaytestAsset(request,env,assets,catalog=[]){
 let name;try{name=decodeURIComponent(new URL(request.url).pathname.slice('/api/playtest/game/'.length));}catch{return new Response('Not found',{status:404,headers});}
 if(!await canPlaytest(request,env)){
  const gameId=name.split('/')[0];
  const game=catalog.find(entry=>entry.id===gameId&&releaseableGame(entry))||await releasedGameMetadata(env.DB,gameId);
  const release=game&&await readGameRelease(env.DB,game.id);
  const cover=game?.cover==='/api/playtest/game/'+name&&/\.(svg|png|jpe?g|webp|gif)$/i.test(name);
  if(!release||(!cover&&release.release_at>Date.now())){
   return new Response('Unlock Playtest in Rhett’s Arcade first.',{status:401,headers});
  }
 }
 if(!Object.hasOwn(assets,name))return new Response('Not found',{status:404,headers});
 const bytes=Buffer.from(assets[name],'base64');
 return new Response(bytes,{headers:{...headers,'Content-Type':types[name.split('.').at(-1).toLowerCase()]||'application/octet-stream','Cross-Origin-Resource-Policy':'same-origin'}});
}
import {Buffer} from 'node:buffer';
