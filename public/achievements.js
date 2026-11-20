// Milestones read existing saves only. Recognized achievements remain unlocked after a fresh start.
const amount=v=>Number.isFinite(v)?Math.max(0,Math.min(1e10,v)):0;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const list=v=>Array.isArray(v)?v:[];
const values=v=>Object.values(object(v));
const unique=v=>new Set(list(v).filter(x=>typeof x==='string'&&x.length>0)).size;
function read(storage,key){try{return object(JSON.parse(storage.getItem(key)||'null'));}catch{return {};}}
function scalar(storage,key){try{const v=storage.getItem(key);return v===null?0:amount(Number(v));}catch{return 0;}}
function forge(storage){try{const s=storage.getItem('stellar-forge-save')||'';if(s.length>4e6)return {};return object(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/^SF1-/,'').replaceAll('-','')),c=>c.charCodeAt(0)))));}catch{return {};}}
export function achievementList(storage,stats,catalog,favoriteIds=[]){
 const available=catalog.filter(g=>g.status!=='coming-soon'),byId=new Map(available.map(g=>[g.id,g])),rows=[];
 const tracked=available.map(g=>({game:g,...object(stats?.games?.[g.id])}));
 const played=tracked.filter(g=>amount(g.launches)>0),seconds=tracked.reduce((s,g)=>s+amount(g.seconds),0),launches=tracked.reduce((s,g)=>s+amount(g.launches),0);
 function add(id,title,description,current,target,gameId=null,unit=''){
  if(gameId&&!byId.has(gameId))return;
  current=amount(current);target=Math.max(1,amount(target));const recognized=stats?.unlocked?.[id],at=Number.isFinite(recognized)&&recognized>0&&recognized<=Date.now()?recognized:null,unlocked=!!at||current>=target;
  rows.push({id,title,description,gameId,category:gameId?byId.get(gameId).genre:'Arcade',gameTitle:gameId?byId.get(gameId).title:'Across the arcade',current:Math.min(current,target),target,unit,progress:unlocked?1:Math.min(1,current/target),unlocked,at});
 }
 add('first-launch','Welcome to the arcade','Launch any game.',played.length,1,null,'games');
 add('five-worlds','Five different worlds','Launch five different games.',played.length,5,null,'games');
 add('ten-worlds','Branching out','Launch ten different games.',played.length,10,null,'games');
 add('twenty-worlds','A world of possibilities','Launch twenty different games.',played.length,20,null,'games');
 const main=available.filter(g=>!g.archived);
 if(main.length)add('full-library','The grand tour','Launch every game in the main collection.',played.filter(g=>!g.game.archived).length,main.length,null,'games');
 add('ten-minutes','Settle in','Spend ten minutes in visible games.',seconds,600,null,'seconds');
 add('arcade-regular','Make yourself at home','Spend an hour in visible games.',seconds,3600,null,'seconds');
 add('five-hours','A familiar place','Spend five hours in visible games.',seconds,18000,null,'seconds');
 add('ten-hours','Part of the furniture','Spend ten hours in visible games.',seconds,36000,null,'seconds');
 for(const [id,title,target]of [['ten-launches','Back for more',10],['fifty-launches','Just one more game',50],['hundred-launches','A hundred beginnings',100]])add(id,title,'Launch games '+target+' times in total.',launches,target,null,'launches');
 const genres=new Set(played.map(g=>g.game.genre).filter(Boolean));
 add('three-genres','Mix it up','Try games from three genres.',genres.size,3,null,'genres');
 add('six-genres','A little of everything','Try games from six genres.',genres.size,6,null,'genres');
 const archives=played.filter(g=>g.game.archived).length;
 add('archive-explorer','Hidden gem','Launch a game from Archives.',archives,1,null,'games');
 add('archive-tour','Off the beaten path','Launch five different Archives games.',archives,5,null,'games');
 add('heart-collector','A few favorites','Favorite three games across the arcade.',new Set(list(favoriteIds).filter(id=>byId.has(id))).size,3,null,'favorites');
 const get=key=>read(storage,key),num=(id,title,desc,key,field,target,unit)=>add(id,title,desc,amount(get(key)[field]),target,keyGame(key),unit);
 const keyGame=key=>({'car-spleef-stats-v1':'car-spleef','rhettsArcade.carSpleef3d':'car-spleef-3d','ducks-vs-dogs-save-v1':'ducks-vs-dogs','arcade-tycoon-prototype-v1':'arcade-tycoon','undercroft-save':'the-undercroft','switchyard-stats-v1':'switchyard','rustbound-save-v1':'rustbound'}[key]||key.replace(/-prototype-v1$/,''));
 for(const [id,title,target]of [['boss-breaker','Boss breaker',1],['boss-five','Five rounds of trouble',5],['boss-fifteen','Your own worst enemy',15]])add(id,title,'Win '+target+' boss '+(target===1?'round':'rounds')+' in Square Off.',scalar(storage,'square-off-best'),target,'square-off','rounds');
 for(const [id,title,target]of [['still-standing','Still standing',1],['spleef-ten','The floor is optional',10],['spleef-twenty-five','Last car rolling',25]])num(id,title,'Win '+target+' '+(target===1?'race':'races')+' in Car Spleef.','car-spleef-stats-v1','wins',target,'wins');
 const car3=get('rhettsArcade.carSpleef3d');
 add('spleef3-first','A new dimension','Win a race in Car Spleef 3D.',amount(car3.wins),1,'car-spleef-3d','wins');
 add('spleef3-ten','Three-dimensional champion','Win ten races in Car Spleef 3D.',amount(car3.wins),10,'car-spleef-3d','wins');
 const arenas=values(car3.mapWins).filter(v=>amount(v)>0).length;
 add('spleef3-maps','Changing ground','Win on ten different Car Spleef 3D arenas.',arenas,10,'car-spleef-3d','arenas');
 add('spleef3-all','Every floor falls','Win on all thirty Car Spleef 3D arenas.',arenas,30,'car-spleef-3d','arenas');
 const bombs=Math.max(0,...values(get('crazysort.v1').best).map(amount));
 for(const [id,title,target]of [['sort-25','Keep your cool',25],['sort-75','Sorted under pressure',75],['sort-150','Bomb whisperer',150]])add(id,title,'Sort '+target+' bombs in one Crazy Sort round.',bombs,target,'crazy-sort','bombs');
 const m=get('meridian_space_program_v1');
 for(const [id,title,target]of [['science-100','For science',100],['science-1000','Research department',1000],['science-10000','A universe of questions',10000]])add(id,title,'Earn '+target.toLocaleString()+' total science in Meridian Space Program.',amount(m.totalScience),target,'meridian-space-program','science');
 add('meridian-tech','Better ways to fly','Unlock ten technologies in Meridian Space Program.',Object.entries(object(m.tech)).filter(([id,v])=>id!=='start'&&v===true).length,10,'meridian-space-program','technologies');
 add('meridian-designs','On the drawing board','Save three rocket designs in Meridian Space Program.',values(m.designs).filter(v=>v&&typeof v==='object'&&Object.keys(v).length>0).length,3,'meridian-space-program','designs');
 const medals=values(get('ducks-vs-dogs-save-v1').campaignMedals).filter(v=>['BRONZE','SILVER','GOLD'].includes(v)).length;
 for(const [id,title,target]of [['growing-flock','Growing flock',5],['flock-fifteen','Pond protector',15],['flock-thirty','A decorated flock',30]])add(id,title,'Earn '+target+' campaign medals in Ducks vs Dogs.',medals,target,'ducks-vs-dogs','medals');
 add('flock-endless','Hold the pond','Reach Endless wave ten in Ducks vs Dogs.',amount(get('ducks-vs-dogs-save-v1').bestEndless),10,'ducks-vs-dogs','waves');
 const d=get('ducks-vs-dogs-2-save-v1'),cleared=Object.entries(object(d.cleared)).filter(([id,r])=>/^[1-6]-[1-8]$/.test(id)&&amount(object(r).clears)>0).length;
 for(const [id,title,target]of [['flock2-first','First paddle',1],['flock2-eight','Sunny days',8],['flock2-half','Quite the adventure',24],['flock2-all','Six worlds, one flock',48]])add(id,title,'Clear '+target+' campaign '+(target===1?'level':'levels')+' in Ducks vs. Dogs 2.',cleared,target,'ducks-vs-dogs-2','levels');
 for(const [id,title,target]of [['flock2-ten','Room for more',10],['flock2-twenty','Feathered friends',20],['flock2-collection','The whole flock',34]])add(id,title,'Collect '+target+' ducks in Ducks vs. Dogs 2.',unique(d.owned),target,'ducks-vs-dogs-2','ducks');
 add('flock2-slots','A bigger team','Buy all three loadout expansions in Ducks vs. Dogs 2.',['slot6','slot7','slot8'].filter(k=>object(d.items)[k]===true).length,3,'ducks-vs-dogs-2','expansions');
 for(const [id,title,target]of [['professional','A professional',10],['heist-fifty','A clean getaway',50],['beyond-collection','Beyond the collection',100]])num(id,title,target===100?'Finish the Pocket Heist campaign.':'Clear '+target+' Pocket Heist jobs.','pocket-heist-prototype-v1','cleared',target,'jobs');
 num('steady-hands','Steady hands','Stack ten cargo in Cargo Swing.','cargo-swing-prototype-v1','bestCargo',10,'cargo');
 num('cargo-25','Perfectly balanced','Stack twenty-five cargo in Cargo Swing.','cargo-swing-prototype-v1','bestCargo',25,'cargo');
 for(const [id,title,target]of [['into-the-deep','Into the deep',5],['deep-ten','Below the blue',10],['deep-twenty','Into the unknown',20]])num(id,title,'Reach sector '+target+' in Deep Signal.','deep-signal-prototype-v1','bestDepth',target,'sectors');
 num('neighborhood-favorite','Neighborhood favorite','Reach the second location in Arcade Tycoon.','arcade-tycoon-prototype-v1','level',1,'location upgrades');
 num('tycoon-four','Across the neighborhood','Reach the fourth location in Arcade Tycoon.','arcade-tycoon-prototype-v1','level',3,'location upgrades');
 num('tycoon-million','Arcade empire','Earn one million in lifetime earnings in Arcade Tycoon.','arcade-tycoon-prototype-v1','totalEarned',1000000,'earned');
 const landed=list(get('rustbound-2-demo-v1').campaign?.progress?.landed).filter(v=>typeof v==='string');
 add('second-world','A second world','Land somewhere beyond Cinder in Rustbound Legacy.',landed.some(id=>id!=='cinder')?1:0,1,'rustbound-2','milestone');
 add('five-landings','Leave your footprints','Land on five different worlds in Rustbound Legacy.',new Set(landed).size,5,'rustbound-2','worlds');
 add('rustbound-build','A place among the stars','Build ten buildings in Rustbound.',list(get('rustbound-save-v1').buildings).length,10,'rustbound','buildings');
 const f=forge(storage);
 add('star-collector','Star collector','Earn an achievement in Stellar Forge.',unique(f.ac),1,'stellar-forge','achievements');
 add('forge-ten','Written in the stars','Earn ten achievements in Stellar Forge.',unique(f.ac),10,'stellar-forge','achievements');
 num('undercroft-ten','Down we go','Reach room ten in The Undercroft.','undercroft-save','best',10,'rooms');
 num('undercroft-25','Deeper still','Reach room twenty-five in The Undercroft.','undercroft-save','best',25,'rooms');
 const times=values(get('sb.best')).filter(v=>Number.isFinite(v)&&v>0);
 add('slide-first','Between the doors','Save a winning time in Slide Between.',times.length,1,'slide-between','winning times');
 for(const [id,title,game,target,desc]of [['parcel-500','Special delivery','parcel-panic',500,'Score 500 in Parcel Panic.'],['parcel-2500','Dispatch master','parcel-panic',2500,'Score 2,500 in Parcel Panic.'],['ricochet-500','A beautiful angle','ricochet-club',500,'Score 500 on a Ricochet Club table.'],['night-500','Eyes on the exhibits','odd-hours',500,'Score 500 in Odd Hours.'],['night-1500','Nothing gets past you','odd-hours',1500,'Score 1,500 in Odd Hours.'],['pinball-1000','Keep it rolling','starball',1000,'Score 1,000 in Starball.']])add(id,title,desc,amount(get(game+'-prototype-v1').best),target,game,'points');
 num('six-circuits','Light work','Clear all six Laserline circuits.','laserline-prototype-v1','cleared',6,'circuits');
 num('switch-ten','On the right track','Deliver ten trains across your Switchyard runs.','switchyard-stats-v1','delivered',10,'trains');
 num('switch-hundred','All aboard','Deliver one hundred trains across your Switchyard runs.','switchyard-stats-v1','delivered',100,'trains');
 add('colony-established','Colony established','Complete the Frontier colony goal.',get('frontier-save-v1').colony?.won===true?1:0,1,'frontier','milestone');
 return rows;
}
