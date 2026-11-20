export const STATIONS=[
 {id:0,letter:'A',name:'Rosebay',color:'#e29b9b',x:65,y:70},
 {id:1,letter:'B',name:'Sunfield',color:'#e8c17c',x:235,y:70},
 {id:2,letter:'C',name:'Pinecross',color:'#91c7b6',x:365,y:70},
 {id:3,letter:'D',name:'Blueport',color:'#8fbcdd',x:535,y:70}
];
export const JUNCTIONS=[{x:300,y:530},{x:170,y:330},{x:430,y:330}];
export const CROSSINGS=[{x:156.75,y:209.76},{x:443.25,y:209.76}];
export const ROUND_SECONDS=90;
export const SHIFTS={
 local:{name:'Local',description:'A gentle start, then a steady 90-second rush. Three strikes.',speed:1,charges:1},
 rush:{name:'Rush Hour',description:'Busy waves and express trains. Express arrivals earn +75.',speed:1.12,charges:2},
 practice:{name:'Practice',description:'Slower trains, more breathing room, unlimited strikes. Unranked.',speed:.72,charges:2}
};
function smooth(points){const out=[points[0]];for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],c=points[i+1],d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(26,d1*.35,d2*.35),p=[b[0]+(a[0]-b[0])*r/d1,b[1]+(a[1]-b[1])*r/d1],q=[b[0]+(c[0]-b[0])*r/d2,b[1]+(c[1]-b[1])*r/d2];out.push(p);for(let k=1;k<=10;k++){const t=k/10,u=1-t;out.push([u*u*p[0]+2*u*t*b[0]+t*t*q[0],u*u*p[1]+2*u*t*b[1]+t*t*q[1]]);}}out.push(points.at(-1));return out;}
function edge(id,points,junction=null,station=null){const path=smooth(points),lengths=[],total=path.slice(1).reduce((sum,p,i)=>{const d=Math.hypot(p[0]-path[i][0],p[1]-path[i][1]);lengths.push(d);return sum+d;},0);return {id,path,lengths,length:total,junction,station};}
export const EDGES={
 entry:edge('entry',[[300,820],[300,530]],0),
 west:edge('west',[[300,530],[300,455],[170,385],[170,330]],1),
 east:edge('east',[[300,530],[300,455],[430,385],[430,330]],2),
 A:edge('A',[[170,330],[235,265],[65,145],[65,70]],null,0),
 B:edge('B',[[170,330],[90,265],[235,145],[235,70]],null,1),
 C:edge('C',[[430,330],[510,265],[365,145],[365,70]],null,2),
 D:edge('D',[[430,330],[365,265],[535,145],[535,70]],null,3)
};

