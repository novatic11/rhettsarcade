import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {handleRequests,validateLetter,isRequestAdmin} from '../lib/requests.mjs';
import {handlePlaytest} from '../lib/playtest.mjs';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
function database(filename=':memory:',migrated=true){const sql=new DatabaseSync(filename);if(migrated&&!sql.prepare("SELECT name FROM sqlite_master WHERE name='arcade_request_events'").get())sql.exec(fs.readFileSync(new URL('../drizzle/0001_large_archangel.sql',import.meta.url),'utf8'));return {sql,async exec(query){sql.exec(query);},prepare(query){const wrap=args=>({bind(...values){return wrap(values);},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}});return wrap([]);}};}
test('signed letters reach only the owner inbox; cooldown survives reloads and simultaneous submissions',async t=>{
 let now=1800000000000;t.mock.method(Date,'now',()=>now);const DB=database(),env={DB,SAVE_VAULT_PEPPER:'test-secret',REQUEST_ADMIN_EMAILS:'owner@example.test'},origin='https://arcade.example';
 async function call(action,data,cookie='',owner=false,other={}){const response=await handleRequests(new Request(origin+'/api/requests/'+action,{method:data?'POST':'GET',headers:{origin,'Content-Type':'application/json',cookie,...(owner?{'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@example.test'}:{}),...other},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 const status=await call('status');assert(status.cookie);const cookie=status.cookie,letter={name:'A Player',message:'Please add a racing game with drifting.',key:crypto.randomUUID()};assert.equal((await call('inbox')).status,401);assert.equal((await call('inbox',null,cookie,false,{'oai-authenticated-user-id':'other','oai-authenticated-user-email':'other@example.test'})).status,403);
 const sent=await call('send',letter,cookie);assert.equal(sent.status,201);assert.equal(sent.data.retryAt,now+120000);assert.equal(sent.data.createdAt,now);assert.match(sent.data.receipt,/^[a-f0-9-]{36}$/);const retried=await call('send',letter,cookie);assert.equal(retried.status,200);assert.equal(retried.data.receipt,sent.data.receipt);assert.equal(DB.sql.prepare('SELECT id FROM arcade_requests').get().id,sent.data.receipt);assert.equal((await call('send',{...letter,key:crypto.randomUUID()},cookie)).status,429);assert.equal((await call('status',null,cookie)).data.retryAt,now+120000);
 const inbox=await call('inbox',null,'',true);assert.equal(inbox.data.letters.length,1);assert.equal(inbox.data.letters[0].name,'A Player');assert.equal(inbox.data.unread,1);assert.equal((await call('read',{id:inbox.data.letters[0].id},'',true)).status,200);assert.equal((await call('inbox',null,'',true)).data.unread,0);
 now+=120001;const race=await Promise.all([call('send',{...letter,key:crypto.randomUUID()},cookie),call('send',{...letter,key:crypto.randomUUID()},cookie)]);assert.deepEqual(race.map(r=>r.status).sort(),[201,429]);assert.equal((await call('inbox',null,'',true)).data.letters.length,2);
 assert.equal((await call('send',{...letter,key:crypto.randomUUID()},cookie,false,{origin:'https://elsewhere.example'})).status,403);assert.equal((await call('send',letter,cookie.replace(/.$/,'Z'))).status,400);DB.sql.close();
});
test('letter validation bounds name, body and idempotency identifiers, and access fails closed',()=>{
 const base={name:'Player',message:'A useful game request',key:crypto.randomUUID()};assert.deepEqual(validateLetter(base),base);for(const data of [{...base,name:''},{...base,message:'short'},{...base,message:'x'.repeat(4001)},{...base,name:'Name\nOther'},{...base,key:'bad'}])assert.throws(()=>validateLetter(data));assert(!isRequestAdmin(new Request('https://arcade.example'),{}));
});

test('separate senders, networks and owner browsers share durable mail and read state after a server restart',async t=>{
 const filename=path.join(os.tmpdir(),'arcade-mail-'+crypto.randomUUID()+'.sqlite');let DB=database(filename);t.after(()=>{DB.sql.close();fs.unlinkSync(filename);});let now=1800000000000;t.mock.method(Date,'now',()=>now);
 const env={DB,SAVE_VAULT_PEPPER:'durable-test',REQUEST_ADMIN_EMAILS:'owner@example.test'},origin='https://arcade.example';
 async function call(action,{cookie='',ip='192.0.2.1',owner=false,data}={}){const response=await handleRequests(new Request(origin+'/api/requests/'+action,{method:data?'POST':'GET',headers:{origin,cookie,'Content-Type':'application/json','cf-connecting-ip':ip,...(owner?{'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@example.test'}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],cache:response.headers.get('cache-control')};}
 const a=(await call('status')).cookie,b=(await call('status',{ip:'198.51.100.8'})).cookie;assert.notEqual(a,b);
 const letter={name:'Browser A',message:'A letter from a completely separate browser.',key:crypto.randomUUID()};const sentA=await call('send',{cookie:a,data:letter});const sentB=await call('send',{cookie:b,ip:'198.51.100.8',data:{...letter,name:'Browser B'}});assert.equal(sentA.status,201);assert.equal(sentB.status,201);assert.notEqual(sentA.data.receipt,sentB.data.receipt);
 // Switching Wi-Fi never changes delivery or bypasses the sender cooldown.
 assert.equal((await call('send',{cookie:a,ip:'203.0.113.2',data:letter})).data.receipt,sentA.data.receipt);assert.equal((await call('send',{cookie:a,ip:'203.0.113.2',data:{...letter,key:crypto.randomUUID()}})).status,429);
 assert.equal((await call('summary')).status,401);const ownerA=await call('inbox',{owner:true,ip:'203.0.113.10'}),ownerB=await call('inbox',{owner:true,ip:'203.0.113.20'});assert.deepEqual(ownerA.data,ownerB.data);assert.equal(ownerA.data.letters.length,2);assert.match(ownerA.cache,/no-store/);
 await call('read',{owner:true,data:{id:sentA.data.receipt}});assert.equal((await call('summary',{owner:true,ip:'198.51.100.99'})).data.unread,1);
 // Neither the sender nor owner needs to stay online. Reopen the same durable store.
 DB.sql.close();DB=database(filename);env.DB=DB;const after=await call('inbox',{owner:true,ip:'192.0.2.200'});assert.equal(after.data.letters.length,2);assert(after.data.letters.find(r=>r.id===sentA.data.receipt).read_at);assert.equal(after.data.unread,1);
});

test('a busy shared Wi-Fi permits independent senders and paginates same-time letters without loss',async t=>{
 const DB=database();t.after(()=>DB.sql.close());const env={DB,SAVE_VAULT_PEPPER:'shared-wifi-test',REQUEST_ADMIN_EMAILS:'owner@example.test'},origin='https://arcade.example';let now=1800000000000;t.mock.method(Date,'now',()=>now);
 async function call(action,data,cookie='',owner=false){const r=await handleRequests(new Request(origin+'/api/requests/'+action,{method:data?'POST':'GET',headers:{origin,cookie,'cf-connecting-ip':'192.0.2.44','Content-Type':'application/json',...(owner?{'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@example.test'}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 for(let n=0;n<35;n++){const sender=await call('status');assert.equal((await call('send',{name:'Player '+n,message:'A request from another person on school Wi-Fi.',key:crypto.randomUUID()},sender.cookie)).status,201);}
 const summary=(await call('summary',null,'',true)).data;assert.equal(summary.total,35);assert.equal(summary.unread,35);assert.equal(summary.storage,'online');const first=(await call('inbox',null,'',true)).data;assert.equal(first.letters.length,30);const second=(await call('inbox?before='+first.next.time+'&id='+first.next.id,null,'',true)).data;assert.equal(second.letters.length,5);assert.equal(new Set([...first.letters,...second.letters].map(l=>l.id)).size,35);
});

test('new mail is announced while reading, searching or browsing older pages; idle inbox refreshes',async()=>{
 const source=fs.readFileSync(new URL('../public/requests.js',import.meta.url),'utf8'),start=source.indexOf('async function checkMailbox('),end=source.indexOf('async function loadInbox(',start);assert(start>=0&&end>start);
 for(const mode of ['reading','search','older','idle']){const nodes=new Map(),q=key=>{if(!nodes.has(key))nodes.set(key,{textContent:''});return nodes.get(key);};let loaded=0;const newMail={hidden:true};const context={checkingMail:false,inboxLoading:false,accessLoading:false,inboxAdmin:true,unread:0,api:async()=>({total:2,unread:2,latestId:'new-letter'}),list:{firstElementChild:{dataset:{id:'old-letter'}},querySelector:()=>mode==='reading'?{}:null,contains:()=>false},next:mode==='older'?{}:null,search:{value:mode==='search'?'find':''},document:{activeElement:null},newMail,q,loadInbox:async()=>{loaded++;}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);await context.checkMailbox();assert.equal(loaded,mode==='idle'?1:0);assert.equal(newMail.hidden,mode==='idle');assert.equal(q('#inbox-unread').textContent,' · 2 unread');assert.equal(context.checkingMail,false);}
});

function conversations(DB=database()){
 const env={DB,SAVE_VAULT_PEPPER:'conversation-test',REQUEST_ADMIN_EMAILS:'owner@example.test'},origin='https://arcade.example';
 const call=async(action,{data,cookie='',owner=false,headers={}}={})=>{const response=await handleRequests(new Request(origin+'/api/requests/'+action,{method:data?'POST':'GET',headers:{origin,cookie,'Content-Type':'application/json',...(owner?{'oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'owner@example.test'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 const send=async(name='Player')=>{const cookie=(await call('status')).cookie,sent=await call('send',{cookie,data:{name,message:'Please add a fun new game to the arcade.',key:crypto.randomUUID()}});assert.equal(sent.status,201);return {cookie,id:sent.data.receipt};};
 return {call,send,env,DB};
}
test('each owner reply and status change creates exactly one private sender notification, including retries',async()=>{
 const {call,send,DB}=conversations();try{const a=await send('Alice'),b=await send('Bob');
  assert.equal((await call('mine',{cookie:a.cookie})).data.letters.length,1);assert.equal((await call('mine',{cookie:b.cookie})).data.letters[0].name,'Bob');
  const status={id:a.id,kind:'status',value:'In Progress',key:crypto.randomUUID()},reply={id:a.id,kind:'reply',value:'I am working on your idea.',key:crypto.randomUUID()};
  const results=await Promise.all([call('update',{owner:true,data:status}),call('update',{owner:true,data:status})]);assert(results.every(r=>r.status===200));assert.equal(results[0].data.eventId,results[1].data.eventId);
  await call('update',{owner:true,data:reply});await call('update',{owner:true,data:reply});assert.equal((await call('notifications',{cookie:a.cookie})).data.unread,2);assert.equal((await call('notifications',{cookie:b.cookie})).data.unread,0);
  assert.equal((await call('update',{owner:true,data:{...status,key:crypto.randomUUID()}})).data.unchanged,true);assert.equal((await call('notifications',{cookie:a.cookie})).data.unread,2);
  const history=(await call('thread?id='+a.id,{cookie:a.cookie})).data;assert.equal(history.letter.status,'In Progress');assert.deepEqual(history.events.map(e=>e.kind),['status','reply']);
  // A new arrival must not be swallowed by acknowledging an older loaded snapshot.
  await call('update',{owner:true,data:{...status,value:'Released',key:crypto.randomUUID()}});await call('seen',{cookie:a.cookie,data:{id:a.id,upTo:history.letter.latest_event_id}});assert.equal((await call('notifications',{cookie:a.cookie})).data.unread,1);
  const fresh=(await call('thread?id='+a.id,{cookie:a.cookie})).data;await call('seen',{cookie:a.cookie,data:{id:a.id,upTo:fresh.letter.latest_event_id}});assert.equal((await call('notifications',{cookie:a.cookie})).data.unread,0);assert.equal(fresh.letter.status,'Released');
  assert.equal((await call('thread?id='+a.id,{cookie:b.cookie})).status,404);assert.equal((await call('thread?id='+a.id)).status,404);assert.equal((await call('seen',{cookie:b.cookie,data:{id:a.id,upTo:999}})).status,404);
  assert.equal((await call('update',{cookie:a.cookie,data:reply})).status,401);assert.equal((await call('update',{owner:true,data:{...status,value:'Secret'}})).status,400);assert.equal((await call('update',{owner:true,data:{...reply,value:'Changed on retry'}})).status,409);
  assert.equal((await call('thread?id='+a.id,{cookie:a.cookie,headers:{origin:'https://elsewhere.example'}})).status,403);
  assert.equal(DB.sql.prepare('SELECT COUNT(*) AS n FROM arcade_requests').get().n,2);
 }finally{DB.sql.close();}
});
test('conversation pagination retains same-time replies and owner reading never clears sender notifications',async()=>{
 const {call,send,DB}=conversations();try{const a=await send();for(let i=0;i<55;i++)await call('update',{owner:true,data:{id:a.id,kind:'reply',value:'Reply '+i,key:crypto.randomUUID()}});
  const first=(await call('thread?id='+a.id,{cookie:a.cookie})).data,second=(await call('thread?id='+a.id+'&before='+first.next,{cookie:a.cookie})).data;assert.equal(first.events.length,50);assert.equal(second.events.length,5);assert.equal(new Set([...first.events,...second.events].map(e=>e.id)).size,55);
  await call('read',{owner:true,data:{id:a.id}});assert.equal((await call('notifications',{cookie:a.cookie})).data.unread,55);assert.equal((await call('thread?id='+a.id,{cookie:a.cookie})).data.letter.status,'Unread');
  assert.equal((await call('seen',{owner:true,data:{id:a.id,upTo:999}})).status,404);assert.equal((await call('seen',{cookie:a.cookie,data:{id:a.id,upTo:-1}})).status,400);
 }finally{DB.sql.close();}
});
test('migration preserves existing letters and replies survive closing and reopening the database',async()=>{
 const filename=path.join(os.tmpdir(),'arcade-conversations-'+crypto.randomUUID()+'.sqlite');let DB=database(filename);try{let app=conversations(DB);const a=await app.send();await app.call('update',{owner:true,data:{id:a.id,kind:'reply',value:'Saved online for your next visit.',key:crypto.randomUUID()}});DB.sql.close();DB=database(filename);app=conversations(DB);const mine=await app.call('mine',{cookie:a.cookie});assert.equal(mine.data.letters[0].id,a.id);assert.equal(mine.data.unread,1);assert.equal((await app.call('thread?id='+a.id,{cookie:a.cookie})).data.events[0].value,'Saved online for your next visit.');}finally{DB.sql.close();fs.unlinkSync(filename);}
});

test('additive event migration retains pre-upgrade request rows and sender ownership',async()=>{const DB=database(':memory:',false),app=conversations(DB);try{const a=await app.send('Existing sender');const before=DB.sql.prepare('SELECT * FROM arcade_requests').get();DB.sql.exec(fs.readFileSync(new URL('../drizzle/0001_large_archangel.sql',import.meta.url),'utf8'));assert.deepEqual(DB.sql.prepare('SELECT * FROM arcade_requests').get(),before);const mine=await app.call('mine',{cookie:a.cookie});assert.equal(mine.data.letters[0].id,a.id);assert.equal(mine.data.letters[0].status,'Unread');assert.equal(mine.data.unread,0);assert.equal((await app.call('update',{owner:true,data:{id:a.id,kind:'reply',value:'Reply to an existing request.',key:crypto.randomUUID()}})).status,200);}finally{DB.sql.close();}});

test('playtest feedback requires an unlocked session and keeps the canonical game tag on the thread',async()=>{
 const {call,env,DB}=conversations();
 const origin='https://arcade.example';
 const catalog=[{id:'test-game',title:'Test Game'}];
 env.PLAYTEST_PASSWORD='test-password';
 DB.batch=async statements=>{
  DB.sql.exec('BEGIN');
  try{const results=[];for(const statement of statements)results.push(await statement.all());DB.sql.exec('COMMIT');return results;}
  catch(error){DB.sql.exec('ROLLBACK');throw error;}
 };
 try{
  const sender=(await call('status')).cookie;
  const data={name:'Playtester',message:'The tutorial could use another hint.',key:crypto.randomUUID(),gameId:'test-game',gameTitle:'Forged title'};
  const send=(letter,cookie)=>handleRequests(new Request(origin+'/api/requests/send',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(letter)}),env,catalog);
  assert.equal((await send(data,sender)).status,403);
  const unlock=await handlePlaytest(new Request(origin+'/api/playtest/unlock',{method:'POST',body:JSON.stringify({password:env.PLAYTEST_PASSWORD})}),env,catalog);
  assert.match(unlock.headers.get('set-cookie'),/Path=\/api;/);
  const cookie=sender+'; '+unlock.headers.get('set-cookie').split(';')[0];
  assert.equal((await send({...data,gameId:'missing'},cookie)).status,400);
  const sent=await send(data,cookie);
  assert.equal(sent.status,201);
  const {receipt}=await sent.json();
  assert.equal((await (await send(data,cookie)).json()).receipt,receipt);
  const inbox=await call('inbox',{owner:true}),mine=await call('mine',{cookie:sender});
  for(const list of [inbox.data.letters,mine.data.letters]){
   assert.equal(list.length,1);assert.equal(list[0].game_id,'test-game');assert.equal(list[0].game_title,'Test Game');
  }
  const thread=await call('thread?id='+receipt,{cookie:sender});
  assert.equal(thread.data.letter.game_title,'Test Game');
 }finally{DB.sql.close();}
});
