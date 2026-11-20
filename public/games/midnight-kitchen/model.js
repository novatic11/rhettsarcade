export const FOOD={bread:'Bread',cheese:'Cheese',tomato:'Tomato',lettuce:'Lettuce',choppedTomato:'Chopped tomato',choppedLettuce:'Chopped lettuce',toast:'Grilled cheese',soup:'Tomato soup',salad:'Garden bowl',burnt:'Burnt toast'};
export const RECIPES={toast:'Bread + cheese → griddle',soup:'Tomato → chop → pot',salad:'Chop tomato + lettuce → plate'};
export const STATIONS=[
 {id:'board',name:'Chopping board',x:210,y:170,px:210,py:240,w:112,h:64},
 {id:'griddle',name:'Griddle',x:420,y:170,px:420,py:240,w:112,h:64},
 {id:'pot',name:'Soup pot',x:620,y:170,px:620,py:240,w:112,h:64},
 {id:'plate',name:'Plating counter',x:810,y:170,px:810,py:240,w:112,h:64},
 ...['bread','cheese','tomato','lettuce'].map((id,i)=>({id,name:FOOD[id],x:220+i*180,y:452,px:220+i*180,py:380,w:110,h:58})),
 {id:'serve',name:'Order window',x:900,y:325,px:817,py:325,w:80,h:110},
 {id:'trash',name:'Compost bin',x:88,y:320,px:165,py:320,w:80,h:72}
];
export class Kitchen{
 constructor(){this.x=500;this.y=320;this.vx=0;this.vy=0;this.time=0;this.remaining=120;this.money=0;this.served=0;this.missed=0;this.inventory=[];this.orders=[{id:0,recipe:'toast',left:80,max:80}];this.serial=1;this.nextOrder=18;this.jobs={};this.status='playing';this.events=[];this.target=null;this.message='Click the bread crate to walk over and take bread. Then take cheese and use the griddle.';this.messageTime=8;}
 say(s){this.message=s;this.messageTime=4;}
 get nearest(){return STATIONS.map(s=>({...s,d:Math.hypot(this.x-s.x,this.y-s.y)})).filter(s=>s.d<96).sort((a,b)=>a.d-b.d)[0];}
 consume(items){const copy=[...this.inventory];for(const id of items){const i=copy.indexOf(id);if(i<0)return false;copy.splice(i,1);}this.inventory=copy;return true;}
 collect(item){if(this.inventory.length>=2){this.say('Your hands are full. Use an ingredient, serve a dish, or discard one item at the bin.');return false;}this.inventory.push(item);this.events.push('pickup');return true;}
 use(id=this.nearest?.id){if(this.status!=='playing')return false;const station=STATIONS.find(s=>s.id===id);if(!station||Math.hypot(this.x-station.x,this.y-station.y)>=96){this.say('Get close to a station, then press E. Clicking it walks you there.');return false;}
  if(['bread','cheese','tomato','lettuce'].includes(id)){if(this.collect(id))this.say(FOOD[id]+' picked up. '+(id==='bread'?'Add cheese, then use the griddle.':id==='tomato'||id==='lettuce'?'Take it to the chopping board.':'Take bread and cheese to the griddle.'));return true;}
  if(id==='trash'){if(this.inventory.length){this.say(FOOD[this.inventory.pop()]+' discarded.');this.events.push('chop');}else this.say('Nothing in your hands to discard.');return true;}
  if(id==='serve'){const i=this.inventory.findIndex(item=>this.orders.some(o=>o.recipe===item));if(i<0){this.say('Bring a finished dish shown on an order ticket.');return false;}const item=this.inventory[i],order=this.orders.find(o=>o.recipe===item);this.orders=this.orders.filter(o=>o!==order);this.inventory.splice(i,1);const pay=50+Math.round(30*order.left/order.max);this.money+=pay;this.served++;if(!this.orders.length)this.nextOrder=Math.min(this.nextOrder,this.time+1.5);this.events.push('deliver');this.say(FOOD[item]+' served · '+pay+' earned!');return true;}
  const current=this.jobs[id];if(current?.ready){if(this.collect(current.product)){delete this.jobs[id];this.say(FOOD[current.product]+' ready to serve or use.');return true;}return false;}if(current){this.say(station.name+' is working · '+Math.ceil(current.left)+' seconds left.');return false;}
  if(id==='board'){const raw=this.inventory.find(i=>['tomato','lettuce'].includes(i));if(!raw){this.say('The board needs a tomato or lettuce.');return false;}this.consume([raw]);this.jobs.board={product:raw==='tomato'?'choppedTomato':'choppedLettuce',left:1.8,total:1.8,ready:false,age:0};this.events.push('chop');this.say('Chopping. Click the board again when it is ready.');return true;}
  if(id==='griddle'){if(!this.consume(['bread','cheese'])){this.say('The griddle needs bread and cheese together.');return false;}this.jobs.griddle={product:'toast',left:3,total:3,ready:false,age:0};this.events.push('cook');this.say('Grilled cheese is cooking. Collect it before it burns.');return true;}
  if(id==='pot'){if(!this.consume(['choppedTomato'])){this.say('Chop a tomato first, then bring it to the pot.');return false;}this.jobs.pot={product:'soup',left:3.4,total:3.4,ready:false,age:0};this.events.push('cook');this.say('Soup is simmering. You can work on another order.');return true;}
  if(id==='plate'){if(!this.consume(['choppedTomato','choppedLettuce'])){this.say('A garden bowl needs chopped tomato and chopped lettuce.');return false;}this.collect('salad');this.say('Garden bowl plated. Take it to the order window.');return true;}
 }
 walkTo(id){const s=STATIONS.find(s=>s.id===id);if(!s)return false;this.target=s;return true;}
 hint(){const ready=Object.entries(this.jobs).find(([,j])=>j.ready);if(ready)return 'Ready to collect: '+STATIONS.find(s=>s.id===ready[0]).name+'. Click it or approach and press E.';if(this.inventory.some(i=>this.orders.some(o=>o.recipe===i)))return 'Finished dish in hand. Bring it to the order window on the right.';return 'Click stations to walk there and work. Each order ticket shows its recipe. Your hands hold two items.';}
 update(dt,keys={}){if(this.status!=='playing')return;dt=Math.min(.05,Math.max(0,dt));this.time+=dt;this.remaining=Math.max(0,120-this.time);this.messageTime-=dt;if(this.messageTime<=0)this.message='';
  for(const [id,j]of Object.entries(this.jobs)){if(!j.ready){j.left=Math.max(0,j.left-dt);if(!j.left){j.ready=true;this.events.push('ready');}}else{j.age+=dt;if(id==='griddle'&&j.age>12&&j.product!=='burnt'){j.product='burnt';this.events.push('hit');this.say('A sandwich burned! Collect it and discard it at the bin.');}}}
  for(const o of this.orders)o.left-=dt;const expired=this.orders.filter(o=>o.left<=0);if(expired.length){this.missed+=expired.length;this.orders=this.orders.filter(o=>o.left>0);this.say('A customer left. Keep going—the next order is a fresh chance.');}
  if(this.time>=this.nextOrder){if(this.orders.length<3){const recipe=['toast','soup','salad','toast','soup','salad','toast'][this.serial%7];this.orders.push({id:this.serial++,recipe,left:72,max:72});this.events.push('door');}this.nextOrder=this.time+16;}
  let dx=(keys.right?1:0)-(keys.left?1:0),dy=(keys.down?1:0)-(keys.up?1:0);if(dx||dy)this.target=null;
  if(this.target){const d=Math.hypot(this.target.px-this.x,this.target.py-this.y);if(d<5){const id=this.target.id;this.target=null;this.vx=this.vy=0;this.use(id);}else{dx=(this.target.px-this.x)/d;dy=(this.target.py-this.y)/d;}}
  const len=Math.hypot(dx,dy);if(len){dx/=len;dy/=len;}const a=1-Math.exp(-18*dt);this.vx+=(dx*210-this.vx)*a;this.vy+=(dy*210-this.vy)*a;this.x=Math.max(145,Math.min(845,this.x+this.vx*dt));this.y=Math.max(228,Math.min(398,this.y+this.vy*dt));
  for(const s of STATIONS){const left=s.x-s.w/2-15,right=s.x+s.w/2+15,top=s.y-s.h/2-15,bottom=s.y+s.h/2+15;if(this.x>left&&this.x<right&&this.y>top&&this.y<bottom){const choices=[[this.x-left,'x',left],[right-this.x,'x',right],[this.y-top,'y',top],[bottom-this.y,'y',bottom]].sort((a,b)=>a[0]-b[0]);this[choices[0][1]]=choices[0][2];}}
  if(this.remaining===0){this.status='finished';this.target=null;}
 }
}