function crossings(edges){
 const found=[];
 for(const pair of [['A','B'],['C','D']]){
  const a=edges[pair[0]],b=edges[pair[1]];let da=0;
  for(let i=0;i<a.lengths.length;i++){let db=0;
   for(let j=0;j<b.lengths.length;j++){
    const p=a.path[i],q=b.path[j],r=[a.path[i+1][0]-p[0],a.path[i+1][1]-p[1]],v=[b.path[j+1][0]-q[0],b.path[j+1][1]-q[1]],cross=(x,y)=>x[0]*y[1]-x[1]*y[0],den=cross(r,v);
    if(Math.abs(den)>1e-8){const d=[q[0]-p[0],q[1]-p[1]],t=cross(d,v)/den,u=cross(d,r)/den;
     if(t>=0&&t<=1&&u>=0&&u<=1&&da+t*a.lengths[i]>35&&db+u*b.lengths[j]>35){const x=p[0]+t*r[0],y=p[1]+t*r[1];if(!found.some(c=>Math.hypot(c.x-x,c.y-y)<10))found.push({x,y,pair:pair.join(''),at:{[pair[0]]:da+t*a.lengths[i],[pair[1]]:db+u*b.lengths[j]}});}
    }db+=b.lengths[j];
   }da+=a.lengths[i];
  }
 }return found;
}
function board(id,name,description,junctions,points,theme){
 const edges={};for(const [key,path]of Object.entries(points))edges[key]=edge(key,path,key==='entry'?0:key==='west'?1:key==='east'?2:null,'ABCD'.includes(key)&&key.length===1?'ABCD'.indexOf(key):null);
 return {id,name,description,junctions,edges,crossings:crossings(edges),theme};
}
export const BOARDS={
 meadow:{id:'meadow',name:'Meadow',description:'The original yard · two crossings',junctions:JUNCTIONS,edges:EDGES,crossings:crossings(EDGES),theme:'meadow'},
 harbor:board('harbor','Harbor','Room to learn · no crossings',[{x:300,y:600},{x:150,y:400},{x:450,y:400}],{
  entry:[[300,820],[300,600]],west:[[300,600],[210,540],[150,470],[150,400]],east:[[300,600],[390,540],[450,470],[450,400]],
  A:[[150,400],[65,300],[65,70]],B:[[150,400],[235,300],[235,70]],C:[[450,400],[365,300],[365,70]],D:[[450,400],[535,300],[535,70]]
 },'harbor'),
 timber:board('timber','Timber','A winding approach · one crossing',[{x:300,y:575},{x:170,y:365},{x:430,y:365}],{
  entry:[[300,820],[355,755],[245,655],[300,575]],west:[[300,575],[170,505],[170,365]],east:[[300,575],[430,505],[430,365]],
  A:[[170,365],[245,285],[65,155],[65,70]],B:[[170,365],[85,285],[235,155],[235,70]],C:[[430,365],[365,250],[365,70]],D:[[430,365],[535,250],[535,70]]
 },'timber'),
 quarry:board('quarry','Quarry','Short final turns · two crossings',[{x:300,y:520},{x:145,y:315},{x:455,y:315}],{
  entry:[[300,820],[300,520]],west:[[300,520],[145,470],[100,390],[145,315]],east:[[300,520],[455,470],[500,390],[455,315]],
  A:[[145,315],[240,245],[65,150],[65,70]],B:[[145,315],[60,245],[235,150],[235,70]],C:[[455,315],[540,245],[365,150],[365,70]],D:[[455,315],[360,245],[535,150],[535,70]]
 },'quarry')
};
export function crossingWarnings(arena){
 const warnings=[],factor=arena.slow>0?.45:1;
 for(const crossing of arena.board.crossings){const arrivals=[];
  for(const train of arena.trains){const advice=routeAdvice(train,arena.switches,arena.board),route=advice.path;let distance=-train.distance;
   for(const id of route){if(crossing.pair.includes(id)&&id.length===1){distance+=crossing.at[id];const eta=distance/(train.speed*factor)+train.hold;if(eta>-.35&&eta<4)arrivals.push({train,edge:id,eta});break;}distance+=arena.board.edges[id].length;}
  }
  for(let i=0;i<arrivals.length;i++)for(let j=i+1;j<arrivals.length;j++){const a=arrivals[i],b=arrivals[j];if(a.edge!==b.edge&&Math.abs(a.eta-b.eta)<.85){const later=a.eta>b.eta?a:b;warnings.push({crossing,ids:[a.train.id,b.train.id],holdId:later.train.id,canHold:!later.train.holdUsed||later.train.hold>0});}}
 }return warnings;
}

