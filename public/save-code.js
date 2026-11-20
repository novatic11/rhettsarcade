// Only these game-owned keys are portable. Never export other origin storage.
export const SAVE_GROUPS=[
  {id:'backrooms-for-science',title:'Backrooms: For Science',keys:[],pattern:/^l0ns_[A-Za-z0-9_]{1,64}$/},
  {id:'square-off-2',title:'Square Off 2',keys:['square-off-2-save-v1']},
  {id:'meridian-space-program',title:'Meridian Space Program',keys:['meridian_space_program_v1','meridian_space_program_quick_v1','meridian_space_program_settings_v1']},
  {id:'slide-between',title:'Slide Between',keys:['sb.best','sb.course','sb.diff','sb.sound','sb.music']},
  {id:'crazy-sort',title:'Crazy Sort',keys:['crazysort.v1','crazy-sort-settings-v1']},
  {id:'car-spleef-3d',title:'Car Spleef 3D',keys:['rhettsArcade.carSpleef3d','car-spleef-3d-settings-v1']},
  {id:'odd-hours',title:'Odd Hours',keys:['odd-hours-prototype-v1','odd-hours-settings-v1']},
  {id:'parcel-panic',title:'Parcel Panic',keys:['parcel-panic-prototype-v1','parcel-panic-settings-v1']},
  {id:'starball',title:'Starball',keys:['starball-prototype-v1','starball-settings-v1']},
  {id:'ricochet-club',title:'Ricochet Club',keys:['ricochet-club-prototype-v1','ricochet-club-settings-v1']},
  {id:'cloudkeeper',title:'Cloudkeeper',keys:['cloudkeeper-prototype-v1','cloudkeeper-settings-v1']},
  {id:'bridgewright',title:'Bridgewright',keys:['bridgewright-prototype-v1','bridgewright-settings-v1']},
  {id:'cargo-swing',title:'Cargo Swing',keys:['cargo-swing-prototype-v1']},
  {id:'laserline',title:'Laserline',keys:['laserline-prototype-v1']},
  {id:'pocket-heist',title:'Pocket Heist',keys:['pocket-heist-prototype-v1']},
  {id:'deep-signal',title:'Deep Signal',keys:['deep-signal-prototype-v1']},
  {id:'afterimage',title:'Afterimage',keys:['afterimage-prototype-v1']},
  {id:'midnight-kitchen',title:'Midnight Kitchen',keys:['midnight-kitchen-prototype-v1']},
  {id:'square-off',title:'Square Off',keys:['square-off-best','square-off-sound','square-off-music','square-off-tutorial-v1']},
  {id:'neon-slip',title:'Neon Slip',keys:['neon-slip-best','neon-slip-classic-best','neon-slip-muted','neon-slip-medals','neon-slip-collection-v1']},
  {id:'rustbound',title:'Rustbound',keys:['rustbound-save-v1','rustbound-import-backup']},
  {id:'rustbound-2',title:'Rustbound Legacy',keys:['rustbound-2-demo-v1','rustbound-2-settings-v1','rustbound-2-demo-v1-backup','rustbound-2-demo-v1-recovery','rustbound-2-solar-v1','rustbound-2-solar-v1-backup','rustbound-2-solar-v1-recovery']},
  {id:'the-rooms-between',title:'The Rooms Between',keys:['trb:settings','trb:index','trb:last'],pattern:/^trb:(?:world|backup):[A-Za-z0-9_-]{1,128}$/},
  {id:'stellar-forge',title:'Stellar Forge',keys:['stellar-forge-save']},
  {id:'the-undercroft',title:'The Undercroft',keys:['undercroft-save']},
  {id:'car-spleef',title:'Car Spleef',keys:['car-spleef-stats-v1','car-spleef-muted']},
  {id:'ducks-vs-dogs',title:'Ducks vs Dogs',keys:['ducks-vs-dogs-save-v1','ducks-vs-dogs-muted']},
  {id:'ducks-vs-dogs-2',title:'Ducks vs. Dogs 2',keys:['ducks-vs-dogs-2-save-v1','ducks-vs-dogs-2-settings-v1']},
  {id:'arcade-tycoon',title:'Arcade Tycoon',keys:['arcade-tycoon-prototype-v1','arcade-tycoon-settings-v1']},
  {id:'switchyard',title:'Switchyard',keys:['switchyard-stats-v1','switchyard-muted']},
  {id:'stardust-foundry',title:'Stardust Foundry',keys:['stardust-foundry-v1']},
  {id:'squircle-siege',title:'Squircle Siege',keys:['squircle-siege-v1']},
  {id:'frontier',title:'Frontier',keys:['frontier-save-v1']},
  {id:'library',title:'Arcade favorites',keys:['rhetts-arcade','rhetts-arcade-stats-v1']}
];
const MAX_BYTES=8*1024*1024,MAX_CODE=12*1024*1024,MAX_ENTRIES=2048;
export function saveGroup(key){return typeof key==='string'?SAVE_GROUPS.find(g=>g.keys.includes(key)||g.pattern?.test(key)):undefined;}
export function collectSaves(storage,groups=SAVE_GROUPS.map(g=>g.id)){
  const entries=[];
  for(let i=0;i<storage.length;i++){const key=storage.key(i),g=saveGroup(key);if(g&&groups.includes(g.id)){const value=storage.getItem(key);if(value!==null)entries.push([key,value]);}}
  return entries.sort((a,b)=>a[0].localeCompare(b[0]));
}
function validateEntries(entries){
  if(!Array.isArray(entries)||entries.length>MAX_ENTRIES)throw Error('This code contains too much save data.');
  const seen=new Set();let bytes=0;
  for(const row of entries){if(!Array.isArray(row)||row.length!==2||!saveGroup(row[0])||typeof row[1]!=='string'||seen.has(row[0]))throw Error('This code contains invalid or unsupported save data.');seen.add(row[0]);bytes+=new TextEncoder().encode(row[0]+row[1]).length;if(bytes>MAX_BYTES)throw Error('This code contains too much save data.');}
  return entries;
}
export function summarizeSaves(entries){return SAVE_GROUPS.map(g=>({...g,count:entries.filter(([key])=>saveGroup(key)?.id===g.id).length}));}
async function checksum(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
async function boundedBytes(stream){const reader=stream.getReader(),chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('This code contains too much save data.');chunks.push(value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}
export async function encodeSaveCode(entries,{compress=true,createdAt=new Date().toISOString()}={}){
  validateEntries(entries);
  const raw=new TextEncoder().encode(JSON.stringify({format:'rhetts-arcade-saves',version:1,createdAt,entries}));
  if(raw.length>MAX_BYTES)throw Error('The saved data is too large for one code.');
  const packed=compress&&typeof CompressionStream!=='undefined'?await boundedBytes(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))):raw;
  const compressed=packed.length<raw.length;
  return `RA1.${compressed?'G':'J'}.${await checksum(raw)}.${base64(compressed?packed:raw)}`;
}
export async function decodeSaveCode(input){
  if(typeof input!=='string'||input.length>MAX_CODE)throw Error('This save code is too large.');
  const code=input.replace(/\s/g,''),match=/^RA1\.([GJ])\.([a-f0-9]{64})\.([A-Za-z0-9_-]+)$/.exec(code);
  if(!match)throw Error('Paste a complete save code exported from Rhett’s Arcade.');
  let packed;try{packed=Uint8Array.from(atob(match[3].replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}catch{throw Error('This code is incomplete or damaged. Copy it again.');}
  if(packed.length>MAX_BYTES)throw Error('This code contains too much save data.');
  let raw=packed;
  if(match[1]==='G'){if(typeof DecompressionStream==='undefined')throw Error('This browser cannot open compressed saves. Try an updated browser.');try{raw=await boundedBytes(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip')));}catch(e){throw Error(e.message.includes('too much')?e.message:'This code is incomplete or damaged. Copy it again.');}}
  if(await checksum(raw)!==match[2])throw Error('This code is incomplete or damaged. Copy it again.');
  let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw Error('This code contains invalid save data.');}
  if(!data||data.format!=='rhetts-arcade-saves'||data.version!==1||typeof data.createdAt!=='string'||!Number.isFinite(Date.parse(data.createdAt)))throw Error('This save code has an unsupported format.');
  validateEntries(data.entries);
  return {entries:data.entries,createdAt:data.createdAt,groups:SAVE_GROUPS.filter(g=>data.entries.some(([key])=>saveGroup(key).id===g.id)).map(g=>g.id)};
}
function replaceGroups(storage,groups,entries){
  const keys=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(groups.includes(saveGroup(key)?.id))keys.push(key);}
  for(const key of keys)storage.removeItem(key);
  for(const [key,value]of entries)storage.setItem(key,value);
}
export async function restoreSaves(storage,data,keepBackup){
  validateEntries(data.entries);
  const groups=SAVE_GROUPS.filter(g=>data.entries.some(([key])=>saveGroup(key).id===g.id)).map(g=>g.id);
  if(!groups.length)throw Error('There are no saved games or settings in this code.');
  const backup={version:1,createdAt:new Date().toISOString(),groups,entries:collectSaves(storage,groups)};
  await keepBackup(backup); // Finish the durable backup before replacing any save.
  try{replaceGroups(storage,groups,data.entries);}catch(e){try{replaceGroups(storage,groups,backup.entries);}catch{throw Error('Import stopped. Use Undo import to recover your previous saves.');}throw Error('Import stopped because browser storage is full or unavailable. Your previous saves were restored.');}
  return backup;
}
// A password owns a complete arcade snapshot, including games with no saves.
export async function restoreSnapshot(storage,entries,keepBackup){
  validateEntries(entries);
  const groups=SAVE_GROUPS.map(g=>g.id);
  const backup={version:1,createdAt:new Date().toISOString(),groups,entries:collectSaves(storage)};
  await keepBackup(backup);
  try{replaceGroups(storage,groups,entries);}catch{
    try{replaceGroups(storage,groups,backup.entries);}catch{throw Error('Loading stopped. Use Undo load to recover your previous saves.');}
    throw Error('Loading stopped because browser storage is full or unavailable. Your previous saves were restored.');
  }
  return backup;
}
export function undoRestore(storage,backup){
  if(!backup||backup.version!==1||!Array.isArray(backup.groups)||backup.groups.some(id=>!SAVE_GROUPS.some(g=>g.id===id)))throw Error('The import backup could not be read.');
  validateEntries(backup.entries);
  if(backup.entries.some(([key])=>!backup.groups.includes(saveGroup(key).id)))throw Error('The import backup could not be read.');
  const current=collectSaves(storage,backup.groups);
  try{replaceGroups(storage,backup.groups,backup.entries);}catch{replaceGroups(storage,backup.groups,current);throw Error('Unable to undo right now. Browser storage is unavailable.');}
}
