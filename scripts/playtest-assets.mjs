import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function playtestAssets(){
 const id='virtual:arcade-playtest-assets',resolved='\0'+id;
 const root=fileURLToPath(new URL('../playtest/games/',import.meta.url));
 return {name:'arcade-playtest-assets',resolveId(value){if(value===id)return resolved;},load(value){
  if(value!==resolved)return;
  const files=Object.create(null);
  const collect=dir=>{for(const file of fs.readdirSync(dir,{withFileTypes:true})){
   if(file.name.startsWith('.'))continue;
   const full=path.join(dir,file.name);
   if(file.isDirectory())collect(full);
   else if(file.isFile()){this.addWatchFile(full);files[path.relative(root,full).split(path.sep).join('/')]=fs.readFileSync(full).toString('base64');}
  }};
  if(fs.existsSync(root))collect(root);
  return 'export default '+JSON.stringify(files)+';';
 }};
}
