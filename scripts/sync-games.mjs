import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function within(base,relative){
  const target=path.resolve(base,relative),rel=path.relative(base,target);
  if(!rel||rel.startsWith('..'+path.sep)||rel==='..'||path.isAbsolute(rel))throw Error('Unsafe asset path: '+relative);
  return target;
}
function walk(base,relative,files){
  const target=within(base,relative),stat=fs.lstatSync(target);
  if(stat.isSymbolicLink())throw Error('Linked assets need review: '+relative);
  if(stat.isDirectory()){
    for(const name of fs.readdirSync(target).sort()){
      if(['.git','node_modules','.openai'].includes(name))throw Error('Unexpected project metadata in game build: '+name);
      walk(base,path.posix.join(relative,name),files);
    }
  }else if(stat.isFile())files.set(relative,{buffer:fs.readFileSync(target),size:stat.size,mtime:stat.mtimeMs});
}
function snapshot(game){
  const stat=fs.lstatSync(game.source),files=new Map();
  if(stat.isSymbolicLink())throw Error('Linked game source needs review.');
  if(stat.isFile())files.set('index.html',{buffer:fs.readFileSync(game.source),size:stat.size,mtime:stat.mtimeMs});
  else if(stat.isDirectory())for(const entry of game.entries??fs.readdirSync(game.source).sort())walk(game.source,entry,files);
  else throw Error('Game source is not a build.');
  return files;
}
function fingerprint(files){return digest(Buffer.from([...files].map(([name,{buffer}])=>name+'\0'+digest(buffer)).sort().join('\n')));}
export function gameBuildFingerprint(directory){
  const files=new Map();for(const name of fs.readdirSync(directory).sort())walk(directory,name,files);
  return fingerprint(files);
}
export function recordGameUpdate(entry,result,now=new Date().toISOString()){
  if(result.error||!result.sha256||result.id!==entry.id)return false;
  if(!result.changed&&entry.buildSha256===result.sha256)return false;
  entry.buildSha256=result.sha256;entry.updatedAt=now;
  return true;
}
function checkJS(text,name,module=false){
  if(module)execFileSync(process.execPath,['--check','--input-type=module'],{input:text,stdio:['pipe','pipe','pipe'],windowsHide:true});
  else new vm.Script(text,{filename:name});
}
function validate(files,game){
  const html=files.get('index.html')?.buffer.toString('utf8');
  if(!html||!/^\s*<!doctype html>/i.test(html)||!/<\/html>\s*$/i.test(html))throw Error('Incomplete HTML export.');
  const title=/<title>([^<]+)<\/title>/i.exec(html)?.[1];
  if(!title?.includes(game.title))throw Error('Unexpected game title: '+title);
  const refs=[],imports={};let executable=0;
  for(const [page,{buffer}] of files){
    if(!/\.html$/.test(page))continue;
    const content=buffer.toString('utf8');
    if(!/^\s*<!doctype html>/i.test(content)||!/<\/html>\s*$/i.test(content))throw Error('Incomplete HTML export: '+page);
    for(const [,attrs,body] of content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
      const type=/\btype\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
      if(type==='importmap'){Object.assign(imports,JSON.parse(body).imports);continue;}
      if(type&&type!=='module'&&!/^(?:text|application)\/javascript$/i.test(type))continue;
      if(page==='index.html')executable++;
      if(!/\bsrc\s*=/i.test(attrs))checkJS(body,page+' inline script',type==='module');
    }
    for(const match of content.matchAll(/<(?:script|img|link|audio|video|source)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))refs.push([page,match[1]]);
  }
  if(!executable)throw Error('No game script in export.');
  for(const [name,{buffer}] of files){
    if(/\.(?:js|mjs)$/.test(name)){
      const js=buffer.toString('utf8');checkJS(js,name,true);
      for(const [,ref] of js.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s*)?["']([^"']+)["']/g)){
        if(ref.startsWith('.'))refs.push([name,ref]);
        else{
          const key=Object.keys(imports).filter(k=>ref===k||(k.endsWith('/')&&ref.startsWith(k))).sort((a,b)=>b.length-a.length)[0];
          if(!key)throw Error('Unmapped module '+ref+' in '+name);
          refs.push(['index.html',imports[key]+ref.slice(key.length)]);
        }
      }
    }
    if(/\.css$/.test(name))for(const match of buffer.toString('utf8').matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]+))\s*\)/g))refs.push([name,match[1]??match[2]??match[3]]);
  }
  for(const [from,ref] of refs){
    if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref))continue;
    const clean=decodeURIComponent(ref.split(/[?#]/)[0]);if(!clean)continue;
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(from),clean));
    if(clean.startsWith('/')||target.startsWith('../')||!files.has(target))throw Error('Missing or unsafe asset '+ref+' in '+from);
  }
}
export function syncGame(game,destination){
  const files=snapshot(game);validate(files,game);
  const fresh=snapshot(game);
  if(fingerprint(files)!==fingerprint(fresh)||[...files].some(([name,entry])=>entry.mtime!==fresh.get(name)?.mtime))throw Error('Source changed during validation; defer this game.');
  fs.mkdirSync(destination,{recursive:true});
  const existing=new Map();for(const name of fs.readdirSync(destination).sort())walk(destination,name,existing);
  const hash=fingerprint(files);
  if(fingerprint(existing)===hash)return {id:game.id,changed:false,sha256:hash};
  for(const [name,{buffer}] of files){
    const target=within(destination,name);fs.mkdirSync(path.dirname(target),{recursive:true});
    const temporary=target+'.syncing';fs.writeFileSync(temporary,buffer);fs.renameSync(temporary,target);
    if(digest(fs.readFileSync(target))!==digest(buffer))throw Error('Copy verification failed: '+name);
  }
  for(const name of existing.keys())if(!files.has(name))fs.unlinkSync(within(destination,name));
  return {id:game.id,changed:true,sha256:hash,files:files.size};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const sources=JSON.parse(fs.readFileSync(path.join(root,'game-sources.json'),'utf8'));
  const catalogFiles=['public/games.json','public/junkyard-games.json','public/secret-games.json'],catalogs=catalogFiles.map(file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))),catalog=catalogs.flat();
  if(catalog.some(g=>!sources.some(s=>s.id===g.id)))throw Error('A library game has no update source; review its registration.');
  const selected=new Set(process.argv.slice(2)),results=[];
  if([...selected].some(id=>!sources.some(s=>s.id===id)))throw Error('Unknown game selection.');
  for(const game of sources){
    if(selected.size&&!selected.has(game.id))continue;
    const entry=catalog.find(g=>g.id===game.id);if(!entry)continue;
    if(game.mode==='pending'&&entry.status==='coming-soon'){
      results.push({id:game.id,pending:true,changed:false});continue;
    }
    if(game.mode==='live'){
      if(!entry.external||entry.url!==game.url)throw Error('Live game link changed; review '+game.id);
      results.push({id:game.id,live:true,changed:false});continue;
    }
    if(entry.external||entry.url!=='games/'+game.id+'/')throw Error('Bundled game path changed: '+game.id);
    try{
      const result=syncGame(game,within(root,'public/games/'+game.id));results.push(result);
      // Comparing the validated hash also recovers a copied build whose metadata write was interrupted.
      if(recordGameUpdate(entry,result)){
        result.metadataChanged=true;
        const catalogIndex=catalogs.findIndex(list=>list.some(g=>g.id===entry.id)),catalogPath=path.join(root,catalogFiles[catalogIndex]),temporary=catalogPath+'.syncing';
        fs.writeFileSync(temporary,JSON.stringify(catalogs[catalogIndex],null,2)+'\n');fs.renameSync(temporary,catalogPath);
      }
    }
    catch(error){results.push({id:game.id,error:error.message});}
  }
  console.log(JSON.stringify({results,changed:results.filter(r=>r.changed||r.metadataChanged).map(r=>r.id)},null,2));
  if(results.some(r=>r.error))process.exitCode=1;
}
