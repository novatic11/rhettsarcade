// Stable key keeps every pre-release arcade intact.
export const SAVE_KEY='arcade-tycoon-prototype-v1';
export const SETTINGS_KEY='arcade-tycoon-settings-v1';
export const TYPES={
 cabinet:{name:'Classic cabinet',cost:180,pay:6,duration:7,unlock:0,color:'#79bed7',kind:'game',description:'The dependable crowd-pleaser. $6 per play.'},
 pinball:{name:'Pinball table',cost:340,pay:10,duration:9,unlock:8,color:'#b5a1df',kind:'game',description:'A silver-ball classic. $10 per play.'},
 claw:{name:'Claw machine',cost:520,pay:15,duration:11,unlock:25,color:'#de9bb6',kind:'game',description:'Plush prizes and big dreams. $15 per play.'},
 racer:{name:'Racing cabinet',cost:680,pay:18,duration:12,unlock:50,color:'#e49a76',kind:'game',description:'Coastal roads and friendly competition. $18 per play.'},
 basketball:{name:'Hoop shot',cost:850,pay:23,duration:13,unlock:85,color:'#edb576',kind:'game',description:'A miniature basketball court. $23 per play.'},
 dance:{name:'Dance stage',cost:1100,pay:30,duration:14,unlock:125,color:'#ed91ae',kind:'game',description:'Light-up arrows, loud beats, a crowd favorite. $30 per play.'},
 hockey:{name:'Air hockey',cost:1400,pay:38,duration:16,unlock:180,color:'#7ed6d2',kind:'game',description:'Fast pucks and friendly rivalries. $38 per play.'},
 snack:{name:'Snack machine',cost:290,pay:8,duration:5,unlock:0,color:'#c5cf8b',kind:'game',description:'Customers get hungry. Give them a quick snack between games.'},
 plant:{name:'Potted plant',cost:45,color:'#8fc49c',kind:'decor',description:'A little greenery brings more visitors.'},
 bench:{name:'Waiting bench',cost:65,color:'#a2bad7',kind:'decor',description:'Gives waiting customers eight seconds more patience.'},
 lamp:{name:'Floor lamp',cost:90,color:'#f1c997',kind:'decor',description:'Warm pools of light make your arcade more inviting.'},
 poster:{name:'Poster stand',cost:75,color:'#b9a4dd',kind:'decor',description:'Local character helps bring visitors through the door.'}
};
export const EXPANSIONS=[
 {w:9,h:6,cost:0,plays:0,name:'Corner Arcade',rent:20},
 {w:11,h:7,cost:1200,plays:45,name:'Neighborhood Favorite',rent:30},
 {w:13,h:8,cost:2800,plays:120,name:'High Street Arcade',rent:40},
 {w:15,h:9,cost:6000,plays:250,name:'Downtown Destination',rent:55},
 {w:17,h:10,cost:12000,plays:450,name:'The Grand Arcade',rent:75}
];
export const STAFF={mechanic:{name:'Mechanic',cost:220,wage:18,description:'Walks to damaged machines and repairs them. $18 per day.'},host:{name:'Floor host',cost:160,wage:12,description:'Welcomes more visitors and gives them eight seconds more patience. $12 per day.'}};
export const UPGRADES={tokens:{name:'Token club',cost:650,description:'Members pay 20% more at every attraction.'},service:{name:'Quick-start kits',cost:900,description:'All attractions finish games 15% faster.'}};
export const MILESTONES=[
 {id:'first-ten',name:'A proper opening',detail:'Complete 10 paid plays',reward:100,test:g=>g.plays>=10},
 {id:'variety',name:'Something for everyone',detail:'Own 5 different attractions',reward:250,test:g=>new Set(g.games.map(i=>i.type)).size>=5},
 {id:'regulars',name:'Neighborhood favorite',detail:'Reach 80 reputation',reward:300,test:g=>g.reputation>=80},
 {id:'turnover',name:'The quarters add up',detail:'Earn $3,000 in total',reward:500,test:g=>g.totalEarned>=3000},
 {id:'empire',name:'Room for an empire',detail:'Reach High Street (third location)',reward:900,test:g=>g.level>=2},
 {id:'downtown',name:'The place to be',detail:'Reach Downtown and own 10 attractions',reward:1500,test:g=>g.level>=3&&g.games.length>=10},
 {id:'grand',name:'Your arcade empire',detail:'Grand Arcade · 16 attractions · all 8 types · 85 reputation · $40,000 earned',reward:5000,test:g=>g.level===4&&g.games.length>=16&&new Set(g.games.map(i=>i.type)).size===8&&g.reputation>=85&&g.totalEarned>=40000}
];
const pos=(x,y)=>x+','+y;
const finite=(n,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
export class Tycoon{
 constructor(random=Math.random){Object.assign(this,{random,cash:700,totalEarned:0,plays:0,day:1,dayTime:0,level:0,reputation:50,open:false,items:[],guests:[],nextId:1,spawnIn:1,events:[],time:0,staff:{mechanic:false,host:false},upgrades:{tokens:false,service:false},claimed:[],campaign:0,theme:'midnight',dailyIncome:0,lastDay:null,mechanic:null,served:0,lost:0,tutorial:{status:'new',step:0}});}
 get floor(){return EXPANSIONS[this.level];}get door(){return {x:0,y:2};}
 get games(){return this.items.filter(i=>TYPES[i.type].kind==='game');}
 get dailyCost(){return this.floor.rent+Object.entries(STAFF).reduce((n,[id,s])=>n+(this.staff[id]?s.wage:0),0);}
 get unlockedTypes(){return Object.keys(TYPES).filter(type=>this.isUnlocked(type));}
 isUnlocked(type){return !!TYPES[type]&&(this.plays>=(TYPES[type].unlock||0)||this.items.some(i=>i.type===type));}
 payFor(item){return Math.round(TYPES[item.type].pay*(1+.5*(item.level-1))*(this.upgrades.tokens?1.2:1));}
 playDuration(item){return TYPES[item.type].duration*(1-.1*(item.level-1))*(this.upgrades.service?0.85:1);}
 hire(id){if(!STAFF[id])throw Error('Choose a staff member.');if(this.staff[id])throw Error('Already hired.');if(this.cash<STAFF[id].cost)throw Error('Not enough cash to hire.');this.cash-=STAFF[id].cost;this.staff[id]=true;}
 dismiss(id){if(!STAFF[id]||!this.staff[id])throw Error('That role is not hired.');this.staff[id]=false;if(id==='mechanic')this.mechanic=null;}
 improve(id){if(!UPGRADES[id]||this.upgrades[id])throw Error('Already purchased.');if(this.cash<UPGRADES[id].cost)throw Error('Not enough cash for that improvement.');this.cash-=UPGRADES[id].cost;this.upgrades[id]=true;}
 advertise(){if(this.campaign>0)throw Error('Your flyers are still running.');if(!this.open)throw Error('Open your doors before advertising.');if(this.cash<80)throw Error('A flyer campaign costs $80.');this.cash-=80;this.campaign=45;this.spawnIn=Math.min(this.spawnIn,1);}
 claim(id){const m=MILESTONES.find(m=>m.id===id);if(!m||this.claimed.includes(id)||!m.test(this))throw Error('That goal is not ready.');this.claimed.push(id);this.cash+=m.reward;return m.reward;}
 occupancy(x,y,items=this.items){return items.find(i=>i.x===x&&i.y===y);}
 path(start,end,items=this.items){const {w,h}=this.floor;if(end.x<0||end.y<0||end.x>=w||end.y>=h||this.occupancy(end.x,end.y,items))return null;const queue=[start],seen=new Map([[pos(start.x,start.y),null]]);for(let p=0;p<queue.length;p++){const at=queue[p];if(at.x===end.x&&at.y===end.y){const out=[];let key=pos(at.x,at.y);while(seen.get(key)!==null){const [x,y]=key.split(',').map(Number);out.unshift({x,y});key=seen.get(key);}return out;}for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const x=at.x+dx,y=at.y+dy,key=pos(x,y);if(x<0||y<0||x>=w||y>=h||seen.has(key)||this.occupancy(x,y,items))continue;seen.set(key,pos(at.x,at.y));queue.push({x,y});}}return null;}
 route(actor,to){const start={x:Math.round(actor.x),y:Math.round(actor.y)},path=this.path(start,to);if(!path)return null;if(Math.hypot(start.x-actor.x,start.y-actor.y)>.001)path.unshift(start);return path;}
 walk(actor,dt,speed=2.1){let remaining=dt;while(actor.path.length&&remaining>0){const at=actor.path[0],dx=at.x-actor.x,dy=at.y-actor.y,d=Math.hypot(dx,dy),needed=d/speed;if(needed<=remaining){actor.x=at.x;actor.y=at.y;actor.path.shift();remaining-=needed;}else{actor.x+=dx/d*remaining*speed;actor.y+=dy/d*remaining*speed;remaining=0;}}return remaining;}
 validate(type,x,y,exclude=null){if(!TYPES[type]||!Number.isInteger(x)||!Number.isInteger(y))return 'Choose a tile inside your arcade.';const {w,h}=this.floor;if(x<0||y<0||x>=w||y>=h)return 'That space needs a room expansion.';if(x===this.door.x&&y===this.door.y)return 'Keep the entrance clear.';const items=this.items.filter(i=>i.id!==exclude);if(this.occupancy(x,y,items))return 'There’s already something on that tile.';if([...this.guests,...(this.mechanic?[this.mechanic]:[])].some(g=>Math.round(g.x)===x&&Math.round(g.y)===y))return 'Wait for that person to pass.';const candidate=[...items,{type,x,y}];for(const item of candidate){if(TYPES[item.type].kind==='game'&&!this.path(this.door,{x:item.x,y:item.y+1},candidate))return 'Leave a clear path to the front of every machine.';}for(const actor of [...this.guests,...(this.mechanic?[this.mechanic]:[])])if(!this.path({x:Math.round(actor.x),y:Math.round(actor.y)},this.door,candidate))return 'Keep an exit path clear for your visitors.';return null;}
 place(type,x,y){const error=this.validate(type,x,y);if(error)throw Error(error);if(!this.isUnlocked(type))throw Error('Unlock '+TYPES[type].name+' at '+TYPES[type].unlock+' paid plays.');if(this.cash<TYPES[type].cost)throw Error('You need $'+TYPES[type].cost+' for that.');this.cash-=TYPES[type].cost;const item={id:this.nextId++,type,x,y,level:1,condition:100,plays:0,earned:0,busy:null};this.items.push(item);this.repath();return item;}
 upgradeCost(item){return Math.round(TYPES[item.type].cost*.65*item.level);}repairCost(item){return Math.max(12,Math.round(TYPES[item.type].cost*.06));}
 upgrade(id){const i=this.items.find(i=>i.id===id);if(!i||TYPES[i.type].kind!=='game'||i.level>=3)throw Error('This machine is already at its best.');const cost=this.upgradeCost(i);if(this.cash<cost)throw Error('Not enough cash to upgrade.');this.cash-=cost;i.level++;return cost;}
 repair(id){const i=this.items.find(i=>i.id===id);if(!i||TYPES[i.type].kind!=='game'||i.condition>=100)throw Error('This machine doesn’t need a repair.');const cost=this.repairCost(i);if(this.cash<cost)throw Error('Not enough cash to repair.');this.cash-=cost;i.condition=100;return cost;}
 emergencyRepair(id){const item=this.games.find(i=>i.id===id);if(!item||item.condition>0||this.staff.mechanic||this.games.some(i=>i.condition>0)||this.cash>=this.repairCost(item))throw Error('Emergency tune-ups are for a cash-strapped arcade with every machine down.');item.condition=30;}
 move(id,x,y){const i=this.items.find(i=>i.id===id);if(!i)throw Error('Select an item first.');if(i.busy!==null||this.guests.some(g=>g.target===id))throw Error('Let this machine’s queue finish first.');const error=this.validate(i.type,x,y,id);if(error)throw Error(error);i.x=x;i.y=y;this.repath();}
 sell(id){const i=this.items.find(i=>i.id===id);if(!i)throw Error('Select an item first.');if(i.busy!==null||this.guests.some(g=>g.target===id))throw Error('Let this machine’s queue finish first.');const amount=Math.floor(TYPES[i.type].cost*.7+(i.level-1)*TYPES[i.type].cost*.25);this.cash+=amount;this.items=this.items.filter(i=>i.id!==id);this.repath();return amount;}
 expand(){const next=EXPANSIONS[this.level+1];if(!next)throw Error('You own the Grand Arcade.');if(this.plays<next.plays)throw Error('Reach '+next.plays+' paid plays to unlock this location.');if(this.cash<next.cost)throw Error('Save $'+next.cost+' for the next location.');this.cash-=next.cost;this.level++;return next;}
 toggleOpen(){if(!this.open&&!this.games.length)throw Error('Place your first arcade machine before opening.');this.open=!this.open;if(this.open)this.spawnIn=Math.min(this.spawnIn,1);return this.open;}
 queue(item){return this.guests.filter(g=>g.target===item.id&&!g.gone&&g.state!=='leaving').sort((a,b)=>a.id-b.id);}
 queueSpot(item,used){for(const [dx,dy] of [[0,2],[0,3],[1,2],[-1,2],[1,1],[-1,1]]){const to={x:item.x+dx,y:item.y+dy};if(!used.has(pos(to.x,to.y))&&this.path(this.door,to))return to;}return null;}
 arrangeQueue(item){const guests=this.queue(item);if(!guests.length){item.busy=null;return;}const current=guests.find(g=>g.id===item.busy)||guests[0];item.busy=current.id;const order=[current,...guests.filter(g=>g!==current)],used=new Set(this.guests.filter(g=>g.target!==item.id&&g.destination).map(g=>pos(g.destination.x,g.destination.y)));
  for(let n=0;n<order.length;n++){const guest=order[n],to=n===0?{x:item.x,y:item.y+1}:this.queueSpot(item,used);if(!to){this.leave(guest,false);continue;}used.add(pos(to.x,to.y));if(guest.state==='playing')continue;const changed=!guest.destination||guest.destination.x!==to.x||guest.destination.y!==to.y;guest.destination=to;if(changed||guest.state==='waiting'){const path=this.route(guest,to);if(!path){this.leave(guest,false);continue;}guest.path=path;guest.state='walking';}guest.queued=n>0;}
 }
 choose(guest){const used=new Set(this.guests.filter(g=>g!==guest&&g.destination).map(g=>pos(g.destination.x,g.destination.y)));const options=this.games.filter(i=>i.condition>0&&!guest.visited.includes(i.id)).map(item=>{const queue=this.queue(item),to=queue.length?this.queueSpot(item,used):{x:item.x,y:item.y+1};return {item,to,count:queue.length,path:to?this.route(guest,to):null,score:10+this.random()*6+(guest.favorite===item.type?10:0)+(item.type==='snack'?(guest.hunger||0)/8:0)-queue.length*6};}).filter(o=>o.path&&o.count<3).sort((a,b)=>b.score-a.score);if(!options.length)return false;const {item}=options[0];guest.target=item.id;guest.wait=0;guest.destination=null;this.arrangeQueue(item);return guest.target!==null;}
 leave(guest,rearrange=true){const old=this.items.find(i=>i.id===guest.target);if(old?.busy===guest.id)old.busy=null;guest.target=null;guest.destination=this.door;guest.state='leaving';guest.path=this.route(guest,this.door)||[];guest.queued=false;if(rearrange&&old)this.arrangeQueue(old);}
 react(guest,text){guest.bubble=text;guest.bubbleTime=3;}
 repath(){if(this.mechanic?.target!=null){const item=this.items.find(i=>i.id===this.mechanic.target),route=item?this.route(this.mechanic,{x:item.x,y:item.y+1}):null;this.mechanic.path=route||[];if(!route)this.mechanic.target=null;}for(const item of this.games)this.arrangeQueue(item);for(const g of this.guests){if(g.state==='leaving')g.path=this.route(g,this.door)||[];else if(g.target===null&&g.destination)g.path=this.route(g,g.destination)||[];}}
 stepMechanic(dt){if(!this.staff.mechanic){this.mechanic=null;return;}const worker=this.mechanic||={id:-2,x:this.door.x,y:this.door.y,path:[],target:null,state:'waiting',color:3};let target=this.games.find(i=>i.id===worker.target&&i.condition<100);if(!target){worker.target=null;worker.path=[];worker.state='waiting';for(const item of this.games.filter(i=>i.condition<100).sort((a,b)=>a.condition-b.condition)){const path=this.route(worker,{x:item.x,y:item.y+1});if(path){worker.path=path;worker.target=item.id;target=item;break;}}}if(!target)return;worker.state='walking';const remaining=this.walk(worker,dt);if(!worker.path.length){worker.state='playing';target.condition=Math.min(100,target.condition+remaining*2.2);}}
 step(dt){
  this.events=[];if(!this.open&&!this.guests.length)return;
  this.time+=dt;this.dayTime+=dt;this.campaign=Math.max(0,this.campaign-dt);
  while(this.dayTime>=90){this.dayTime-=90;this.day++;const cost=this.dailyCost,paid=Math.min(this.cash,cost);this.cash-=paid;this.lastDay={income:this.dailyIncome,expenses:paid};this.dailyIncome=0;this.events.push({type:'rent',amount:paid});if(paid<cost){this.staff.mechanic=false;this.staff.host=false;this.events.push({type:'notice',text:'Daily costs used your remaining cash. Staff have left; you can reopen and rebuild.'});}}
  this.stepMechanic(dt);this.spawnIn-=dt;
  if(this.open&&this.spawnIn<=0&&this.guests.length<Math.min(40,6+this.games.length*3)&&!this.guests.some(g=>Math.hypot(g.x-this.door.x,g.y-this.door.y)<.55)){
   const decor=Math.min(8,this.items.filter(i=>TYPES[i.type].kind==='decor'&&i.type!=='bench').length);
   this.spawnIn=Math.max(1.3,5.8-this.games.length*.24-decor*.12-this.reputation*.009-(this.staff.host?0.7:0))*(this.campaign>0?0.45:1)+this.random()*1.2;
   const favorites=Object.keys(TYPES).filter(k=>TYPES[k].kind==='game'&&this.isUnlocked(k)&&k!=='snack');
   const g={id:this.nextId++,x:this.door.x,y:this.door.y,state:'waiting',path:[],visited:[],wait:0,playTime:0,target:null,destination:null,color:Math.floor(this.random()*6),favorite:favorites[Math.floor(this.random()*favorites.length)]||'cabinet',hunger:20+this.random()*40,happiness:70,bubble:'',bubbleTime:0,retry:0,queued:false};
   this.guests.push(g);if(!this.choose(g)){this.react(g,'Any games free?');const used=new Set(this.guests.filter(a=>a!==g&&a.destination).map(a=>pos(a.destination.x,a.destination.y)));for(const [x,y] of [[1,2],[1,3],[1,1],[0,3],[0,1]]){const to={x,y},path=this.route(g,to);if(path&&!used.has(pos(x,y))){g.destination=to;g.path=path;break;}}}
   this.events.push({type:'arrival'});
  }
  const patience=18+(this.items.some(i=>i.type==='bench')?8:0)+(this.staff.host?8:0);
  for(const g of this.guests){
   g.hunger=Math.min(100,(g.hunger??30)+dt*.6);g.happiness??=70;g.bubbleTime=Math.max(0,(g.bubbleTime||0)-dt);
   if(g.queued||g.state==='waiting'){g.wait+=dt;g.happiness=Math.max(0,g.happiness-dt*.25);if(g.wait>patience||!this.open&&g.state==='waiting'){if(this.open){g.happiness=Math.max(0,g.happiness-18);this.react(g,'Too long!');this.reputation=Math.max(20,this.reputation-.5);}this.leave(g);continue;}}
   if(g.state==='waiting'){if(g.path.length)this.walk(g,dt);g.retry=(g.retry||0)-dt;if(this.open&&g.retry<=0){g.retry=1;if(this.choose(g))continue;}if(!this.open)this.leave(g);continue;}
   if(g.state==='queued')continue;
   if(g.state==='walking'||g.state==='leaving'){
    this.walk(g,dt);if(g.path.length)continue;
    if(g.state==='leaving'){g.gone=true;if(g.visited.length){this.served++;if(g.happiness>=70)this.reputation=Math.min(100,this.reputation+.15);}else{this.lost++;}continue;}
    const item=this.items.find(i=>i.id===g.target);if(!item){g.state='waiting';g.target=null;continue;}
    if(item.busy!==g.id){g.state='queued';continue;}
    if(item.condition<=0){this.react(g,'It’s broken!');g.happiness-=10;this.leave(g);continue;}
    g.state='playing';g.queued=false;g.wait=0;g.playTime=this.playDuration(item);
   }
   if(g.state==='playing'){
    g.playTime-=dt;if(g.playTime>0)continue;const item=this.items.find(i=>i.id===g.target);
    if(item){const amount=this.payFor(item),before=this.plays;this.cash+=amount;this.totalEarned+=amount;this.dailyIncome+=amount;this.plays++;item.plays++;item.earned+=amount;item.condition=Math.max(0,item.condition-2);item.busy=null;g.visited.push(item.id);g.happiness=Math.min(100,g.happiness+(g.favorite===item.type?12:5));if(item.type==='snack'){g.hunger=0;this.react(g,'Snack break!');}else if(g.favorite===item.type)this.react(g,'My favorite!');else if(item.condition<20){this.react(g,'Needs a tune-up');g.happiness=Math.max(0,g.happiness-5);}this.reputation=Math.min(100,this.reputation+.22);this.events.push({type:'earn',amount,guestId:g.id,x:item.x,y:item.y});for(const [type,info] of Object.entries(TYPES))if(info.unlock>before&&info.unlock<=this.plays)this.events.push({type:'unlock',text:info.name+' unlocked!',item:type});
     g.target=null;g.destination=null;if(item.condition===0){for(const other of this.queue(item)){other.target=null;other.destination=null;other.path=[];other.state='waiting';other.queued=false;other.wait=0;other.happiness=Math.max(0,other.happiness-10);this.react(other,'It’s broken!');}}else this.arrangeQueue(item);
    }
    g.target=null;if(!this.open||g.visited.length>=3||!this.choose(g)){if(g.hunger>80){g.happiness=Math.max(0,g.happiness-8);this.react(g,'Need a snack');}else if(g.happiness>=80&&!(g.bubbleTime>0))this.react(g,'Great arcade!');this.leave(g);}
   }
  }
  this.guests=this.guests.filter(g=>!g.gone);
 }
 serialize(){return JSON.stringify({version:1,cash:this.cash,totalEarned:this.totalEarned,plays:this.plays,day:this.day,dayTime:this.dayTime,level:this.level,reputation:this.reputation,nextId:this.nextId,open:this.open,staff:this.staff,upgrades:this.upgrades,claimed:this.claimed,campaign:this.campaign,theme:this.theme,dailyIncome:this.dailyIncome,lastDay:this.lastDay,served:this.served,lost:this.lost,tutorial:this.tutorial,items:this.items.map(({busy,...item})=>item)});}
 static restore(text,random=Math.random){
  const s=JSON.parse(text);if(s?.version!==1||!Array.isArray(s.items)||s.items.length>200||!Number.isInteger(s.level)||s.level<0||s.level>=EXPANSIONS.length)throw Error('Invalid arcade save.');
  const game=new Tycoon(random);for(const key of ['cash','totalEarned','plays','day','dayTime','reputation','nextId']){if(!finite(s[key]))throw Error('Invalid arcade save.');game[key]=s[key];}if(!Number.isInteger(game.day)||game.day<1||game.dayTime>=90||game.reputation>100||!Number.isInteger(game.plays)||!Number.isInteger(game.nextId))throw Error('Invalid arcade counters.');
  game.level=s.level;game.open=Boolean(s.open);for(const group of ['staff','upgrades'])if(s[group]!==undefined){if(!s[group]||typeof s[group]!=='object')throw Error('Invalid business save.');for(const id of Object.keys(game[group])){if(typeof s[group][id]!=='boolean')throw Error('Invalid business save.');game[group][id]=s[group][id];}}
  if(s.claimed!==undefined){if(!Array.isArray(s.claimed)||new Set(s.claimed).size!==s.claimed.length||s.claimed.some(id=>!MILESTONES.some(m=>m.id===id)))throw Error('Invalid goals in save.');game.claimed=[...s.claimed];}
  for(const key of ['campaign','dailyIncome','served','lost'])if(s[key]!==undefined){if(!finite(s[key],key==='campaign'?45:1e12))throw Error('Invalid business save.');game[key]=s[key];}
  game.theme=['midnight','rose','ocean'].includes(s.theme)?s.theme:'midnight';if(s.lastDay&&['income','expenses'].every(k=>finite(s.lastDay[k])))game.lastDay={income:s.lastDay.income,expenses:s.lastDay.expenses};
  if(s.tutorial!==undefined){if(!s.tutorial||!['new','active','done','skipped'].includes(s.tutorial.status)||!Number.isInteger(s.tutorial.step)||s.tutorial.step<0||s.tutorial.step>5||s.tutorial.status==='active'&&s.tutorial.step>4)throw Error('Invalid tutorial save.');game.tutorial={status:s.tutorial.status,step:s.tutorial.step};}
  const ids=new Set();for(const i of s.items){if(!Number.isInteger(i.id)||i.id<1||ids.has(i.id)||!TYPES[i.type]||!Number.isInteger(i.level)||i.level<1||i.level>3||!finite(i.condition,100)||!finite(i.plays)||!finite(i.earned))throw Error('Invalid machine in save.');if(game.validate(i.type,i.x,i.y))throw Error('Invalid floor plan in save.');ids.add(i.id);game.items.push({id:i.id,type:i.type,x:i.x,y:i.y,level:i.level,condition:i.condition,plays:i.plays,earned:i.earned,busy:null});}
  game.nextId=Math.max(game.nextId,1,...game.items.map(i=>i.id+1));return game;
 }
}
