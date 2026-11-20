import {DUCKS,DOGS,CAMPAIGN,STAGES} from './model.js';

// Read the existing schedule: scouting must never reroll an Endless wave.
export function packBriefing(game){
 const groups=new Map(),add=(type,field)=>{if(!groups.has(type))groups.set(type,{type,name:DOGS[type].name,arriving:0,onField:0});groups.get(type)[field]++;};
 if(!game.result){for(const dog of game.dogs)add(dog.type,'onField');for(const dog of game.schedule.slice(game.phase==='wave'?game.spawnIndex:0))add(dog.type,'arriving');}
 return {wave:game.phase==='wave'?game.wave:game.wave+1,groups:[...groups.values()]};
}

export function launchMessage(game){
 if(game.wave>0)return 'Defense resumed · '+(game.phase==='intermission'?'Wave '+(game.wave+1)+' is next.':'Wave '+game.wave+' is in progress.')+' Your ducks and crumbs are right where you left them.';
 return game.mode==='campaign'?CAMPAIGN[game.level].story:game.mode==='endless'?'All '+Object.keys(DUCKS).length+' ducks unlocked. Scout the pack, build your defense, then send the first wave.':STAGES[game.stage].intro;
}
