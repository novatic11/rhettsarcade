import assert from 'node:assert/strict';
import test from 'node:test';
import {handlePlaytest,servePlaytestAsset} from '../lib/playtest.mjs';

const env={PLAYTEST_PASSWORD:'example-password',SAVE_VAULT_PEPPER:'test signing key'};
const root='https://arcade.example/api/playtest/';
const catalog=[{id:'test-game',title:'Test game'}];
const get=(path,session)=>new Request(root+path,{headers:session?{Cookie:session}:{}});
const post=(path,body,headers={})=>new Request(root+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('catalog and direct game files both require a valid playtest session',async()=>{
 const assets={'test-game/index.html':btoa('<h1>Example</h1>')};
 const path='game/test-game/index.html';
 assert.equal((await handlePlaytest(get('catalog'),env,catalog)).status,401);
 assert.equal((await servePlaytestAsset(get(path),env,assets)).status,401);
 const wrong=await handlePlaytest(post('unlock',{password:'wrong'}),env,catalog);
 assert.equal(wrong.status,403);assert.equal(wrong.headers.get('set-cookie'),null);
 assert.equal((await handlePlaytest(post('unlock',{password:env.PLAYTEST_PASSWORD},{Origin:'https://example.net'}),env,catalog)).status,403);
 const unlocked=await handlePlaytest(post('unlock',{password:env.PLAYTEST_PASSWORD}),env,catalog);
 assert.deepEqual(await unlocked.json(),{games:catalog});
 const cookie=unlocked.headers.get('set-cookie');
 assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 const session=cookie.split(';')[0];
 assert.deepEqual(await (await handlePlaytest(get('catalog',session),env,catalog)).json(),{games:catalog});
 const game=await servePlaytestAsset(get(path,session),env,assets);
 assert.match(game.headers.get('content-type'),/^text\/html/);assert.match(game.headers.get('cache-control'),/no-store/);
 assert.equal(await game.text(),'<h1>Example</h1>');
 const tampered=session.slice(0,-1)+(session.endsWith('0')?'1':'0');
 assert.equal((await servePlaytestAsset(get(path,tampered),env,assets)).status,401);
 assert.equal((await servePlaytestAsset(get(path,session),{...env,PLAYTEST_PASSWORD:'new-password'},assets)).status,401);
 assert.equal((await servePlaytestAsset(get('game/missing.js',session),env,assets)).status,404);
 assert.match((await handlePlaytest(post('lock',{}),env,catalog)).headers.get('set-cookie'),/Max-Age=0/);
});
