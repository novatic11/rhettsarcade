import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {Tycoon,SAVE_KEY,SETTINGS_KEY} from '../public/games/arcade-tycoon/model.js';
import {handleVault} from '../lib/save-vault.mjs';
import {encodeSaveCode,decodeSaveCode,restoreSnapshot} from '../public/save-code.js';
function database(){
 const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync(new URL('../drizzle/0000_many_hellcat.sql',import.meta.url),'utf8'));
 return {sql,prepare(query){return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async run(){return sql.prepare(query).run(...args);}};}};},async batch(queries){for(const query of queries)await query.run();}};
}
test('password uniqueness, confirmation, isolation, reload, validation and concurrent-save conflicts',async()=>{
 const DB=database(),env={DB,SAVE_VAULT_PEPPER:'unit-test-only-secret'},origin='https://arcade.example';
 const tycoon=new Tycoon();tycoon.place('cabinet',2,1);const payload=await encodeSaveCode([['neon-slip-best','321'],[SAVE_KEY,tycoon.serialize()],[SETTINGS_KEY,'{"volume":0.2,"muted":true,"music":false}'],['rhetts-arcade','{"favorites":["neon-slip"]}']]);
 async function call(action,data,cookie='',headers={}){
  const response=await handleVault(new Request(origin+'/api/saves/'+action,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',origin,cookie,...headers},...(data?{body:JSON.stringify(data)}:{})}),env);
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 assert.equal((await call('claim',{password:'MylettersOnly',payload})).status,400);
 assert.equal((await call('check',{password:'letters123'})).status,400);
 assert.equal((await call('check',{password:'validPassword'},{},{origin:'https://evil.example'})).status,403);
 const race=await Promise.all([call('claim',{password:'FirstPassword',payload,confirmed:true}),call('claim',{password:'FirstPassword',payload,confirmed:true})]);
 assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);const first=race.find(r=>r.status===201);
 assert.equal((await call('check',{password:'FirstPassword'})).data.available,false);
 assert.equal((await call('check',{password:'firstPassword'})).data.available,true);
 assert.equal((await call('load',{password:'MissingPassword'})).status,404);
 const preview=await call('load',{password:'FirstPassword'});assert.equal(preview.cookie,undefined);assert.equal(preview.data.payload,payload);const portable=await decodeSaveCode(preview.data.payload);assert.equal(Tycoon.restore(portable.entries.find(([k])=>k===SAVE_KEY)[1]).cash,670);assert.equal(JSON.parse(portable.entries.find(([k])=>k===SETTINGS_KEY)[1]).volume,.2);
 const connected=await call('connect',{password:'FirstPassword',revision:1,confirmed:true});
 assert.match(connected.cookie,/^arcade_save_session=[a-f0-9]{64}$/);
 assert.equal((await call('session',null,connected.cookie)).data.id,first.data.id);
 assert.equal((await call('sync',{id:first.data.id,revision:1,payload})).status,401);
 const other=await call('claim',{password:'OtherPassword',payload:await encodeSaveCode([]),confirmed:true});
 assert.equal((await call('sync',{id:first.data.id,revision:1,payload},other.cookie)).status,409);
 const changed=await encodeSaveCode([['neon-slip-best','777']]);
 const saves=await Promise.all([call('sync',{id:first.data.id,revision:1,payload:changed},first.cookie),call('sync',{id:first.data.id,revision:1,payload},connected.cookie)]);
 assert.deepEqual(saves.map(r=>r.status).sort(),[200,409]);
 const saved=await call('session',null,first.cookie);assert.equal(saved.data.revision,2);
 assert.deepEqual((await decodeSaveCode(saved.data.payload)).entries,saves[0].status===200?[['neon-slip-best','777']]:(await decodeSaveCode(payload)).entries);
 assert.equal((await call('sync',{id:first.data.id,revision:2,payload:'damaged'},first.cookie)).status,400);
 assert.equal((await call('sync',{id:first.data.id,revision:2,payload:'x'.repeat(1500001)},first.cookie)).status,413);
 assert.equal((await call('leave',{},first.cookie)).status,200);assert.equal((await call('session',null,first.cookie)).status,401);
 assert.equal((await call('session',null,connected.cookie)).status,200);
 const record=DB.sql.prepare('SELECT password_key FROM save_vaults WHERE id=?').get(first.data.id);
 assert.match(record.password_key,/^[a-f0-9]{64}$/);assert.notEqual(record.password_key,'FirstPassword');
 DB.sql.close();
});
test('rate limits prevent repeated password guesses',async()=>{
 const DB=database();let response;
 for(let i=0;i<31;i++)response=await handleVault(new Request('https://arcade.example/api/saves/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'RepeatedPassword'})}),{DB,SAVE_VAULT_PEPPER:'test'});
 assert.equal(response.status,429);DB.sql.close();
});
test('complete account load clears absent game saves, preserves unrelated storage and backs up before writing',async()=>{
 const values=new Map([['neon-slip-best','42'],['rustbound-save-v1','old'],['unrelated','keep']]);
 const storage={get length(){return values.size;},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let backup;
 await restoreSnapshot(storage,[['neon-slip-best','99']],async b=>{assert.equal(storage.getItem('rustbound-save-v1'),'old');backup=b;});
 assert.equal(storage.getItem('rustbound-save-v1'),null);assert.equal(storage.getItem('unrelated'),'keep');assert.equal(backup.entries.length,2);
 await assert.rejects(()=>restoreSnapshot(storage,[],async()=>{throw Error('Backup unavailable');}));assert.equal(storage.getItem('neon-slip-best'),'99');
 await restoreSnapshot(storage,[],async()=>{});assert.equal(storage.getItem('neon-slip-best'),null);
});
