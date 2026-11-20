import {Pond,STAGES,CAMPAIGN} from './model.js';
import {chooseDifficulty} from './difficulty.js';
const rank={BRONZE:1,SILVER:2,GOLD:3};
export const SAVE_KEY='ducks-vs-dogs-save-v1';
export function freshProfile(){return {medals:[null,null,null],wins:0,bestKills:0,selected:0,tips:false,difficulty:'normal',campaignMedals:{},campaignSelected:0,bestEndless:0};}
export function unlocked(profile){return profile.medals[0]?(profile.medals[1]?2:1):0;}
export function campaignAvailable(profile){const first=CAMPAIGN.findIndex(l=>!profile.campaignMedals[l.duck]);return first===-1?CAMPAIGN.length-1:first;}
export function readProfile(raw){
 const profile=freshProfile(),runs={campaign:null,endless:null,legacy:null};if(!raw)return {profile,run:null,runs,invalid:false};
 try{const s=JSON.parse(raw);if(![1,2].includes(s.version)||!Array.isArray(s.medals)||s.medals.length!==3||s.medals.some(m=>m!==null&&!Object.hasOwn(rank,m))||!Number.isSafeInteger(s.wins)||s.wins<0||s.wins>1e7||!Number.isSafeInteger(s.bestKills)||s.bestKills<0||s.bestKills>1e9)throw Error('Invalid profile');
  profile.difficulty=chooseDifficulty(s.difficulty);profile.medals=[...s.medals];profile.wins=s.wins;profile.bestKills=s.bestKills;profile.selected=Number.isInteger(s.selected)?Math.max(0,Math.min(unlocked(profile),s.selected)):0;profile.tips=!!s.tips;
  if(s.version===2){if(!s.campaignMedals||typeof s.campaignMedals!=='object'||Array.isArray(s.campaignMedals)||Object.values(s.campaignMedals).some(m=>!Object.hasOwn(rank,m))||!Number.isSafeInteger(s.bestEndless)||s.bestEndless<0||s.bestEndless>1e6)throw Error('Invalid campaign');for(const l of CAMPAIGN)if(s.campaignMedals[l.duck])profile.campaignMedals[l.duck]=s.campaignMedals[l.duck];profile.bestEndless=s.bestEndless;profile.campaignSelected=Number.isInteger(s.campaignSelected)?Math.max(0,Math.min(campaignAvailable(profile),s.campaignSelected)):0;}
  let invalid=false,primary=null;const restore=raw=>typeof raw==='string'&&raw.length<250000?Pond.restore(raw):null;
  for(const mode of Object.keys(runs)){const raw=s.runs?.[mode];if(!raw)continue;const g=restore(raw);if(!g||g.mode!==mode||g.result||mode==='campaign'&&g.level>campaignAvailable(profile)||mode==='legacy'&&g.stage>unlocked(profile)){invalid=true;continue;}runs[mode]=g;}
  if(s.run){primary=restore(s.run);if(!primary||primary.result||primary.mode==='campaign'&&primary.level>campaignAvailable(profile)||primary.mode==='legacy'&&primary.stage>unlocked(profile)){invalid=!primary||invalid;primary=null;}else runs[primary.mode]=primary;}
  return {profile,run:primary||runs.legacy||runs.campaign||runs.endless,runs,invalid};
 }catch{return {profile,run:null,runs,invalid:true};}
}
export function encodeProfile(profile,run,runs={}){const saved={};for(const [mode,g]of Object.entries(runs))if(g&&!g.result)saved[mode]=g.serialize();return JSON.stringify({version:2,...profile,run:run&&!run.result?run.serialize():null,runs:saved});}
export function recordWin(profile,result){if(!result?.won||!STAGES[result.stage]||!Object.hasOwn(rank,result.medal))return false;if(rank[result.medal]>(rank[profile.medals[result.stage]]||0))profile.medals[result.stage]=result.medal;profile.wins++;profile.bestKills=Math.max(profile.bestKills,result.kills);return true;}
export function recordResult(profile,result){if(!result)return false;profile.bestKills=Math.max(profile.bestKills,result.kills);if(result.mode==='endless'){profile.bestEndless=Math.max(profile.bestEndless,result.waves-1);return true;}if(result.mode==='campaign'){const l=CAMPAIGN[result.level];if(!result.won||!l||result.level>campaignAvailable(profile)||!rank[result.medal])return false;if(rank[result.medal]>(rank[profile.campaignMedals[l.duck]]||0))profile.campaignMedals[l.duck]=result.medal;profile.wins++;return true;}return recordWin(profile,result);}
