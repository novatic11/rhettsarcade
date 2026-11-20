export const SIZE=31,CRUMBLE=0.92,CAR_RADIUS=.45;
export const COLORS=['#9cdcff','#ef8f64','#a294d4','#92be53'];
// Every mask mirrors across both axes and rotates by 90 degrees.
export const LAYOUTS=[
 {name:'The Grid',tile:()=>true},
 {name:'Clipped Corners',tile:(x,y)=>x+y<=13},
 {name:'Center Ring',tile:(x,y)=>x>1||y>1},
 {name:'Crossroads',tile:(x,y)=>x<=5||y<=5},
 {name:'Four Windows',tile:(x,y)=>!(x>=2&&x<=3&&y>=2&&y<=3)},
 {name:'Double Diagonal',tile:(x,y)=>Math.abs(x-y)<=3},
 {name:'Swiss Grid',tile:(x,y)=>!(Math.floor(x)%4===2&&Math.floor(y)%4===2)},
 {name:'Forked Rim',tile:(x,y)=>!((x>=6&&y<=1)||(y>=6&&x<=1))},
 {name:'The Diamond',tile:(x,y)=>x+y<=11},
 {name:'The Racetrack',tile:(x,y)=>Math.max(x,y)>=5||x<=1||y<=1},
 // Coordinates are distances from the center in a normalized 0–8 quadrant.
 // Each new arena keeps four matching starting areas and connected driving routes.
 {name:'Roundabout',tile:(x,y)=>Math.hypot(x,y)<=8.2&&Math.hypot(x,y)>=2.2},
 {name:'Octagon',tile:(x,y)=>Math.max(x,y)<=7.5&&x+y<=11.7},
 {name:'Four Courtyards',tile:(x,y)=>!((Math.min(x,y)>=1.7&&Math.max(x,y)<=3.3)||(Math.min(x,y)>=6.2&&Math.max(x,y)<=7.2))},
 {name:'Spoke Yard',tile:(x,y)=>Math.min(x,y)<=1.6||Math.abs(x-y)<=1.6},
 {name:'Pit Lane',tile:(x,y)=>Math.min(x,y)<=1.1||(Math.max(x,y)<=6.4&&!(Math.min(x,y)>=2.1&&Math.max(x,y)<=3.8))},
 {name:'Grandstand',tile:(x,y)=>x+y<=13.4&&!(Math.min(x,y)<=.6&&Math.max(x,y)>=3.2&&Math.max(x,y)<=5.4)},
 {name:'Bullseye',tile:(x,y)=>Math.max(x,y)<=2.1||Math.max(x,y)>=3.8||Math.min(x,y)<=1.1||Math.abs(x-y)<=1.1},
 {name:'Four Leaf',tile:(x,y)=>(x-3.8)**2+(y-3.8)**2<=18||Math.max(x,y)<=2.4},
 {name:'Hourglass',tile:(x,y)=>x+y<=8.8||(Math.max(x,y)>=4.2&&Math.min(x,y)>=2.8)},
 {name:'Lattice',tile:(x,y)=>Math.min(x,y)<=1.1||Math.max(x,y)>=6.8||(x>=3.7&&x<=5.8)||(y>=3.7&&y<=5.8)},
 {name:'Corner Cuts',tile:(x,y)=>Math.max(x,y)<=6.4||Math.min(x,y)<=4},
 {name:'Toll Plaza',tile:(x,y)=>!(Math.min(x,y)>=1.5&&Math.min(x,y)<=2.7&&Math.max(x,y)>=4&&Math.max(x,y)<=6.4)},
 {name:'Compass',tile:(x,y)=>Math.min(x,y)<=1.6||(Math.max(x,y)<=6.8&&Math.min(x,y)>=3.7)||Math.abs(x-y)<=.7},
 {name:'Split Ring',tile:(x,y)=>Math.hypot(x,y)<=8.3&&(Math.hypot(x,y)>=4.6||Math.min(x,y)<=1.6||Math.abs(x-y)<=1.1)},
 {name:'Median Strip',tile:(x,y)=>!((Math.min(x,y)<.8&&Math.max(x,y)>2.7&&Math.max(x,y)<6.6)||(Math.min(x,y)>1.6&&Math.min(x,y)<2.7&&Math.max(x,y)>4.2&&Math.max(x,y)<6.6))},
 {name:'Four Bays',tile:(x,y)=>Math.max(x,y)<=5.9||Math.min(x,y)<=2.7||Math.abs(x-y)<=1.6},
 {name:'Keyhole Park',tile:(x,y)=>Math.hypot(x,y)<=8.6&&!(Math.min(x,y)>=2.1&&Math.min(x,y)<=3.4&&Math.max(x,y)>=4&&Math.max(x,y)<=5.8)},
 {name:'Clover Circuit',tile:(x,y)=>Math.min(x,y)<=1.1||Math.max(x,y)>=6.6||(Math.hypot(x,y)>=3.8&&Math.hypot(x,y)<=6.9)||Math.abs(x-y)<=1.2},
 {name:'Turnpike',tile:(x,y)=>Math.max(x,y)<=2.7||Math.min(x,y)>=3.2||(Math.min(x,y)<=1.1&&Math.max(x,y)<=5.8)||Math.abs(x-y)<=1.9},
 {name:'Central Reservoir',tile:(x,y)=>!(x<3.2&&y<3.2)&&x+y<=13.9}
];
export function layoutTiles(index){const mask=LAYOUTS[index].tile,center=(SIZE-1)/2;return Array.from({length:SIZE*SIZE},(_,i)=>mask(Math.abs(i%SIZE-center)*8/center,Math.abs(Math.floor(i/SIZE)-center)*8/center)?Infinity:0);}
export function angleDelta(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b));}
export function seededRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function drive(car,dt,steer,pace,drift=false){
 const acceleration=pace<car.speed?5.2:2.6;car.speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,pace-car.speed));
 car.angle+=steer*(1.4+Math.min(car.speed,4)*.3)*(drift?1.3:1)*dt;
 car.bumpTime=Math.max(0,(car.bumpTime||0)-dt);
 const grip=(drift?1.7:6.8-Math.abs(steer)*1.8)*(car.bumpTime>0?.25:1),blend=1-Math.exp(-grip*dt);
 car.vx+=(Math.cos(car.angle)*car.speed-car.vx)*blend;car.vy+=(Math.sin(car.angle)*car.speed-car.vy)*blend;
 car.drifting=drift||Math.abs(angleDelta(car.angle,Math.atan2(car.vy,car.vx)))>.3;
}
export class Arena{
 constructor(random=Math.random,layoutIndex=Math.floor(random()*LAYOUTS.length)){this.random=random;this.layoutIndex=layoutIndex;this.layoutName=LAYOUTS[layoutIndex].name;this.time=0;this.tiles=layoutTiles(layoutIndex);this.result=null;this.events=[];this.bumpAt=new Map();this.pendingTiles=[];const margin=(SIZE-1)/2*.375,low=(layoutIndex===9?Math.floor(margin):Math.ceil(margin))+.5,high=SIZE-low;this.cars=[[low,low,Math.PI/4],[high,low,3*Math.PI/4],[high,high,-3*Math.PI/4],[low,high,-Math.PI/4]].map(([x,y,angle],id)=>({id,name:['YOU','EMBER','VIOLET','LIME'][id],x,y,angle:layoutIndex===9?id*Math.PI/2:angle,speed:0,vx:0,vy:0,alive:true,fallAt:null,target:angle,think:0,bias:random()<.5?-1:1,steer:0,trail:[]}));}
 collide(){
  for(let pass=0;pass<2;pass++)for(let i=0;i<this.cars.length;i++)for(let j=i+1;j<this.cars.length;j++){
   const a=this.cars[i],b=this.cars[j];if(!a.alive||!b.alive)continue;
   const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);if(distance>=CAR_RADIUS*2)continue;
   const nx=distance>1e-6?dx/distance:1,ny=distance>1e-6?dy/distance:0,overlap=(CAR_RADIUS*2-distance+.002)/2;
   a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
   const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
   if(approach<0){const impulse=-approach*.925;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny;a.bumpTime=b.bumpTime=.24;a.think=b.think=0;const pair=i+':'+j;if(-approach>.35&&this.time-(this.bumpAt.get(pair)??-Infinity)>.18){this.events.push({type:'bump',x:(a.x+b.x)/2,y:(a.y+b.y)/2});this.bumpAt.set(pair,this.time);}}
  }
  for(const car of this.cars){if(!car.alive)continue;if(!this.safe(car.x,car.y)){car.alive=false;car.fallAt=this.time;this.events.push({type:'fall',id:car.id});}else this.mark(car.x,car.y);}
 }
 index(x,y){const col=Math.floor(x),row=Math.floor(y);return col<0||row<0||col>=SIZE||row>=SIZE?-1:row*SIZE+col;}
 safe(x,y,at=this.time){const i=this.index(x,y);return i>=0&&this.tiles[i]>at;}
 mark(x,y){const i=this.index(x,y);if(i>=0&&this.tiles[i]===Infinity){const expires=this.tiles[i]=this.time+CRUMBLE,event={x:Math.floor(x)+.5,y:Math.floor(y)+.5};this.pendingTiles.push({...event,expires});this.events.push({type:'crack',...event});}}
 plan(car){
  let best=-Infinity,target=car.angle,pace=3.8;
  const offsets=[-2.2,-1.8,-1.45,-1.05,-.65,-.3,0,.3,.65,1.05,1.45,1.8,2.2];
  for(const offset of offsets){
   let x=car.x,y=car.y,score=0,survived=0;const wanted=car.angle+offset,visited=new Set(),ghost={...car};
   for(let j=1;j<=23;j++){
    const dt=.1;drive(ghost,dt,Math.max(-1,Math.min(1,angleDelta(wanted,ghost.angle)*2.8)),3.8);x+=ghost.vx*dt;y+=ghost.vy*dt;
    if(!this.safe(x,y,this.time+j*dt+.12)){score-=130+(23-j)*8;break;}
    survived++;const index=this.index(x,y);if(!visited.has(index)){visited.add(index);score+=this.tiles[index]===Infinity?5:1;}
    const edge=Math.min(x,y,SIZE-x,SIZE-y);score+=Math.min(edge,2)*.8;
    for(const rival of this.cars){if(!rival.alive||rival===car)continue;const rx=rival.x+Math.cos(rival.angle)*rival.speed*j*dt*.45,ry=rival.y+Math.sin(rival.angle)*rival.speed*j*dt*.45;if(Math.hypot(rx-x,ry-y)<.8)score-=5;}
   }
   // Prefer reachable fresh neighbors; a line into a tiny island is a trap.
   if(survived>12){for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]])if(this.safe(x+dx,y+dy,this.time+2.4))score+=5;}
   score-=Math.abs(offset)*1.6;score+=offset*car.bias*.2;
   if(score>best){best=score;target=wanted;pace=survived<10?2.4:4.1;}
  }
  car.target=target;car.pace=pace;car.think=.1+this.random()*.06;
 }
 step(dt,input={}){
  this.events=[];if(this.result)return;this.time+=dt;while(this.pendingTiles.length&&this.pendingTiles[0].expires<=this.time){const tile=this.pendingTiles.shift();this.events.push({type:'crumble',x:tile.x,y:tile.y});}
  for(const car of this.cars){
   if(!car.alive)continue;
   let steer,pace;
   if(car.id===0&&!input.autopilot){steer=(input.right?1:0)-(input.left?1:0);pace=input.brake?1.8:input.boost?5:3.6;}
   else{car.think-=dt;if(car.think<=0)this.plan(car);steer=Math.max(-1,Math.min(1,angleDelta(car.target,car.angle)*2.8));pace=car.pace||3.8;}
   car.steer=steer;drive(car,dt,steer,pace,car.id===0&&!!input.drift);
   // Swept center checks avoid skipping holes, even if a future frame is large.
   const steps=Math.max(1,Math.ceil(Math.hypot(car.vx,car.vy)*dt/.12));
   for(let n=0;n<steps;n++){car.x+=car.vx*dt/steps;car.y+=car.vy*dt/steps;if(!this.safe(car.x,car.y)){car.alive=false;car.fallAt=this.time;this.events.push({type:'fall',id:car.id});break;}this.mark(car.x,car.y);}
   car.trail.push({x:car.x,y:car.y});if(car.trail.length>12)car.trail.shift();
  }
  this.collide();const alive=this.cars.filter(c=>c.alive);
  if(alive.length<=1){this.result={winner:alive[0]?.id??null,time:this.time};this.events.push({type:'finish',winner:this.result.winner});}
 }
}
