import {DIFFICULTIES,balanceFor} from './difficulty.js';
import {NEW_DUCKS} from './expansion.js';
import {buildCampaign} from './campaign.js';
export const ROWS=5,COLS=8,WAVES=5;
export const DUCKS={
 baker:{name:'Breadwinner',cost:50,hp:100,recharge:5,produce:9,description:'Bakes 25 crumbs every 9 seconds.',color:'#e3b67a'},
 shooter:{name:'Puddle Shooter',cost:75,hp:130,recharge:4,rate:1.4,damage:22,description:'Spits water down its lane.',color:'#9fcbbc'},
 guard:{name:'Reed Guard',cost:50,hp:650,recharge:10,description:'A sturdy duck with a reed shield.',color:'#97b894'},
 frost:{name:'Frostbill',cost:125,hp:120,recharge:7,rate:1.7,damage:17,cold:true,description:'Chills dogs and stops their jumps.',color:'#9ccddd'},
 twin:{name:'Double Quack',cost:150,hp:140,recharge:8,rate:1.25,damage:19,pellets:2,description:'Two water shots. Twice the quack.',color:'#b5acd5'},
 splash:{name:'Storm Duck',cost:150,hp:100,recharge:20,blast:280,description:'Arms in 2s; splashes nearby dogs in 3 lanes.',color:'#e5a196'},
 sniper:{name:'Longbill',cost:175,hp:110,recharge:9,rate:2.8,damage:36,pierce:2,description:'A long water jet hits up to two dogs.',color:'#9baec3'},
 medic:{name:'Patchduck',cost:100,hp:140,recharge:8,heal:16,description:'Heals a nearby injured duck every 4 seconds.',color:'#e8d8bd'},
 ember:{name:'Emberbill',cost:175,hp:125,recharge:8,rate:1.6,damage:10,burn:6,description:'Scorches dogs for 4s. Fire ignores bucket armor.',color:'#d6a087'},
 spark:{name:'Spark Duck',cost:225,hp:115,recharge:10,rate:2.6,damage:28,chain:2,description:'Lightning jumps to 2 more nearby dogs.',color:'#b7b0cf'},
 fan:{name:'Fanfeather',cost:200,hp:140,recharge:8,rate:1.8,damage:15,fan:true,description:'Fires down its lane and both neighboring lanes.',color:'#9dbcb7'},
 gust:{name:'Gustwing',cost:150,hp:150,recharge:8,rate:3.8,damage:8,gust:.75,description:'Pushes back a nearby dog. Bosses resist the wind.',color:'#bdd0d2'},
 penny:{name:'Penny Paddler',cost:125,hp:130,recharge:9,bounty:5,description:'Nearby defeats earn +5 crumbs. Bonuses do not stack.',color:'#d3bb81'},
 bramble:{name:'Brambill',cost:125,hp:900,recharge:14,thorns:18,description:'A tough blocker that hurts dogs when bitten.',color:'#96a182'},
 ...NEW_DUCKS
};
export const DOGS={
 mutt:{name:'Muddy Mutt',hp:125,speed:.23,bite:25,reward:10,color:'#b89675'},
 runner:{name:'Dashhound',hp:90,speed:.40,bite:20,reward:12,color:'#c9aa81'},
 helmet:{name:'Bucket Beagle',hp:290,speed:.17,bite:30,reward:18,armor:.8,color:'#b49581'},
 hopper:{name:'Fence Hopper',hp:170,speed:.27,bite:25,reward:16,jump:true,color:'#9b8990'},
 boss:{name:'Big Bark',hp:800,speed:.12,bite:50,reward:60,color:'#9a7d63'},
 howler:{name:'Rally Hound',hp:210,speed:.21,bite:22,reward:22,color:'#b49b80',rally:true},
 poodle:{name:'First-aid Poodle',hp:160,speed:.19,bite:20,reward:24,color:'#d2c5b2',heal:24},
 scout:{name:'Zip Pup',hp:75,speed:.43,bite:15,reward:12,color:'#c9b196',size:.72},
 mastiff:{name:'Marsh Mastiff',hp:620,speed:.13,bite:45,reward:35,color:'#917d6b',size:1.13},
 shield:{name:'Tin Terrier',hp:330,speed:.18,bite:28,reward:26,color:'#a29a90',armor:.55},
 drummer:{name:'Drum Major',hp:230,speed:.19,bite:22,reward:26,color:'#ab8878',inspire:true},
 spitter:{name:'Slobber Spaniel',hp:190,speed:.22,bite:20,reward:24,color:'#a5b192',ranged:true},
 kennel:{name:'Puppy Porter',hp:300,speed:.18,bite:27,reward:28,color:'#a99880',pups:2},
 sprinter:{name:'Whippet Rocket',hp:155,speed:.29,bite:22,reward:22,color:'#c39d8c',sprint:true},
 burrower:{name:'Digger Dachshund',hp:210,speed:.24,bite:25,reward:25,color:'#b9a17b',burrows:true},
 thief:{name:'Biscuit Bandit',hp:175,speed:.30,bite:18,reward:22,color:'#a4a09a',steals:true},
 leech:{name:'Hungry Husky',hp:320,speed:.21,bite:28,reward:28,color:'#a1a6b1',leech:15},
 switcher:{name:'Trail Foxhound',hp:200,speed:.25,bite:24,reward:26,color:'#be9d87',switches:true},
 cleaner:{name:'Washdog',hp:220,speed:.20,bite:22,reward:26,color:'#96b3bc',cleanse:true}
};
export const NEW_DOGS=['scout','mastiff','shield','drummer','spitter','kennel','sprinter','burrower','thief','leech','switcher','cleaner'];
export const DOG_INFO={mutt:'Steady, muddy and hungry.',runner:'Fast paws, lighter health.',helmet:'A bucket reduces shot damage. Fire and Storm Ducks bypass it.',hopper:'Leaps its first duck. Chilling prevents the leap.',boss:'A tough leader. Resists knockback and needs focused fire.',howler:'Nearby dogs move 20% faster. Rally bonuses do not stack.',poodle:'Heals a nearby injured dog every 5 seconds.',scout:'Small and very fast. Fragile once caught.',mastiff:'A slow, heavy dog with lots of health and a strong bite.',shield:'A metal shield blocks 45% of ordinary damage. Burns bypass it.',drummer:'Nearby dogs deal 25% more attack damage. Drum bonuses do not stack.',spitter:'Stops at range, winds up visibly, then spits at a duck.',kennel:'Drops two Zip Pups when defeated. Goose patrols clear the whole family.',sprinter:'Sprints in short bursts. Frost and blockers buy time.',burrower:'Digs under water shots briefly; emerges before biting a blocker. Fire and splashes still work.',thief:'Steals up to 30 crumbs when biting. Defeating it returns the stash.',leech:'Heals itself when it bites. Keep it away from your defenders.',switcher:'Slides into a more weakly defended neighboring lane while far from the pond.',cleaner:'Removes fire, frost and anchors from one nearby dog every 6 seconds.'};
export const STAGES=[
 {id:'pond-gate',name:'Pond Gate',subtitle:'An unwelcome walk in the park.',blocked:[],intro:'First wave: lanes 2 and 4. A Breadwinner and two Puddle Shooters make a good start.'},
 {id:'lily-bend',name:'Lily Bend',subtitle:'A few stones. A few more paws.',blocked:[[0,4],[2,3],[4,4]],intro:'The stones block duck placement. Dogs can walk around them. First wave: lanes 1, 3 and 5.'},
 {id:'moonlit-marsh',name:'Moonlit Marsh',subtitle:'The whole pack is out tonight.',blocked:[[1,4],[3,4],[0,6],[4,6]],intro:'A stronger pack and jumping dogs. Layer your defenses, and use Frostbill to stop leaps.'}
];
export const CAMPAIGN=buildCampaign(DUCKS);
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function duckStats(duck){const def=DUCKS[duck.type],up=duck.level===2;return {...def,hp:Math.round(def.hp*(up?1.5:1)),damage:(def.damage||0)*(up?1.45:1),blast:(def.blast||0)*(up?1.45:1),produce:def.produce?(up?Math.max(4,def.produce-2):def.produce):0,heal:(def.heal||0)*(up?1.5:1),burn:(def.burn||0)*(up?1.5:1),gust:(def.gust||0)*(up?1.4:1),thorns:(def.thorns||0)*(up?1.45:1),bounty:def.bounty?(up?8:def.bounty):0,waveBonus:(def.waveBonus||0)*(up?1.5:1),tempo:(def.tempo||0)*(up?1.25:1),root:(def.root||0)*(up?1.25:1)};}
export function upgradeCost(duck){return Math.ceil(DUCKS[duck.type].cost*.8);}
export class Pond{
 constructor(stage=0,seed=Date.now(),options={}){
  this.stage=Number.isInteger(stage)&&STAGES[stage]?stage:0;this.seed=(seed>>>0)||1;
  Object.assign(this,{phase:'planning',time:0,wave:0,waveTime:0,between:0,crumbs:200,income:7,nextId:1,ducks:[],dogs:[],shots:[],patrols:[true,true,true,true,true],cooldowns:Object.fromEntries(Object.keys(DUCKS).map(k=>[k,0])),schedule:[],spawnIndex:0,kills:0,events:[],result:null});
  this.mode=['campaign','endless'].includes(options.mode)?options.mode:'legacy';this.level=Number.isInteger(options.level)&&CAMPAIGN[options.level]?options.level:0;this.lessonStep=0;this.lessonSkipped=false;
  this.difficulty=this.mode==='campaign'?(options.difficulty==='original'?'original':Object.hasOwn(DIFFICULTIES,options.difficulty)?options.difficulty:'normal'):'original';
  if(this.mode==='campaign'){const level=CAMPAIGN[this.level];this.stage=level.stage;const lessonCost=level.steps.reduce((sum,s)=>sum+DUCKS[s.duck].cost,0);this.crumbs=Math.max(lessonCost,Math.floor(level.crumbs*balanceFor(this).starting/5)*5);}
  this.schedule=this.makeWave(1);
 }
 crumbReward(amount){return Math.max(1,Math.floor(amount*balanceFor(this).crumbs));}
 clearReward(){return this.crumbReward(50)+Math.max(0,...this.ducks.filter(d=>d.hp>0).map(d=>duckStats(d).waveBonus));}
 get maxWaves(){return this.mode==='endless'?Infinity:this.mode==='campaign'?CAMPAIGN[this.level].waves.length:WAVES;}
 get allowedTypes(){return this.mode==='campaign'?CAMPAIGN.slice(0,this.level+1).map(l=>l.duck):Object.keys(DUCKS);}
 get activeRows(){return this.mode==='campaign'?CAMPAIGN[this.level].rows:[0,1,2,3,4];}
 get clearedWaves(){return Math.max(0,this.wave-(this.phase==='wave'||this.phase==='lost'?1:0));}
 lesson(){return this.mode==='campaign'&&this.wave===0&&!this.lessonSkipped?CAMPAIGN[this.level].steps[this.lessonStep]||null:null;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 makeWave(wave){
  if(this.mode==='campaign')return (CAMPAIGN[this.level].waves[wave-1]||[]).map(d=>({...d}));
  if(this.mode==='endless'){const count=Math.min(32,4+wave*2),list=[];for(let i=0;i<count;i++){let type='mutt';if(wave>=2&&i%4===3)type='runner';if(wave>=3&&i%5===4)type='helmet';if(wave>=4&&i%6===5)type='hopper';if(wave>=6&&i%7===6)type='howler';if(wave>=7&&i%8===7)type='poodle';if(wave>=8&&i%3===2){const pool=NEW_DOGS.slice(0,Math.min(12,(wave-7)*2));type=pool[(i+wave)%pool.length];}list.push({at:2+i*Math.max(.8,3.5-wave*.1)+this.random()*.25,lane:(i+wave)%5,type});}if(wave%5===0)list.push({at:list.at(-1).at+3,lane:wave%5,type:'boss'});return list;}
  const count=[4,6,8,10,12][wave-1]+this.stage*2,lanes=wave===1?(this.stage===0?[1,3]:[0,2,4]):wave===2&&this.stage===0?[0,2,4]:[0,1,2,3,4],list=[];
  // An even lane distribution gives the player a readable plan instead of sudden random lane piles.
  const offset=Math.floor(this.random()*lanes.length);
  for(let i=0;i<count;i++){
   const lane=lanes[(i+offset)%lanes.length];let type='mutt';
   if(wave>=2&&i%4===3)type='runner';if(wave>=3&&i%5===4)type='helmet';if(this.stage>=1&&wave>=2&&i%6===5)type='hopper';
   if(wave>=4&&i%7===6)type='howler';if(wave>=4&&this.stage>=1&&i%8===7||wave===5&&i===count-2)type='poodle';
   list.push({at:1+i*(wave===1?3.4:2.35)+this.random()*.45,lane,type});
  }
  if(wave===WAVES)list.push({at:list.at(-1).at+2,lane:2,type:'boss'});
  return list;
 }
 canPlace(type,row,col){
  if(this.result||!DUCKS[type])return 'Choose a duck first.';
  if(!this.allowedTypes.includes(type))return 'This duck joins in a later campaign level.';
  if(!Number.isInteger(row)||!Number.isInteger(col)||row<0||row>=ROWS||col<0||col>=COLS)return 'Choose a square inside the garden.';
  if(!this.activeRows.includes(row))return 'This lane is closed for this lesson.';
  if(STAGES[this.stage].blocked.some(([r,c])=>r===row&&c===col))return 'A stone is in the way.';
  if(this.ducks.some(d=>d.row===row&&d.col===col))return 'There is already a duck here.';
  if(this.cooldowns[type]>0)return 'That duck is getting ready. Give it a moment.';
  if(this.crumbs<DUCKS[type].cost)return 'Not enough breadcrumbs.';
  return null;
 }
 place(type,row,col){const error=this.canPlace(type,row,col);if(error)return {error};const def=DUCKS[type];this.crumbs-=def.cost;this.cooldowns[type]=def.recharge;const duck={id:this.nextId++,type,row,col,hp:def.hp,level:1,fire:.5,produce:def.produce||0,arm:2,flash:0,heal:4};this.ducks.push(duck);const lesson=this.lesson();if(lesson&&lesson.duck===type&&lesson.row===row&&lesson.col===col)this.lessonStep++;this.events.push({type:'place',row,col});return {duck};}
 upgrade(row,col){const d=this.ducks.find(d=>d.row===row&&d.col===col);if(this.result||!d)return {error:'Choose a duck on the board to upgrade.'};if(d.level===2)return {error:'This duck is already upgraded.'};const cost=upgradeCost(d);if(this.crumbs<cost)return {error:'This upgrade needs '+cost+' breadcrumbs.'};const ratio=d.hp/duckStats(d).hp;this.crumbs-=cost;d.level=2;d.hp=duckStats(d).hp*ratio;if(d.produce)d.produce=Math.min(d.produce,duckStats(d).produce);this.events.push({type:'upgrade',row,col,x:col+.5});return {duck:d,cost};}
 remove(row,col){if(this.result)return false;const d=this.ducks.find(d=>d.row===row&&d.col===col);if(!d)return false;const paid=DUCKS[d.type].cost+(d.level===2?upgradeCost(d):0),refund=Math.floor(paid*.5*Math.max(0,d.hp)/duckStats(d).hp);this.crumbs+=refund;this.ducks=this.ducks.filter(x=>x!==d);this.events.push({type:'remove',row,col,refund});return true;}
 startWave(){if(this.result||!['planning','intermission'].includes(this.phase)||this.lesson())return false;this.wave++;this.waveTime=0;this.spawnIndex=0;this.phase='wave';this.between=0;this.events.push({type:'wave',wave:this.wave});return true;}
 spawn(spec){const def=DOGS[spec.type],scale=this.mode==='endless'?Math.min(6,1+(this.wave-1)*.085):1+this.stage*.15;const dog={id:this.nextId++,type:spec.type,row:spec.lane,x:8.8,hp:def.hp*scale*balanceFor(this).health,maxHp:def.hp*scale*balanceFor(this).health,slow:0,root:0,bite:0,jumped:false,air:0,flash:0,heal:5,burn:0,burnDps:0,ability:3,burrow:0,sprinting:0,laneFrom:spec.lane,laneTime:0,windup:0,aim:0,loot:0};this.dogs.push(dog);return dog;}
 hit(dog,damage,cold=false,ignoreArmor=false){if(dog.hp<=0)return;dog.hp-=damage*(ignoreArmor?1:DOGS[dog.type].armor||1);dog.flash=.13;if(cold)dog.slow=3;if(dog.hp<=0){this.kills++;this.crumbs+=this.crumbReward(DOGS[dog.type].reward)+(dog.loot||0);if(dog.loot)this.events.push({type:'refund',row:dog.row,x:dog.x,amount:dog.loot});if(DOGS[dog.type].pups&&this.dogs.length<150){for(let i=0;i<DOGS[dog.type].pups;i++){const pup=this.spawn({type:'scout',lane:dog.row});pup.x=Math.max(.2,Math.min(8.8,dog.x+i*.35));}this.events.push({type:'puppies',row:dog.row,x:dog.x});}const bonus=Math.max(0,...this.ducks.filter(d=>d.hp>0&&DUCKS[d.type].bounty&&Math.abs(d.row-dog.row)<=1&&Math.abs(d.col+.5-dog.x)<=2.25).map(d=>duckStats(d).bounty));if(bonus){this.crumbs+=bonus;this.events.push({type:'bonus',row:dog.row,x:dog.x,amount:bonus});}this.events.push({type:'defeat',row:dog.row,x:dog.x});}}
 finish(won){if(this.result)return;this.phase=won?'won':'lost';const left=this.activeRows.filter(row=>this.patrols[row]).length;this.result={won,mode:this.mode,difficulty:this.difficulty,level:this.level,stage:this.stage,kills:this.kills,waves:this.wave,patrols:left,medal:won?(left>=Math.max(1,this.activeRows.length-1)?'GOLD':left>=Math.ceil(this.activeRows.length*.4)?'SILVER':'BRONZE'):null};this.events.push({type:won?'win':'lose'});}
 step(dt){this.events=[];if(this.result||!Number.isFinite(dt)||dt<=0)return;if(this.phase==='planning'){for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-Math.min(dt,2));return;}let remaining=Math.min(dt,2);while(remaining>1e-8&&!this.result){const tick=Math.min(1/60,remaining);this.tick(tick);remaining-=tick;}}
 tick(dt){
  this.time+=dt;for(const key of Object.keys(this.cooldowns))this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
  this.income-=dt;if(this.income<=0){this.income+=7;const amount=this.crumbReward(25);this.crumbs+=amount;this.events.push({type:'income',amount});}
  if(this.phase==='intermission'){this.between-=dt;if(this.between<=0)this.startWave();}
  if(this.phase==='wave'){
   this.waveTime+=dt;while(this.spawnIndex<this.schedule.length&&this.schedule[this.spawnIndex].at<=this.waveTime){this.spawn(this.schedule[this.spawnIndex++]);}
  }
  const tempos=this.ducks.filter(d=>d.hp>0&&DUCKS[d.type].tempo);
  for(const duck of this.ducks){const def=duckStats(duck);duck.flash=Math.max(0,duck.flash-dt);const tempo=Math.max(0,...tempos.filter(d=>d!==duck&&Math.abs(d.row-duck.row)<=1&&Math.abs(d.col-duck.col)<=2).map(d=>DUCKS[d.type].tempo*(d.level===2?1.25:1)));duck.fire-=dt*(1+tempo);
   if(def.reveal){for(const dog of this.dogs)if(dog.hp>0&&dog.burrow>0&&Math.abs(dog.row-duck.row)<=1&&Math.abs(dog.x-duck.col-.5)<=2.5){dog.burrow=0;this.events.push({type:'reveal',row:dog.row,x:dog.x});}}
   if(def.heal){duck.heal-=dt;if(duck.heal<=0){duck.heal+=4;const targets=this.ducks.filter(d=>d.hp>0&&d.hp<duckStats(d).hp&&Math.abs(d.row-duck.row)<=1&&Math.abs(d.col-duck.col)<=2).sort((a,b)=>a.hp/duckStats(a).hp-b.hp/duckStats(b).hp);for(const target of (def.healAll?targets:targets.slice(0,1))){const amount=Math.min(def.heal,duckStats(target).hp-target.hp);target.hp+=amount;this.events.push({type:'heal',row:target.row,x:target.col+.5,amount});}}}
   if(def.produce){duck.produce-=dt;if(duck.produce<=0){duck.produce+=def.produce;const amount=def.harvest||25;this.crumbs+=amount;this.events.push({type:'crumb',row:duck.row,x:duck.col+.5,amount});}}
   if(def.blast){duck.arm=Math.max(0,duck.arm-dt);if(duck.arm===0&&this.dogs.some(d=>d.hp>0&&Math.abs(d.row-duck.row)<=1&&Math.abs(d.x-(duck.col+.5))<1.7)){for(const d of this.dogs)if(d.hp>0&&Math.abs(d.row-duck.row)<=1&&Math.abs(d.x-(duck.col+.5))<1.7)this.hit(d,def.blast,false,true);duck.hp=0;this.events.push({type:'splash',row:duck.row,x:duck.col+.5});}}
   if(def.gust&&duck.fire<=0){const target=this.dogs.filter(d=>d.hp>0&&!d.burrow&&d.row===duck.row&&d.x>duck.col+.15&&d.x<duck.col+3.25).sort((a,b)=>a.x-b.x)[0];if(target){duck.fire=def.rate;duck.flash=.15;this.hit(target,def.damage);if(target.hp>0)target.x=Math.min(8.8,target.x+def.gust*(target.type==='boss'?.24:1));this.events.push({type:'gust',row:duck.row,x:duck.col+.5});}}
   if(def.melee&&duck.fire<=0){const target=this.dogs.filter(d=>d.hp>0&&!d.burrow&&d.row===duck.row&&d.x>=duck.col+.15&&d.x<=duck.col+.5+def.melee).sort((a,b)=>a.x-b.x)[0];if(target){duck.fire=def.rate;duck.flash=.15;this.hit(target,def.damage);this.events.push({type:'slash',row:duck.row,x:duck.col+.5,to:target.x});}}
   if(def.lob&&duck.fire<=0){const target=this.dogs.filter(d=>d.hp>0&&d.row===duck.row&&d.x>duck.col+.15).sort((a,b)=>a.x-b.x)[0];if(target){duck.fire=def.rate;duck.flash=.15;this.shots.push({id:this.nextId++,row:duck.row,x:duck.col+.85,from:duck.col+.85,impact:target.x,flight:.7,age:0,lob:true,radius:def.radius,blastRows:def.blastRows,damage:def.damage,cold:false,pierce:1,hits:[],burn:0,chain:0,direction:1,root:0});this.events.push({type:'lob',row:duck.row});}}
   if(def.rate&&!def.gust&&!def.melee&&!def.lob&&duck.fire<=0&&this.dogs.some(d=>d.hp>0&&!d.burrow&&(def.fan?Math.abs(d.row-duck.row)<=1:d.row===duck.row)&&(def.backward||d.x>duck.col+.15))){
    duck.fire=def.rate;duck.flash=.15;const rows=def.fan?[duck.row-1,duck.row,duck.row+1].filter(r=>this.activeRows.includes(r)):[duck.row];for(const row of rows)for(const direction of (def.backward?[1,-1]:[1]))for(let i=0;i<(def.pellets||1);i++)this.shots.push({id:this.nextId++,row,x:duck.col+(direction===1?.85:.15)-i*.22*direction,damage:def.damage,cold:!!def.cold,pierce:def.pierce||1,hits:[],burn:def.burn||0,chain:def.chain||0,direction,root:def.root||0});
    this.events.push({type:'shoot',row:duck.row});
   }
  }
  for(const shot of this.shots){shot.pierce??=1;shot.hits??=[];shot.direction??=1;shot.root??=0;if(shot.lob){shot.age=Math.min(shot.flight,shot.age+dt);shot.x=shot.from+(shot.impact-shot.from)*shot.age/shot.flight;if(shot.age>=shot.flight){for(const dog of this.dogs)if(dog.hp>0&&Math.abs(dog.row-shot.row)<=shot.blastRows&&Math.abs(dog.x-shot.impact)<=shot.radius)this.hit(dog,shot.damage,false,true);shot.gone=true;this.events.push({type:'impact',row:shot.row,x:shot.impact,radius:shot.radius,rows:shot.blastRows});}continue;}const next=shot.x+4.8*dt*shot.direction,targets=this.dogs.filter(d=>d.hp>0&&!d.burrow&&d.row===shot.row&&!shot.hits.includes(d.id)&&d.x>=Math.min(shot.x,next)-.25&&d.x<=Math.max(shot.x,next)+.27).sort((a,b)=>(a.x-b.x)*shot.direction);for(const target of targets){this.hit(target,shot.damage,shot.cold);if(shot.root&&target.hp>0)target.root=Math.max(target.root,shot.root*(target.type==='boss'?.35:1));if(shot.burn&&target.hp>0){target.burnDps=Math.max(target.burn>0?target.burnDps:0,shot.burn);target.burn=4;}if(shot.chain){const seen=new Set([target.id]),points=[{row:target.row,x:target.x}];let previous=target;for(let hop=1;hop<=shot.chain;hop++){const nextDog=this.dogs.filter(d=>d.hp>0&&!d.burrow&&!seen.has(d.id)&&Math.abs(d.row-previous.row)<=1&&Math.abs(d.x-previous.x)<=1.6).sort((a,b)=>Math.hypot(a.x-previous.x,a.row-previous.row)-Math.hypot(b.x-previous.x,b.row-previous.row)||a.id-b.id)[0];if(!nextDog)break;seen.add(nextDog.id);this.hit(nextDog,shot.damage*Math.pow(.65,hop));points.push({row:nextDog.row,x:nextDog.x});previous=nextDog;}this.events.push({type:'lightning',row:target.row,x:target.x,points});}shot.hits.push(target.id);if(--shot.pierce===0){shot.gone=true;break;}}shot.x=next;if(next>9.4||next<-.4)shot.gone=true;}
  this.shots=this.shots.filter(s=>!s.gone);
  const rally=this.dogs.filter(d=>d.hp>0&&DOGS[d.type].rally),drummers=this.dogs.filter(d=>d.hp>0&&DOGS[d.type].inspire);
  for(const dog of this.dogs){if(dog.hp<=0)continue;const def=DOGS[dog.type];this.dogAbility(dog,dt);if(dog.burn>0){const elapsed=Math.min(dt,dog.burn);dog.burn=Math.max(0,dog.burn-dt);this.hit(dog,elapsed*dog.burnDps,false,true);if(dog.hp<=0)continue;if(dog.burn===0)dog.burnDps=0;}dog.root=Math.max(0,(dog.root||0)-dt);dog.slow=Math.max(0,dog.slow-dt);dog.air=Math.max(0,dog.air-dt);dog.flash=Math.max(0,dog.flash-dt);dog.bite=Math.max(0,dog.bite-dt);
   if(def.heal){dog.heal-=dt;if(dog.heal<=0){dog.heal+=5;const target=this.dogs.filter(d=>d.hp>0&&d.hp<d.maxHp&&Math.abs(d.row-dog.row)<=1&&Math.abs(d.x-dog.x)<=1.5).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(target){target.hp=Math.min(target.maxHp,target.hp+def.heal);this.events.push({type:'dogHeal',row:target.row,x:target.x});}}}
   const duck=this.ducks.filter(d=>d.hp>0&&d.row===dog.row&&d.col+.5<=dog.x+.35).sort((a,b)=>b.col-a.col)[0];
   if(dog.burrow>0&&duck&&dog.x-(duck.col+.5)<1.1)dog.burrow=0;
   const attackPower=def.bite*(drummers.some(d=>d!==dog&&d.hp>0&&Math.abs(d.row-dog.row)<=1&&Math.abs(d.x-dog.x)<1.5)?1.25:1);
   if(def.ranged&&duck&&dog.x-(duck.col+.5)<2.5&&dog.x>duck.col+.5){if(dog.windup>0){dog.windup=Math.max(0,dog.windup-dt);if(dog.windup===0){const target=this.ducks.find(d=>d.id===dog.aim&&d.hp>0&&d.row===dog.row&&Math.abs(d.col+.5-dog.x)<2.8);if(target){target.hp-=attackPower*(DUCKS[target.type].armor||1);target.flash=.2;this.events.push({type:'spit',row:dog.row,x:dog.x,to:target.col+.5});}dog.aim=0;dog.bite=2.5;}}else if(dog.bite===0){dog.windup=.65;dog.aim=duck.id;}}
   else if(!dog.burrow&&duck&&dog.x-(duck.col+.5)<.72&&dog.air===0){
    if(def.jump&&!dog.jumped&&dog.slow===0){dog.x-=1.15;dog.jumped=true;dog.air=.5;this.events.push({type:'jump',row:dog.row,x:dog.x});}
    else if(dog.bite===0){duck.hp-=attackPower*(DUCKS[duck.type].armor||1);dog.bite=1;if(def.leech){dog.hp=Math.min(dog.maxHp,dog.hp+def.leech);this.events.push({type:'dogHeal',row:dog.row,x:dog.x});}if(def.steals&&dog.loot<30){const amount=Math.min(10,this.crumbs,30-dog.loot);this.crumbs-=amount;dog.loot+=amount;if(amount)this.events.push({type:'steal',row:dog.row,x:dog.x,amount});}duck.flash=.2;const thorns=duckStats(duck).thorns;if(thorns){this.hit(dog,thorns);this.events.push({type:'thorns',row:duck.row,x:duck.col+.5});}this.events.push({type:'bite',row:dog.row,x:dog.x});}
   }else{dog.windup=0;dog.aim=0;dog.x-=def.speed*balanceFor(this).speed*(dog.root>0?0:1)*(dog.sprinting>0?1.8:1)*(dog.slow>0?.48:1)*(rally.some(d=>d!==dog&&d.hp>0&&Math.abs(d.row-dog.row)<=1&&Math.abs(d.x-dog.x)<1.5)?1.2:1)*dt;}
   if(dog.x<-.25){if(this.patrols[dog.row]){this.patrols[dog.row]=false;for(const other of this.dogs)if(other.row===dog.row&&other.hp>0){other.hp=0;this.kills++;if(other.loot){this.crumbs+=other.loot;this.events.push({type:'refund',row:other.row,x:other.x,amount:other.loot});}}this.events.push({type:'patrol',row:dog.row});}else{this.finish(false);break;}}
  }
  for(const d of this.ducks)if(d.hp<=0)this.events.push({type:'duckLost',row:d.row,x:d.col+.5});
  this.ducks=this.ducks.filter(d=>d.hp>0);this.dogs=this.dogs.filter(d=>d.hp>0);
  if(!this.result&&this.phase==='wave'&&this.spawnIndex===this.schedule.length&&this.dogs.length===0){const amount=this.clearReward();this.crumbs+=amount;this.events.push({type:'clear',wave:this.wave,amount});if(this.wave===this.maxWaves)this.finish(true);else{this.phase='intermission';this.between=10;this.schedule=this.makeWave(this.wave+1);this.spawnIndex=0;}}
 }
 dogAbility(d,dt){
  const def=DOGS[d.type];d.ability=Math.max(0,d.ability-dt);d.burrow=Math.max(0,d.burrow-dt);d.sprinting=Math.max(0,d.sprinting-dt);d.laneTime=Math.max(0,d.laneTime-dt);
  if(d.ability>0)return;
  if(def.sprint){d.sprinting=1.25;d.ability=5.5;this.events.push({type:'sprint',row:d.row,x:d.x});}
  if(def.burrows){const near=this.ducks.some(duck=>duck.hp>0&&duck.row===d.row&&Math.abs(duck.col+.5-d.x)<1.4);if(d.x>2&&!near){d.burrow=1.4;this.events.push({type:'burrow',row:d.row,x:d.x});}d.ability=6;}
  if(def.switches){d.ability=7;if(d.x>4){const strength=row=>this.ducks.filter(duck=>duck.hp>0&&duck.row===row&&DUCKS[duck.type].rate).length,rows=this.activeRows.filter(row=>Math.abs(row-d.row)===1).sort((a,b)=>strength(a)-strength(b)||a-b);if(rows.length&&strength(rows[0])<strength(d.row)){d.laneFrom=d.row;d.row=rows[0];d.laneTime=.6;this.events.push({type:'switch',row:d.row,x:d.x});}}}
  if(def.cleanse){d.ability=6;const target=this.dogs.filter(dog=>dog.hp>0&&(dog.burn>0||dog.slow>0||dog.root>0)&&Math.abs(dog.row-d.row)<=1&&Math.abs(dog.x-d.x)<1.5).sort((a,b)=>(b.burn+b.slow)-(a.burn+a.slow))[0];if(target){target.burn=0;target.burnDps=0;target.slow=0;target.root=0;this.events.push({type:'wash',row:target.row,x:target.x});}}
 }
 serialize(){const {events,...state}=this;return JSON.stringify({version:1,...state});}
 static restore(raw){
  try{const s=JSON.parse(raw);s.mode??='legacy';s.difficulty??='original';if(s.difficulty!=='original'&&!Object.hasOwn(DIFFICULTIES,s.difficulty))return null;s.level??=0;s.lessonStep??=0;s.lessonSkipped??=false;if(!['legacy','campaign','endless'].includes(s.mode)||!Number.isInteger(s.level)||!CAMPAIGN[s.level]||!Number.isInteger(s.lessonStep)||s.lessonStep<0||s.lessonStep>CAMPAIGN[s.level].steps.length||typeof s.lessonSkipped!=='boolean')return null;const max=s.mode==='endless'?1000000:s.mode==='campaign'?CAMPAIGN[s.level].waves.length:WAVES;if(s.version!==1||!Number.isInteger(s.stage)||!STAGES[s.stage]||!Number.isInteger(s.seed)||!['planning','wave','intermission','won','lost'].includes(s.phase)||!finite(s.time,0,1e7)||!Number.isInteger(s.wave)||s.wave<0||s.wave>max||!finite(s.crumbs,0,1e8)||!finite(s.income,0,7.01)||!finite(s.waveTime,0,1e7)||!finite(s.between,0,10.01)||!Number.isSafeInteger(s.nextId)||s.nextId<1)return null;
   if(!Array.isArray(s.patrols)||s.patrols.length!==ROWS||s.patrols.some(v=>typeof v!=='boolean')||!Array.isArray(s.ducks)||s.ducks.length>40||!Array.isArray(s.dogs)||s.dogs.length>160||!Array.isArray(s.shots)||s.shots.length>512||!Array.isArray(s.schedule)||s.schedule.length>40||!Number.isInteger(s.spawnIndex)||s.spawnIndex<0||s.spawnIndex>s.schedule.length)return null;
   const cells=new Set(),ids=new Set();const id=n=>{if(!Number.isSafeInteger(n)||n<=0||n>=s.nextId||ids.has(n))return false;ids.add(n);return true;},row=r=>Number.isInteger(r)&&r>=0&&r<ROWS;
   for(const d of s.ducks){d.level??=1;d.heal??=4;const key=d.row+':'+d.col;if(!DUCKS[d.type]||![1,2].includes(d.level)||!finite(d.heal,0,4)||!id(d.id)||!row(d.row)||!Number.isInteger(d.col)||d.col<0||d.col>=COLS||cells.has(key)||STAGES[s.stage].blocked.some(([r,c])=>r===d.row&&c===d.col)||!finite(d.hp,.001,duckStats(d).hp)||!finite(d.fire,-1e7,10)||!finite(d.produce,0,DUCKS[d.type].produce||0)||!finite(d.arm,0,2)||!finite(d.flash,0,1))return null;cells.add(key);}
   for(const d of s.dogs){d.heal??=5;d.root??=0;d.burn??=0;d.burnDps??=0;d.ability??=3;d.burrow??=0;d.sprinting??=0;d.laneFrom??=d.row;d.laneTime??=0;d.windup??=0;d.aim??=0;d.loot??=0;if(!finite(d.root,0,1)||!finite(d.ability,0,8)||!finite(d.burrow,0,1.4)||!finite(d.sprinting,0,1.25)||!row(d.laneFrom)||!finite(d.laneTime,0,.6)||!finite(d.windup,0,.65)||!Number.isSafeInteger(d.aim)||d.aim<0||d.aim>=s.nextId||!finite(d.loot,0,30)||!finite(d.burn,0,4)||!finite(d.burnDps,0,20)||!DOGS[d.type]||!finite(d.heal,0,5)||!id(d.id)||!row(d.row)||!finite(d.x,-1,9)||!finite(d.hp,.001,5000)||!finite(d.maxHp,d.hp,5000)||!finite(d.slow,0,3)||!finite(d.bite,0,2.5)||!finite(d.air,0,.5)||!finite(d.flash,0,1)||typeof d.jumped!=='boolean')return null;}
   for(const shot of s.shots){shot.pierce??=1;shot.hits??=[];shot.burn??=0;shot.chain??=0;shot.direction??=1;shot.root??=0;if(![1,-1].includes(shot.direction)||!finite(shot.root,0,1)||shot.lob!==undefined&&typeof shot.lob!=='boolean')return null;if(shot.lob&&(!finite(shot.from,-1,9)||!finite(shot.impact,-1,9)||!finite(shot.flight,.1,2)||!finite(shot.age,0,shot.flight)||!finite(shot.radius,.1,2)||![0,1].includes(shot.blastRows)))return null;if(!finite(shot.burn,0,20)||![0,2].includes(shot.chain)||!id(shot.id)||!row(shot.row)||!finite(shot.x,-1,10)||!finite(shot.damage,0,100)||typeof shot.cold!=='boolean'||![1,2].includes(shot.pierce)||!Array.isArray(shot.hits)||shot.hits.length>1||shot.hits.some(n=>!Number.isSafeInteger(n)||n<1||n>=s.nextId))return null;}
   for(const item of s.schedule)if(!row(item.lane)||!DOGS[item.type]||!finite(item.at,0,200))return null;
   if(!s.cooldowns||typeof s.cooldowns!=='object')return null;
   for(const key of Object.keys(DUCKS)){if(['sniper','medic','ember','spark','fan','gust','penny','bramble',...Object.keys(NEW_DUCKS)].includes(key)&&s.cooldowns[key]===undefined)s.cooldowns[key]=0;if(!finite(s.cooldowns[key],0,DUCKS[key].recharge))return null;}
   if(!Number.isSafeInteger(s.kills)||s.kills<0||s.kills>1000000000)return null;
   const game=new Pond(s.stage,s.seed,{mode:s.mode,level:s.level,difficulty:s.difficulty});if(s.mode==='campaign'&&(s.stage!==game.stage||s.ducks.some(d=>!game.allowedTypes.includes(d.type)||!game.activeRows.includes(d.row))||s.schedule.some(d=>!game.activeRows.includes(d.lane))))return null;game.lessonStep=s.lessonStep;game.lessonSkipped=s.lessonSkipped;for(const key of ['phase','time','wave','waveTime','between','crumbs','income','nextId','spawnIndex','kills','seed'])game[key]=s[key];
   game.ducks=s.ducks.map(d=>({...d}));game.dogs=s.dogs.map(d=>({...d}));game.shots=s.shots.map(d=>({...d}));game.schedule=s.schedule.map(d=>({...d}));game.patrols=[...s.patrols];game.cooldowns={...s.cooldowns};
   if(s.phase==='won'&&(s.mode==='endless'||s.wave!==max||s.dogs.length||s.spawnIndex!==s.schedule.length))return null;
   if(s.phase==='won'||s.phase==='lost'){game.result=null;game.finish(s.phase==='won');game.events=[];}else if(s.result!==null)return null;
   return game;
  }catch{return null;}
 }
}