export function pointOn(id,distance,board=BOARDS.meadow){const e=board.edges[id];let remaining=Math.max(0,Math.min(e.length,distance));for(let i=0;i<e.lengths.length;i++){const length=e.lengths[i];if(remaining<=length||i===e.lengths.length-1){const a=e.path[i],b=e.path[i+1],t=length?remaining/length:0;return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:(b[0]-a[0])/length,dy:(b[1]-a[1])/length};}remaining-=length;}}
export function nextEdge(junction,choice){return junction===0?(choice?'east':'west'):junction===1?(choice?'B':'A'):(choice?'D':'C');}
// Trace only the rails the train can still take; a passed junction cannot be fixed.
export function routeAdvice(train,switches,board=BOARDS.meadow){
 let id=train.edge;const path=[id],wanted=train.target;let fix=null;
 for(let n=0;n<3;n++){const e=board.edges[id];if(e.station!==null)return {path,station:e.station,correct:e.station===wanted,fix};
  const choice=e.junction===0?Number(wanted>=2):wanted%2;
  const reachable=e.junction===0||(e.junction===1?wanted<2:wanted>=2);
  if(reachable&&switches[e.junction]!==choice&&fix===null)fix=e.junction;
  id=nextEdge(e.junction,switches[e.junction]);path.push(id);
 }
}
export class Switchyard{
 constructor(random=Math.random,shift='local',boardId='meadow'){this.board=Object.hasOwn(BOARDS,boardId)?BOARDS[boardId]:BOARDS.meadow;this.shift=Object.hasOwn(SHIFTS,shift)?shift:'local';Object.assign(this,{random,switches:[0,0,0],trains:[],time:0,spawnIn:.8,nextId:1,spawned:0,scheduled:0,queue:[],score:0,streak:0,bestStreak:0,delivered:0,expressDelivered:0,errors:0,lives:3,charges:SHIFTS[this.shift].charges,slow:0,events:[],result:null});this.fillQueue();}
 fillQueue(){while(this.queue.length<3){const n=this.scheduled++,target=n<4?n:Math.floor(this.random()*4);this.queue.push({target,express:this.shift==='rush'&&n>=2&&n%3===2});}}
 flip(id){if(this.result||!Number.isInteger(id)||id<0||id>2)return false;this.switches[id]=1-this.switches[id];return true;}
 hold(id){if(this.result)return false;const t=this.trains.find(t=>t.id===id);if(!t)return false;if(t.hold>0){t.hold=0;return true;}if(t.holdUsed)return false;t.hold=2;t.holdUsed=true;this.events.push({type:'hold',id});return true;}
 slowTime(){if(this.result||this.charges<=0||this.slow>0)return false;this.charges--;this.slow=4;return true;}
 spawn(){const {target,express}=this.queue.shift();this.fillQueue();const base=this.spawned<2?82:Math.min(137,90+this.time*.35)+(this.random()-.5)*20,speed=base*SHIFTS[this.shift].speed*(express?1.25:1);const train={id:this.nextId++,edge:'entry',distance:0,target,express,speed,hold:0,holdUsed:false,blocked:false};this.trains.push(train);this.spawned++;this.events.push({type:'arrival',target,id:train.id});return train;}
 spawnDelay(){if(this.shift==='practice')return 8;if(this.shift==='rush')return (this.time%24<12?2.65:4.5)+this.random()*.4;return this.spawned<4?6.2:Math.max(2.35,4.7-this.time*.027)+this.random()*.7;}
 fail(type,data={}){if(this.shift!=='practice')this.lives=Math.max(0,this.lives-1);this.errors++;this.streak=0;this.events.push({type,...data});if(this.lives===0)this.finish('strikes');}
 finish(reason='complete'){if(this.result)return;this.result={reason,shift:this.shift,board:this.board.id,score:this.score,delivered:this.delivered,expressDelivered:this.expressDelivered,errors:this.errors,streak:this.bestStreak,medal:this.shift==='practice'?null:this.score>=4000?'GOLD':this.score>=2400?'SILVER':this.score>=1200?'BRONZE':null,time:this.time};this.events.push({type:'finish'});}
 step(dt){this.events=[];if(!Number.isFinite(dt)||dt<=0||this.result)return;let remaining=Math.min(dt,5);while(remaining>1e-8&&!this.result){const tick=Math.min(.025,remaining);this.tick(tick);remaining-=tick;}}
 tick(dt){this.time+=dt;const factor=this.slow>0?0.45:1;this.slow=Math.max(0,this.slow-dt);if(this.time<ROUND_SECONDS){this.spawnIn-=dt*factor;if(this.spawnIn<=0&&this.trains.length<12&&!this.trains.some(t=>t.edge==='entry'&&t.distance<105)){this.spawn();this.spawnIn=this.spawnDelay();}}
  // Trains on a shared rail keep a safe following distance automatically.
  const ordered=[...this.trains].sort((a,b)=>b.distance-a.distance);for(const t of ordered){if(t.gone)continue;const held=t.hold>0;t.hold=Math.max(0,t.hold-dt);const ahead=this.trains.filter(a=>a!==t&&!a.gone&&a.edge===t.edge&&a.distance>t.distance).sort((a,b)=>a.distance-b.distance)[0];const available=ahead?Math.max(0,ahead.distance-t.distance-66):Infinity,move=held?0:Math.min(t.speed*dt*factor,available);t.blocked=!held&&move<t.speed*dt*factor*.8;t.distance+=move;
   for(let transitions=0;transitions<3&&!t.gone;transitions++){const e=this.board.edges[t.edge];if(t.distance<e.length)break;if(e.station!==null){t.gone=true;if(e.station===t.target){this.delivered++;this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);const points=100*Math.min(5,1+Math.floor(this.streak/5))+(t.express?75:0);if(t.express)this.expressDelivered++;this.score+=points;if(this.delivered%6===0){this.charges=Math.min(2,this.charges+1);this.events.push({type:'charge'});}this.events.push({type:'delivery',station:e.station,points,express:!!t.express,streak:this.streak});}else this.fail('wrong',{station:e.station,target:t.target});break;}t.distance-=e.length;t.edge=nextEdge(e.junction,this.switches[e.junction]);this.events.push({type:'junction',id:t.id,junction:e.junction});}
   if(this.result)break;
  }
  if(!this.result){for(let i=0;i<this.trains.length;i++){const a=this.trains[i];if(a.gone)continue;for(let j=i+1;j<this.trains.length;j++){const b=this.trains[j];if(b.gone)continue;const pair=[a.edge,b.edge].sort().join(''),cross=this.board.crossings.find(c=>c.pair===pair);if(!cross)continue;const pa=pointOn(a.edge,a.distance,this.board),pb=pointOn(b.edge,b.distance,this.board);if(Math.hypot(pa.x-cross.x,pa.y-cross.y)<48&&Math.hypot(pb.x-cross.x,pb.y-cross.y)<48&&Math.hypot(pa.x-pb.x,pa.y-pb.y)<27){a.gone=b.gone=true;this.fail('collision',{x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2});break;}}if(this.result)break;}}
  this.trains=this.trains.filter(t=>!t.gone);if(!this.result&&this.time>=ROUND_SECONDS&&!this.trains.length)this.finish();
 }
}
