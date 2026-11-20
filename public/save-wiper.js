import {SAVE_GROUPS,collectSaves} from './save-code.js';

// Preferences survive a fresh start. Progress, high scores and recovery copies do not.
const PREFERENCES=new Set(['ducks-vs-dogs-2-settings-v1','meridian_space_program_settings_v1','sb.course','sb.diff','sb.sound','sb.music','crazy-sort-settings-v1','car-spleef-3d-settings-v1','odd-hours-settings-v1','parcel-panic-settings-v1','starball-settings-v1','ricochet-club-settings-v1','cloudkeeper-settings-v1','bridgewright-settings-v1','square-off-sound','square-off-music','neon-slip-muted','rustbound-2-settings-v1','trb:settings','car-spleef-muted','ducks-vs-dogs-muted','arcade-tycoon-settings-v1','switchyard-muted']);
export const WIPE_GAMES=SAVE_GROUPS.filter(g=>g.id!=='library').map(({id,title})=>({id,title}));
export function gameProgress(storage,id){
 if(!WIPE_GAMES.some(g=>g.id===id))throw Error('Choose a registered game to wipe.');
 return collectSaves(storage,[id]).filter(([key])=>!PREFERENCES.has(key));
}
export async function wipeGameProgress(storage,id,keepBackup){
 const entries=gameProgress(storage,id),backup={version:1,createdAt:new Date().toISOString(),groups:[id],entries};
 await keepBackup(backup);
 try{for(const [key]of entries)storage.removeItem(key);}catch{
  try{for(const [key,value]of entries)storage.setItem(key,value);}catch{throw Error('Wiping stopped. Your progress is in the safety backup. Browser storage is unavailable.');}
  throw Error('Wiping stopped. Your previous progress was restored.');
 }
 return entries.length;
}
