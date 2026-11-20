// Arcade Tycoon 2.0 simulation. Pure logic: no DOM, deterministic with an injected random source.
export const DAY_LENGTH=90,SAVE_KEY='arcade-tycoon-prototype-v1',SETTINGS_KEY='arcade-tycoon-settings-v1';
export const LOCATIONS=[
 {name:'Corner Arcade',w:8,h:6,rent:20,move:0,goal:null,blurb:'A narrow room beside the laundromat. Every empire starts somewhere.'},
 {name:'Strip Mall Unit',w:10,h:7,rent:45,move:1500,goal:{earned:4000,rep:55,types:3},blurb:'A real storefront with parking out front.'},
 {name:'Boardwalk Pier',w:12,h:8,rent:80,move:5000,goal:{earned:15000,rep:60,types:6},blurb:'Sea air, tourists and a lot more floor.'},
 {name:'Downtown Loft',w:14,h:9,rent:130,move:12000,goal:{earned:45000,rep:66,types:9},blurb:'Brick walls, big windows and a crowd that expects the best.'},
 {name:'Megaplex Wing',w:16,h:10,rent:200,move:30000,goal:{earned:120000,rep:72,types:12},blurb:'An entire wing of the cinema complex.'},
 {name:'The Grand Arcade',w:18,h:11,rent:300,move:70000,goal:{earned:300000,rep:78,types:15},blurb:'The landmark. People plan trips around it.'}
];
// tag: what kind of fun it is. seats: players at once. tickets: ticket payout per play.
export const TYPES={
 cabinet:{name:'Classic Cabinet',cat:'games',tag:'retro',cost:180,price:2,dur:7,fun:14,seats:1,w:1,unlock:0,tickets:2,color:'#f2a65a',desc:'Joystick, two buttons, one more try.'},
 pinball:{name:'Pinball Table',cat:'games',tag:'retro',cost:420,price:3,dur:9,fun:19,seats:1,w:1,unlock:0,tickets:4,color:'#7cc6d6',desc:'Flippers, bumpers and a satisfying tilt.'},
 claw:{name:'Claw Machine',cat:'games',tag:'prize',cost:350,price:2,dur:5,fun:12,seats:1,w:1,unlock:0,tickets:0,color:'#f2b8d0',desc:'Plush prizes and a famously weak claw.'},
 hockey:{name:'Air Hockey',cat:'games',tag:'sport',cost:700,price:3,dur:10,fun:22,seats:2,w:2,unlock:1,tickets:6,color:'#9ad0a0',desc:'Two players. Loud, fast and friendly.'},
 racer:{name:'Twin Racer',cat:'games',tag:'speed',cost:900,price:4,dur:11,fun:24,seats:2,w:2,unlock:1,tickets:5,color:'#e46c6c',desc:'Two bucket seats and a big wheel.'},
 skeeball:{name:'Roll Lane',cat:'games',tag:'prize',cost:600,price:2,dur:8,fun:16,seats:1,w:1,unlock:1,tickets:12,color:'#d8b36a',desc:'Roll the ball up the ramp. Tickets galore.'},
 dance:{name:'Dance Stage',cat:'games',tag:'rhythm',cost:1300,price:4,dur:12,fun:28,seats:2,w:2,unlock:2,tickets:6,color:'#b79cf2',desc:'Arrows on the floor, music in the air.'},
 drums:{name:'Rhythm Drums',cat:'games',tag:'rhythm',cost:1000,price:3,dur:10,fun:22,seats:1,w:1,unlock:2,tickets:5,color:'#ef8f5c',desc:'Hit the pads in time with the chart.'},
 lightgun:{name:'Blaster Booth',cat:'games',tag:'speed',cost:1500,price:4,dur:11,fun:26,seats:2,w:2,unlock:3,tickets:6,color:'#6cb2e4',desc:'Two plastic blasters versus a screen of robots.'},
 coinpush:{name:'Coin Pusher',cat:'games',tag:'prize',cost:1100,price:2,dur:7,fun:15,seats:1,w:1,unlock:3,tickets:14,color:'#e9d27a',desc:'The shelf slides. The tickets almost fall.'},
 vr:{name:'VR Pod',cat:'games',tag:'future',cost:3200,price:7,dur:14,fun:36,seats:1,w:1,unlock:4,tickets:8,color:'#82e0c8',desc:'A headset, a harness and another world.'},
 bowling:{name:'Mini Bowling',cat:'games',tag:'sport',cost:2600,price:5,dur:13,fun:30,seats:2,w:2,unlock:4,tickets:10,color:'#c99be0',desc:'A short lane with real pins.'},
 simulator:{name:'Motion Simulator',cat:'games',tag:'future',cost:5200,price:9,dur:16,fun:44,seats:2,w:2,unlock:5,tickets:10,color:'#7fa4f2',desc:'A pod that tilts with every turn.'},
 snack:{name:'Snack Bar',cat:'service',tag:'food',cost:500,price:4,dur:4,fun:4,seats:1,w:1,unlock:0,need:'hunger',color:'#f0c070',desc:'Pretzels and nachos. Fixes hunger.'},
 soda:{name:'Soda Fountain',cat:'service',tag:'drink',cost:400,price:2,dur:3,fun:3,seats:1,w:1,unlock:1,need:'thirst',color:'#78c8f0',desc:'Cold drinks. Fixes thirst.'},
 restroom:{name:'Restroom',cat:'service',tag:'rest',cost:600,price:0,dur:5,fun:2,seats:1,w:1,unlock:1,need:'bladder',color:'#c8d4dc',desc:'Free and very appreciated.'},
 prizes:{name:'Prize Counter',cat:'service',tag:'prizes',cost:900,price:0,dur:4,fun:10,seats:1,w:2,unlock:2,need:'tickets',color:'#f29ac0',desc:'Trade tickets for prizes. Big happiness boost.'},
 photo:{name:'Photo Booth',cat:'service',tag:'photo',cost:800,price:5,dur:6,fun:16,seats:1,w:1,unlock:3,color:'#e0e0a0',desc:'Silly strips of four.'},
 bench:{name:'Bench',cat:'decor',tag:'seat',cost:60,price:0,dur:5,fun:1,seats:2,w:2,unlock:0,need:'energy',color:'#a88466',desc:'Tired visitors rest here.'},
 plant:{name:'Potted Plant',cat:'decor',cost:40,price:0,unlock:0,w:1,appeal:4,color:'#6fbf73',desc:'Makes nearby machines a bit more inviting.'},
 bin:{name:'Trash Bin',cat:'decor',cost:50,price:0,unlock:0,w:1,appeal:1,bin:true,color:'#7d8c95',desc:'Visitors nearby rarely litter.'},
 neon:{name:'Neon Sign',cat:'decor',cost:240,price:0,unlock:1,w:1,appeal:8,color:'#ff7ad9',desc:'A glowing sign. Strong appeal.'},
 fountain:{name:'Light Fountain',cat:'decor',cost:900,price:0,unlock:3,w:1,appeal:14,color:'#8fe3ff',desc:'A shimmering centerpiece.'},
 statue:{name:'Mascot Statue',cat:'decor',cost:2000,price:0,unlock:4,w:1,appeal:20,color:'#ffd27a',desc:'A big golden quarter with a smile.'}
};
export const GAME_TYPES=Object.keys(TYPES).filter(k=>TYPES[k].cat==='games');
export const STAFF={
 mechanic:{name:'Mechanic',hire:250,wage:30,desc:'Repairs worn and broken machines.'},
 janitor:{name:'Janitor',hire:150,wage:20,desc:'Sweeps up litter so visitors stay happy.'},
 host:{name:'Floor Host',hire:200,wage:25,desc:'Keeps queues patient and cheerful.'},
 mascot:{name:'Mascot',hire:600,wage:45,unlock:2,desc:'Wanders the floor. Visitors love it and more arrive.'}
};
export const IMPROVEMENTS={
 tokens:{name:'Custom tokens',costs:[600,1600,4000],desc:'+10% on every paid play per level.'},
 service:{name:'Service contract',costs:[500,1400,3600],desc:'Machines wear 25% slower per level.'},
 carpet:{name:'Comfy carpet',costs:[400,1200],desc:'Visitors wait 30% longer per level.'},
 marquee:{name:'Light-up marquee',costs:[700,1800,4500],desc:'15% more visitors per level.'},
 loyalty:{name:'Loyalty cards',costs:[900,2600],desc:'Happy visitors raise reputation faster.'},
 catalog:{name:'Prize catalog',costs:[800,2400],desc:'Prize counter trips make visitors much happier.'},
 sound:{name:'Sound system',costs:[1200],desc:'Background music: everyone is a little happier.'},
 hvac:{name:'Air conditioning',costs:[1500],desc:'Visitors tire and thirst 25% slower.'}
};
export const CAMPAIGNS={
 flyers:{name:'Neighborhood flyers',cost:150,time:45,boost:1.6,unlock:0,desc:'A rush of visitors for 45 seconds.'},
 radio:{name:'Radio spot',cost:700,time:90,boost:2,unlock:2,desc:'Twice the visitors for 90 seconds, with bigger wallets.'},
 tournament:{name:'Weekend tournament',cost:500,time:60,boost:1.4,unlock:1,desc:'Competitive teens arrive. Paid plays earn 50% more.'}
};
export const KINDS={
 kid:{name:'Kid',budget:[10,18],likes:{prize:1.6,retro:1,sport:1.2,rhythm:1.1,speed:.9,future:.8},speed:2.3,shirt:['#ffb36b','#7fd1ff','#ffd86b','#a8e68a']},
 teen:{name:'Teen',budget:[14,26],likes:{speed:1.5,rhythm:1.5,future:1.3,sport:1.1,retro:.8,prize:.7},speed:2.1,shirt:['#c58bff','#ff7a9c','#6be0c0','#7d8bff']},
 adult:{name:'Adult',budget:[20,40],likes:{retro:1.6,sport:1.2,future:1.1,prize:.8,speed:1,rhythm:.8},speed:1.9,shirt:['#e6e0d0','#98b7c8','#c8a07c','#9fc39a']},
 collector:{name:'Collector',budget:[24,46],likes:{prize:1.8,retro:1.4,future:1,speed:.8,sport:.9,rhythm:.9},speed:1.8,shirt:['#f2d16b','#e89a6b']}
};
export const EVENTS={
 rain:{name:'Rainy day',desc:'Nobody wants to be outside. More visitors today.'},
 school:{name:'School’s out',desc:'Kids everywhere. Prize games are popular.'},
 critic:{name:'A critic visits',desc:'A reviewer is on the floor. Their verdict moves your reputation.'},
 outage:{name:'Power flicker',desc:'A surge knocked one machine offline.'},
 party:{name:'Birthday party',desc:'A group of kids arrives together with spending money.'},
 heat:{name:'Heat wave',desc:'Visitors get thirsty fast. Drinks sell well.'}
};
export const MILESTONES=[
 {id:'first',text:'Place your first attraction',reward:50,test:g=>g.items.some(i=>TYPES[i.type].cat==='games')},
 {id:'open',text:'Welcome 10 visitors',reward:80,test:g=>g.served>=10},
 {id:'hundred',text:'Earn $500 in total',reward:100,test:g=>g.totalEarned>=500},
 {id:'snack',text:'Build a snack bar',reward:100,test:g=>g.items.some(i=>i.type==='snack')},
 {id:'staff',text:'Hire your first staff member',reward:150,test:g=>g.staff.length>0},
 {id:'three',text:'Run 3 different attraction types',reward:200,test:g=>g.distinctTypes()>=3},
 {id:'upgrade',text:'Upgrade an attraction to level 3',reward:250,test:g=>g.items.some(i=>i.level>=3)},
 {id:'rep70',text:'Reach 70 reputation',reward:400,test:g=>g.reputation>=70},
 {id:'visitors',text:'Welcome 250 visitors',reward:500,test:g=>g.served>=250},
 {id:'ten-k',text:'Earn $10,000 in total',reward:600,test:g=>g.totalEarned>=10000},
 {id:'improve',text:'Buy 5 business improvements',reward:700,test:g=>Object.values(g.upgrades).reduce((a,b)=>a+b,0)>=5},
 {id:'staff4',text:'Run a team of 4 staff',reward:800,test:g=>g.staff.length>=4},
 {id:'loc3',text:'Move to the Boardwalk Pier',reward:1000,test:g=>g.level>=2},
 {id:'max',text:'Upgrade an attraction to level 5',reward:1200,test:g=>g.items.some(i=>i.level>=5)},
 {id:'hundred-k',text:'Earn $100,000 in total',reward:3000,test:g=>g.totalEarned>=100000},
 {id:'rep90',text:'Reach 90 reputation',reward:4000,test:g=>g.reputation>=90},
 {id:'all',text:'Run every attraction type at once',reward:8000,test:g=>GAME_TYPES.every(t=>g.items.some(i=>i.type===t))},
 {id:'grand',text:'Open The Grand Arcade',reward:5000,test:g=>g.level>=5},
 {id:'million',text:'Earn $1,000,000 in total',reward:20000,test:g=>g.totalEarned>=1e6}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const NEEDS=['hunger','thirst','bladder','energy'],NEED_ITEM={hunger:'snack',thirst:'soda',bladder:'restroom',energy:'bench'};

export class Tycoon{
 constructor(random=Math.random){
  this.random=random;this.cash=800;this.totalEarned=0;this.plays=0;this.day=1;this.dayTime=0;this.level=0;this.reputation=50;this.nextId=1;
  this.open=false;this.items=[];this.staff=[];this.customers=[];this.litter=[];this.upgrades={};this.claimed=[];this.campaign=null;this.event=null;
  this.served=0;this.lost=0;this.today=this.blankDay();this.history=[];this.popups=[];this.log=[];this.typePlays={};this.time=0;this.spawnTimer=2;this.critic=null;
 }
 blankDay(){return {income:0,visitors:0,happy:0,left:0,plays:0};}
 get loc(){return LOCATIONS[this.level];}
 get w(){return this.loc.w;}
 get h(){return this.loc.h;}
 get door(){return {x:Math.floor(this.w/2),y:this.h-1};}
 rand(a,b){return a+(b-a)*this.random();}
 pick(list){return list[Math.floor(this.random()*list.length)%list.length];}
 pop(p){this.popups.push(p);if(this.popups.length>60)this.popups.shift();}
 note(text){this.log.unshift(text);this.log.length=Math.min(this.log.length,40);}
 unlocked(type){return (TYPES[type].unlock||0)<=this.level;}
 distinctTypes(){return new Set(this.items.filter(i=>TYPES[i.type].cat==='games').map(i=>i.type)).size;}
 cells(item){const t=TYPES[item.type],out=[];for(let i=0;i<(t.w||1);i++)out.push(item.rot?{x:item.x,y:item.y+i}:{x:item.x+i,y:item.y});return out;}
 occupied(ignore){const set=new Set();for(const it of this.items)if(it!==ignore)for(const c of this.cells(it))set.add(c.x+','+c.y);return set;}
 itemAt(x,y){return this.items.find(it=>this.cells(it).some(c=>c.x===x&&c.y===y));}
 inside(x,y){return x>=0&&y>=0&&x<this.w&&y<this.h;}
 walkable(x,y,occ=this.occupied()){return this.inside(x,y)&&!occ.has(x+','+y);}
 distField(fromX,fromY,occ=this.occupied()){
  const d=new Int16Array(this.w*this.h).fill(-1);if(!this.walkable(fromX,fromY,occ))return d;const q=[[fromX,fromY]];d[fromY*this.w+fromX]=0;
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(this.walkable(nx,ny,occ)&&d[ny*this.w+nx]<0){d[ny*this.w+nx]=d[y*this.w+x]+1;q.push([nx,ny]);}}}
  return d;
 }
 spots(item,occ=this.occupied()){const out=[],seen=new Set();for(const c of this.cells(item))for(const [dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const x=c.x+dx,y=c.y+dy,k=x+','+y;if(!seen.has(k)&&this.walkable(x,y,occ)){seen.add(k);out.push({x,y});}}return out;}
 canPlace(type,x,y,rot=0,ignore=null){
  const t=TYPES[type];if(!t)return 'Unknown item.';if(!this.unlocked(type))return 'Unlocks at '+LOCATIONS[t.unlock].name+'.';
  const probe={type,x,y,rot},cells=this.cells(probe),occ=this.occupied(ignore),door=this.door;
  for(const c of cells){if(!this.inside(c.x,c.y))return 'That does not fit there.';if(occ.has(c.x+','+c.y))return 'That space is taken.';if(c.x===door.x&&c.y===door.y)return 'Keep the entrance clear.';if(this.customers.some(p=>Math.floor(p.x)===c.x&&Math.floor(p.y)===c.y)||this.staff.some(p=>Math.floor(p.x)===c.x&&Math.floor(p.y)===c.y))return 'Someone is standing there.';}
  for(const c of cells)occ.add(c.x+','+c.y);
  const d=this.distField(door.x,door.y,occ);
  // Every used item must keep a reachable spot, and no floor tile may become sealed off.
  for(const it of [...this.items.filter(i=>i!==ignore),probe]){if(TYPES[it.type].cat==='decor'&&!TYPES[it.type].seats)continue;if(!this.spots(it,occ).some(s=>d[s.y*this.w+s.x]>=0))return it===probe?'Visitors need a way to reach it.':'That would block another machine.';}
  for(let yy=0;yy<this.h;yy++)for(let xx=0;xx<this.w;xx++)if(!occ.has(xx+','+yy)&&d[yy*this.w+xx]<0)return 'That would wall off part of the floor.';
  return '';
 }
 place(type,x,y,rot=0){
  const t=TYPES[type],why=this.canPlace(type,x,y,rot);if(why)throw new Error(why);if(this.cash<t.cost)throw new Error('Not enough cash.');
  this.cash-=t.cost;const item={id:this.nextId++,type,x,y,rot:rot?1:0,level:1,condition:100,broken:false,users:[],queue:[],earned:0,plays:0,anim:0};
  this.items.push(item);this.note('Built a '+t.name+'.');this.checkMilestones();return item;
 }
 move(id,x,y,rot){const it=this.items.find(i=>i.id===id);if(!it||it.users.length||it.queue.length)throw new Error('Wait until nobody is using it.');const why=this.canPlace(it.type,x,y,rot??it.rot,it);if(why)throw new Error(why);it.x=x;it.y=y;it.rot=(rot??it.rot)?1:0;return it;}
 sellValue(it){const t=TYPES[it.type];return Math.floor((t.cost+this.upgradeSpent(it))*.5);}
 upgradeSpent(it){let s=0;for(let l=1;l<it.level;l++)s+=this.upgradeCost({...it,level:l});return s;}
 upgradeCost(it){return Math.round(TYPES[it.type].cost*.6*it.level);}
 upgrade(id){const it=this.items.find(i=>i.id===id);if(!it||!TYPES[it.type].seats||TYPES[it.type].cat==='decor')throw new Error('This cannot be upgraded.');if(it.level>=5)throw new Error('Already at max level.');const c=this.upgradeCost(it);if(this.cash<c)throw new Error('Not enough cash.');this.cash-=c;it.level++;it.condition=100;it.broken=false;this.checkMilestones();return it;}
 repairCost(it){return Math.round(20+TYPES[it.type].cost*.08*(1-it.condition/100+(it.broken?.5:0)));}
 repair(id){const it=this.items.find(i=>i.id===id);if(!it)return;const c=this.repairCost(it);if(this.cash<c)throw new Error('Not enough cash.');this.cash-=c;it.condition=100;it.broken=false;return it;}
 sell(id){const it=this.items.find(i=>i.id===id);if(!it)return;if(it.users.length)throw new Error('Wait until nobody is using it.');for(const c of this.customers)if(c.target===id)this.retarget(c);this.cash+=this.sellValue(it);this.items=this.items.filter(i=>i!==it);}
 hire(role){const s=STAFF[role];if(!s)throw new Error('Unknown role.');if((s.unlock||0)>this.level)throw new Error('Unlocks later.');if(this.staff.length>=this.staffCap())throw new Error('Your team is full for this location.');if(this.cash<s.hire)throw new Error('Not enough cash.');this.cash-=s.hire;const d=this.door;const p={id:this.nextId++,role,x:d.x+.5,y:d.y+.5,path:[],task:null,timer:0,name:this.pick(['Sam','Rae','Jo','Kit','Lou','Max','Ash','Bo','Cy','Dee','Eli','Fin'])};this.staff.push(p);this.note('Hired '+p.name+' as '+s.name.toLowerCase()+'.');this.checkMilestones();return p;}
 fire(id){this.staff=this.staff.filter(s=>s.id!==id);}
 staffCap(){return 2+this.level*2;}
 improve(key){const u=IMPROVEMENTS[key],lvl=this.upgrades[key]||0;if(!u||lvl>=u.costs.length)throw new Error('Fully improved.');const c=u.costs[lvl];if(this.cash<c)throw new Error('Not enough cash.');this.cash-=c;this.upgrades[key]=lvl+1;this.checkMilestones();}
 up(k){return this.upgrades[k]||0;}
 launch(key){const c=CAMPAIGNS[key];if(!c||c.unlock>this.level)throw new Error('Not available yet.');if(this.campaign)throw new Error('A campaign is already running.');if(this.cash<c.cost)throw new Error('Not enough cash.');this.cash-=c.cost;this.campaign={key,left:c.time};this.note(c.name+' launched.');}
 goalStatus(){const next=LOCATIONS[this.level+1];if(!next)return null;const g=next.goal;return {next,parts:[{label:'Lifetime earnings',have:this.totalEarned,need:g.earned,money:true},{label:'Reputation',have:Math.round(this.reputation),need:g.rep},{label:'Attraction types',have:this.distinctTypes(),need:g.types},{label:'Moving cost',have:this.cash,need:next.move,money:true}]};}
 canRelocate(){const s=this.goalStatus();return !!s&&s.parts.every(p=>p.have>=p.need);}
 relocate(){if(!this.canRelocate())throw new Error('Not ready to move yet.');const next=LOCATIONS[this.level+1];this.cash-=next.move;for(const c of this.customers)this.release(c);this.customers=[];this.level++;for(const s of this.staff){s.x=this.door.x+.5;s.y=this.door.y+.5;s.path=[];s.task=null;}this.note('Moved into '+next.name+'!');this.checkMilestones();return next;}
 toggleOpen(){this.open=!this.open;this.note(this.open?'Doors open.':'Doors closed. Visitors finish up and head home.');if(!this.open)for(const c of this.customers){c.leaving=true;if(c.state!=='play'&&c.state!=='exit'){this.release(c);this.goHome(c);}}return this.open;}
 checkMilestones(){for(const m of MILESTONES)if(!this.claimed.includes(m.id)&&m.test(this)){this.claimed.push(m.id);this.cash+=m.reward;this.pop({kind:'milestone',text:m.text,reward:m.reward});this.note('Goal: '+m.text+' (+$'+m.reward+')');}}
 spawnInterval(){const capacity=this.items.filter(i=>TYPES[i.type].cat==='games').reduce((a,i)=>a+TYPES[i.type].seats,0);if(!capacity)return Infinity;let rate=.14+capacity*.085;rate*=.55+this.reputation/100;rate*=1+.15*this.up('marquee');rate*=1+.1*this.staff.filter(s=>s.role==='mascot').length;rate*=1+this.decorAppeal()/400;if(this.campaign)rate*=CAMPAIGNS[this.campaign.key].boost;if(this.event?.key==='rain')rate*=1.3;return 1/rate;}
 maxCustomers(){const seats=this.items.reduce((a,i)=>a+(TYPES[i.type].seats||0),0);return Math.min(60,4+seats*2);}
 decorAppeal(){return this.items.reduce((a,i)=>a+(TYPES[i.type].appeal||0),0);}
 appealNear(x,y){let a=0;for(const it of this.items){const t=TYPES[it.type];if(!t.appeal)continue;const d=Math.hypot(it.x-x,it.y-y);if(d<=3.2)a+=t.appeal*(1-d/4);}for(const s of this.staff)if(s.role==='mascot'&&Math.hypot(s.x-x,s.y-y)<3)a+=6;return a;}
 spawn(kind,extra={}){
  const d=this.door,k=KINDS[kind];let budget=this.rand(...k.budget)*(1+this.level*.35);if(this.campaign?.key==='radio')budget*=1.3;
  const c={id:this.nextId++,kind,x:d.x+.5,y:this.h+.4,path:[{x:d.x,y:d.y}],state:'enter',target:null,timer:0,budget,spent:0,happiness:62,fun:0,tickets:0,patience:0,visited:{},played:0,maxPlays:2+Math.floor(this.random()*4),leaving:false,shirt:this.pick(k.shirt),hunger:this.rand(0,40),thirst:this.rand(0,40),bladder:this.rand(0,30),energy:this.rand(70,100),thought:null,thoughtTime:0,...extra};
  this.customers.push(c);this.today.visitors++;return c;
 }
 chooseKind(){const r=this.random();if(this.event?.key==='school'&&r<.5)return 'kid';if(this.campaign?.key==='tournament'&&r<.5)return 'teen';const opts=['kid','teen','adult','adult','teen','kid'];if(this.level>=2)opts.push('collector');return this.pick(opts);}
 // Visitor brain
 desire(c,it,dist){
  const t=TYPES[it.type];if(it.broken)return -1;if(t.cat==='decor'&&!t.need)return -1;if(t.price>c.budget-c.spent)return -1;
  const queue=it.queue.length+Math.max(0,it.users.length-t.seats+1);let s;
  if(t.need){const v=t.need==='tickets'?(c.tickets>=20?60+c.tickets/2:-1):t.need==='energy'?100-c.energy:c[t.need];if(v<0)return -1;s=v>55?v:v*.25;}
  else{if((c.visited[it.type]||0)>=2||c.played>=c.maxPlays)return -1;s=t.fun*(KINDS[c.kind].likes[t.tag]||1)*(1+.12*(it.level-1))*(.6+it.condition/250)-(c.visited[it.type]?8:0);if(this.event?.key==='school'&&t.tag==='prize')s*=1.3;}
  return s+this.appealNear(it.x,it.y)*.4-dist*.35-queue*4+this.random()*4;
 }
 decide(c){
  if(c.leaving||!this.open)return this.goHome(c);
  if(c.played>=c.maxPlays&&!(c.tickets>=20&&this.items.some(i=>i.type==='prizes'))&&c.hunger<70&&c.thirst<70&&c.bladder<70)return this.goHome(c);
  const occ=this.occupied(),fx=Math.floor(c.x),fy=Math.floor(c.y),d=this.distField(clamp(fx,0,this.w-1),clamp(fy,0,this.h-1),occ);let best=null,bs=0,bestSpot=null;
  for(const it of this.items){const spots=this.spots(it,occ).filter(s=>d[s.y*this.w+s.x]>=0);if(!spots.length)continue;spots.sort((a,b)=>d[a.y*this.w+a.x]-d[b.y*this.w+b.x]);const dist=d[spots[0].y*this.w+spots[0].x],v=this.desire(c,it,dist);if(v>bs){bs=v;best=it;bestSpot=spots[0];}}
  if(!best){c.thought=this.items.some(i=>TYPES[i.type].cat==='games'&&!i.broken)?'money':'bored';c.thoughtTime=3;return this.goHome(c);}
  c.target=best.id;c.state='walk';c.path=this.route(fx,fy,bestSpot.x,bestSpot.y,occ);
 }
 route(fx,fy,tx,ty,occ=this.occupied()){const d=this.distField(tx,ty,occ);const path=[];let x=clamp(fx,0,this.w-1),y=clamp(fy,0,this.h-1);if(d[y*this.w+x]<0)return [{x:tx,y:ty}];let guard=0;while((x!==tx||y!==ty)&&guard++<400){let nx=x,ny=y,bv=d[y*this.w+x];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const ax=x+dx,ay=y+dy;if(this.inside(ax,ay)){const v=d[ay*this.w+ax];if(v>=0&&v<bv){bv=v;nx=ax;ny=ay;}}}if(nx===x&&ny===y)break;x=nx;y=ny;path.push({x,y});}return path;}
 goHome(c){c.state='exit';c.target=null;const d=this.door;c.path=[...this.route(Math.floor(c.x),Math.floor(c.y),d.x,d.y),{x:d.x,y:this.h+1}];}
 release(c){for(const it of this.items){it.users=it.users.filter(u=>u!==c.id);it.queue=it.queue.filter(u=>u!==c.id);}}
 retarget(c){this.release(c);c.target=null;c.state='think';c.timer=.2;}
 walk(p,dt,speed){if(!p.path.length)return true;const n=p.path[0],tx=n.x+.5,ty=n.y+.5,dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy),step=speed*dt;if(dist<=step){p.x=tx;p.y=ty;p.path.shift();return !p.path.length;}p.x+=dx/dist*step;p.y+=dy/dist*step;p.face=dx<0?-1:dx>0?1:p.face;return false;}
 stepCustomer(c,dt){
  const hv=this.up('hvac')?.75:1,heat=this.event?.key==='heat'?1.8:1;
  c.hunger=clamp(c.hunger+dt*.55,0,100);c.thirst=clamp(c.thirst+dt*.7*hv*heat,0,100);c.bladder=clamp(c.bladder+dt*.45,0,100);c.energy=clamp(c.energy-dt*.35*hv*(c.state==='play'?1.6:1),0,100);
  for(const n of NEEDS){if(!this.unlocked(NEED_ITEM[n]))continue;const v=n==='energy'?100-c.energy:c[n];if(v>80)c.happiness-=dt*.9;}
  if(this.up('sound'))c.happiness+=dt*.08;c.happiness+=this.appealNear(c.x,c.y)*dt*.006;
  for(const l of this.litter)if(Math.abs(l.x-c.x)<1.2&&Math.abs(l.y-c.y)<1.2)c.happiness-=dt*.5;
  if(c.thoughtTime>0)c.thoughtTime-=dt;
  if(c.happiness<12&&c.state!=='exit'&&c.state!=='play'){c.thought='angry';c.thoughtTime=3;this.release(c);c.leaving=true;this.goHome(c);}
  c.happiness=clamp(c.happiness,0,100);
  const t=c.target!=null?this.items.find(i=>i.id===c.target):null,speed=KINDS[c.kind].speed;
  switch(c.state){
   case 'enter':if(this.walk(c,dt,speed)){c.state='think';c.timer=.3;}break;
   case 'think':c.timer-=dt;if(c.timer<=0)this.decide(c);break;
   case 'walk':if(!t||t.broken){this.retarget(c);break;}if(this.walk(c,dt,speed)){c.state='queue';c.patience=0;t.queue.push(c.id);}break;
   case 'queue':{
    if(!t||t.broken){if(t&&t.broken){c.thought='broken';c.thoughtTime=2.5;c.happiness-=6;}this.retarget(c);break;}
    const seats=TYPES[t.type].seats;if(t.users.length<seats&&t.queue[0]===c.id){t.queue.shift();t.users.push(c.id);c.state='play';c.timer=TYPES[t.type].dur*(1-.06*(t.level-1));break;}
    const host=this.staff.some(s=>s.role==='host'&&Math.hypot(s.x-c.x,s.y-c.y)<3);c.patience+=dt*(host?.5:1)/(1+.3*this.up('carpet'));if(host)c.happiness+=dt*.15;
    if(c.patience>14){c.thought='wait';c.thoughtTime=2.5;c.happiness-=8;this.retarget(c);}
    break;}
   case 'play':{if(!t){this.retarget(c);break;}t.anim+=dt;c.timer-=dt;if(c.timer<=0)this.finishPlay(c,t);break;}
   case 'exit':if(this.walk(c,dt,speed*1.05)){c.gone=true;}break;
  }
 }
 finishPlay(c,t){
  const ty=TYPES[t.type];t.users=t.users.filter(u=>u!==c.id);c.state='think';c.timer=.4+this.random()*.6;c.target=null;
  let price=ty.price;if(ty.cat==='games'){price=Math.round(ty.price*(1+.15*(t.level-1))*(1+.1*this.up('tokens'))*(this.campaign?.key==='tournament'?1.5:1)*100)/100;}
  if(price>0){c.spent+=price;this.earn(price,t);}
  c.visited[t.type]=(c.visited[t.type]||0)+1;
  if(ty.cat==='games'){c.played++;this.plays++;this.today.plays++;this.typePlays[t.type]=(this.typePlays[t.type]||0)+1;t.plays++;c.happiness+=ty.fun*.6*(1+.1*(t.level-1))*(KINDS[c.kind].likes[ty.tag]||1);c.tickets+=Math.round((ty.tickets||0)*(1+.2*(t.level-1)));c.energy-=4;
   const wear=(5+this.random()*5)/(1+.25*this.up('service'))/(1+.1*(t.level-1));t.condition=Math.max(0,t.condition-wear);if(t.condition<30&&this.random()<(30-t.condition)/45){t.broken=true;this.note(ty.name+' broke down.');this.pop({kind:'broken',x:t.x,y:t.y});}
  }else if(ty.need==='tickets'){const gain=12+Math.min(30,c.tickets/8)*(1+.4*this.up('catalog'));c.happiness+=gain;c.tickets=0;const margin=Math.round(gain*.6);this.earn(margin,t);}
  else if(ty.need){if(ty.need==='energy')c.energy=100;else c[ty.need]=0;c.happiness+=ty.fun;if(ty.need==='hunger'||ty.need==='thirst'){const binNear=this.items.some(i=>TYPES[i.type].bin&&Math.hypot(i.x-c.x,i.y-c.y)<3.5);if(this.random()<(binNear?.08:.45))c.dropLitter=4+this.random()*6;}}
  else c.happiness+=ty.fun*.6;
  c.happiness=clamp(c.happiness,0,100);
 }
 earn(amount,item){this.cash+=amount;this.totalEarned+=amount;this.today.income+=amount;if(item){item.earned+=amount;this.pop({kind:'coin',x:item.x+(TYPES[item.type].w>1&&!item.rot?1:.5),y:item.y+.3,text:'+$'+(Math.round(amount*100)/100)});}}
 farewell(c){
  this.release(c);this.served++;this.today.left++;this.today.happy+=c.happiness;
  const weight=(c.critic?8:1)*(1+.4*this.up('loyalty')*(c.happiness>60?1:0));this.reputation=clamp(this.reputation+(c.happiness-this.reputation)*.012*weight,0,100);
  if(c.critic){const good=c.happiness>=65;this.note('The critic left '+(good?'impressed':'unimpressed')+' ('+Math.round(c.happiness)+'/100).');this.pop({kind:'critic',good});}
  if(c.happiness<35)this.lost++;
 }
 stepStaff(s,dt){
  if(s.role==='mechanic'){
   if(s.task){const it=this.items.find(i=>i.id===s.task);if(!it){s.task=null;s.path=[];return;}if(this.walk(s,dt,2.6)){s.timer+=dt;s.working=true;if(s.timer>=3.5){it.condition=100;it.broken=false;s.task=null;s.timer=0;s.working=false;this.pop({kind:'fixed',x:it.x,y:it.y});}}return;}
   const jobs=this.items.filter(i=>TYPES[i.type].cat!=='decor'&&(i.broken||i.condition<55)&&!this.staff.some(o=>o!==s&&o.task===i.id)).sort((a,b)=>(b.broken-a.broken)||a.condition-b.condition);
   if(jobs.length){const occ=this.occupied(),it=jobs[0],sp=this.spots(it,occ)[0];if(sp){s.task=it.id;s.timer=0;s.path=this.route(Math.floor(s.x),Math.floor(s.y),sp.x,sp.y,occ);return;}}
  }else if(s.role==='janitor'){
   if(s.task){const l=this.litter.find(i=>i.id===s.task);if(!l){s.task=null;s.path=[];return;}if(this.walk(s,dt,2.5)){s.timer+=dt;s.working=true;if(s.timer>=1.3){this.litter=this.litter.filter(i=>i!==l);s.task=null;s.timer=0;s.working=false;}}return;}
   const l=this.litter.filter(i=>!this.staff.some(o=>o!==s&&o.task===i.id)).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];if(l){s.task=l.id;s.timer=0;s.path=this.route(Math.floor(s.x),Math.floor(s.y),Math.floor(l.x),Math.floor(l.y));return;}
  }else if(s.role==='host'&&!s.path.length){const q=this.items.filter(i=>i.queue.length).sort((a,b)=>b.queue.length-a.queue.length)[0];if(q&&this.random()<.6){const sp=this.spots(q)[0];if(sp){s.path=this.route(Math.floor(s.x),Math.floor(s.y),sp.x,sp.y);}}}
  s.working=false;if(!s.path.length){s.timer-=dt;if(s.timer<=0){s.timer=1.5+this.random()*3;const tx=Math.floor(this.random()*this.w),ty=Math.floor(this.random()*this.h);if(this.walkable(tx,ty))s.path=this.route(Math.floor(s.x),Math.floor(s.y),tx,ty).slice(0,8);}}else this.walk(s,dt,1.6);
 }
 dailyCosts(){const wages=this.staff.reduce((a,s)=>a+STAFF[s.role].wage,0),util=Math.round(this.items.filter(i=>TYPES[i.type].cat!=='decor').length*1.5);return {rent:this.loc.rent,wages,util,total:this.loc.rent+wages+util};}
 endDay(){
  const costs=this.dailyCosts();this.cash-=costs.total;const avg=this.today.left?Math.round(this.today.happy/this.today.left):0;
  const report={day:this.day,income:Math.round(this.today.income),costs:costs.total,visitors:this.today.visitors,happy:avg,plays:this.today.plays,event:this.event?.key||null};
  this.history.push(report);if(this.history.length>21)this.history.shift();
  if(this.cash<0&&this.staff.length){const gone=this.staff.pop();this.note(gone.name+' quit: payroll could not be met.');}
  this.day++;this.today=this.blankDay();this.event=null;this.rollEvent();this.pop({kind:'day',report});this.checkMilestones();return report;
 }
 rollEvent(){
  if(this.items.length<3||this.random()>.38)return;const keys=Object.keys(EVENTS).filter(k=>k!=='critic'||this.level>=1);const key=this.pick(keys);this.event={key};this.note('Today: '+EVENTS[key].name+'.');
  if(key==='outage'){const m=this.items.filter(i=>TYPES[i.type].cat==='games'&&!i.broken);if(m.length){const it=this.pick(m);it.broken=true;it.condition=10;}}
  if(key==='critic')this.event.pending=true;
  if(key==='party')this.event.pending=true;
 }
 step(dt){
  dt=Math.min(dt,.25);const busy=this.open||this.customers.length>0;
  if(busy){this.time+=dt;this.dayTime+=dt;if(this.dayTime>=DAY_LENGTH){this.dayTime-=DAY_LENGTH;this.endDay();}}
  if(this.campaign){this.campaign.left-=dt;if(this.campaign.left<=0){this.note(CAMPAIGNS[this.campaign.key].name+' finished.');this.campaign=null;}}
  if(this.open){
   this.spawnTimer-=dt;const cap=this.maxCustomers();
   if(this.spawnTimer<=0){this.spawnTimer=this.spawnInterval()*(.6+this.random()*.8);if(this.customers.length<cap&&Number.isFinite(this.spawnTimer))this.spawn(this.chooseKind());if(!Number.isFinite(this.spawnTimer))this.spawnTimer=2;}
   if(this.event?.pending&&this.customers.length<cap){if(this.event.key==='critic')this.spawn('adult',{critic:true,shirt:'#1f1f2a',maxPlays:4});else for(let i=0;i<5;i++)this.spawn('kid',{party:true,budget:22+i,x:this.door.x+.5+(i-2)*.15});this.event.pending=false;}
  }
  for(const c of this.customers){this.stepCustomer(c,dt);if(c.dropLitter!=null){c.dropLitter-=dt;if(c.dropLitter<=0){c.dropLitter=null;if(this.litter.length<40&&c.y<this.h)this.litter.push({id:this.nextId++,x:c.x+(this.random()-.5)*.4,y:c.y+(this.random()-.5)*.4});}}}
  for(const c of this.customers)if(c.gone)this.farewell(c);this.customers=this.customers.filter(c=>!c.gone);
  for(const s of this.staff)this.stepStaff(s,dt);
  for(const it of this.items)if(!it.users.length)it.anim=Math.max(0,it.anim-dt);
 }
 advisor(){
  const games=this.items.filter(i=>TYPES[i.type].cat==='games');
  if(!games.length)return 'Choose an attraction on the left, then click an empty floor tile.';
  if(!this.open&&!this.customers.length)return 'Open your doors to welcome visitors.';
  const broken=this.items.filter(i=>i.broken);if(broken.length&&!this.staff.some(s=>s.role==='mechanic'))return broken.length+' machine'+(broken.length>1?'s are':' is')+' broken. Click to repair, or hire a mechanic.';
  const needs={hunger:'snack',thirst:'soda',bladder:'restroom'};for(const [n,t] of Object.entries(needs)){if(this.unlocked(t)&&!this.items.some(i=>i.type===t)&&this.customers.filter(c=>c[n]>70).length>=2)return 'Visitors are '+({hunger:'hungry',thirst:'thirsty',bladder:'looking for a restroom'}[n])+'. Build a '+TYPES[t].name.toLowerCase()+'.';}
  if(this.litter.length>5&&!this.staff.some(s=>s.role==='janitor'))return 'The floor is getting messy. Hire a janitor or add trash bins.';
  const waits=this.items.filter(i=>i.queue.length>=2);if(waits.length)return 'Long lines at the '+TYPES[waits[0].type].name+'. Add more attractions.';
  if(this.items.some(i=>i.type==='claw'||i.type==='skeeball')&&!this.items.some(i=>i.type==='prizes')&&this.unlocked('prizes'))return 'Ticket-hungry visitors want a prize counter.';
  if(this.canRelocate())return 'You are ready to move to '+LOCATIONS[this.level+1].name+'. Open Business → Location.';
  const g=this.goalStatus();if(g){const miss=g.parts.find(p=>p.have<p.need);if(miss)return 'Next location: '+miss.label.toLowerCase()+' '+(miss.money?'$'+Math.floor(miss.have).toLocaleString()+' / $'+miss.need.toLocaleString():miss.have+' / '+miss.need)+'.';}
  return 'Your arcade is humming. Keep improving it.';
 }
 serialize(){
  return JSON.stringify({version:2,cash:this.cash,totalEarned:this.totalEarned,plays:this.plays,day:this.day,dayTime:this.dayTime,level:this.level,reputation:this.reputation,nextId:this.nextId,open:this.open,
   items:this.items.map(i=>({id:i.id,type:i.type,x:i.x,y:i.y,rot:i.rot,level:i.level,condition:i.condition,broken:i.broken,earned:i.earned,plays:i.plays})),
   staff:this.staff.map(s=>({id:s.id,role:s.role,name:s.name})),upgrades:this.upgrades,claimed:this.claimed,campaign:this.campaign,event:this.event&&{key:this.event.key},served:this.served,lost:this.lost,history:this.history,typePlays:this.typePlays,litter:this.litter.slice(0,40)});
 }
 static restore(raw,random){return Tycoon.load(raw,random);}
 static load(raw,random=Math.random){
  const g=new Tycoon(random),s=typeof raw==='string'?JSON.parse(raw):raw;if(!s||typeof s!=='object')throw new Error('Unreadable save.');
  const num=(v,d)=>Number.isFinite(v)?v:d;
  if(s.version!==2){
   // Arcade Tycoon 1.0 save: keep lifetime progress and location, refund the old floor as starting cash.
   g.totalEarned=Math.max(0,num(s.totalEarned,0));g.level=clamp(Math.floor(num(s.level,0)),0,LOCATIONS.length-1);g.day=Math.max(1,Math.floor(num(s.day,1)));g.plays=Math.max(0,Math.floor(num(s.plays,0)));g.reputation=clamp(num(s.reputation,50),0,100);
   const refund=(Array.isArray(s.items)?s.items.length:0)*200;g.cash=Math.max(800,num(s.cash,800)+refund)+g.level*1500;g.served=Math.max(0,Math.floor(num(s.served,0)));g.migrated=true;g.note('Welcome to Arcade Tycoon 2.0! Your lifetime progress came with you, and your old floor was refunded.');return g;
  }
  g.cash=num(s.cash,800);g.totalEarned=Math.max(0,num(s.totalEarned,0));g.plays=num(s.plays,0);g.day=Math.max(1,num(s.day,1));g.dayTime=clamp(num(s.dayTime,0),0,DAY_LENGTH);g.level=clamp(Math.floor(num(s.level,0)),0,LOCATIONS.length-1);g.reputation=clamp(num(s.reputation,50),0,100);g.nextId=Math.max(1,num(s.nextId,1));g.open=!!s.open;
  for(const i of Array.isArray(s.items)?s.items:[]){if(!TYPES[i.type])continue;const it={id:i.id,type:i.type,x:i.x|0,y:i.y|0,rot:i.rot?1:0,level:clamp(i.level|0,1,5),condition:clamp(num(i.condition,100),0,100),broken:!!i.broken,earned:num(i.earned,0),plays:num(i.plays,0),users:[],queue:[],anim:0};if(g.cells(it).every(c=>g.inside(c.x,c.y))&&!g.cells(it).some(c=>g.occupied().has(c.x+','+c.y)))g.items.push(it);g.nextId=Math.max(g.nextId,it.id+1);}
  const d=g.door;for(const st of Array.isArray(s.staff)?s.staff:[])if(STAFF[st.role]){g.staff.push({id:st.id,role:st.role,name:st.name||'Sam',x:d.x+.5,y:d.y+.5,path:[],task:null,timer:0});g.nextId=Math.max(g.nextId,st.id+1);}
  g.upgrades={};for(const k in IMPROVEMENTS)if(s.upgrades?.[k])g.upgrades[k]=clamp(s.upgrades[k]|0,0,IMPROVEMENTS[k].costs.length);
  g.claimed=Array.isArray(s.claimed)?s.claimed.filter(x=>typeof x==='string'):[];g.campaign=s.campaign&&CAMPAIGNS[s.campaign.key]?{key:s.campaign.key,left:num(s.campaign.left,0)}:null;g.event=s.event&&EVENTS[s.event.key]?{key:s.event.key}:null;
  g.served=num(s.served,0);g.lost=num(s.lost,0);g.history=Array.isArray(s.history)?s.history.slice(-21):[];g.typePlays=s.typePlays&&typeof s.typePlays==='object'?s.typePlays:{};g.litter=Array.isArray(s.litter)?s.litter.filter(l=>g.inside(Math.floor(l.x),Math.floor(l.y))).map(l=>({id:g.nextId++,x:l.x,y:l.y})):[];
  return g;
 }
}
