import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source='C:/Users/rhett/Documents/Codex/2026-10-02/i-wa/outputs/rustbound.html';
const destination=path.join(root,'dist/games/rustbound/index.html');
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const before=fs.statSync(source),content=fs.readFileSync(source),html=content.toString('utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
if(!/<!doctype html>/i.test(html)||!/<title>Rustbound<\/title>/i.test(html)||!/<\/html>\s*$/i.test(html)||!scripts.length)throw Error('Rustbound export is incomplete; keep the current game.');
if(scripts.some(([,attrs])=>/\bsrc\s*=|\btype\s*=\s*["']module/i.test(attrs)))throw Error('Rustbound now needs extra assets or modules; review before syncing.');
for(const [i,script] of scripts.entries())new vm.Script(script[2],{filename:'rustbound-inline-'+i+'.js'});
const after=fs.statSync(source);
if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('Rustbound changed during validation; try a later run.');
const hash=digest(content);
if(fs.existsSync(destination)&&digest(fs.readFileSync(destination))===hash){console.log(JSON.stringify({changed:false,sha256:hash}));process.exit(0);}
const temporary=destination+'.syncing';
fs.writeFileSync(temporary,content);
fs.renameSync(temporary,destination);
if(digest(fs.readFileSync(destination))!==hash)throw Error('Rustbound copy verification failed.');
console.log(JSON.stringify({changed:true,sha256:hash,bytes:content.length}));
