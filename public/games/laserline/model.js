export const COLS=11,ROWS=7,CELL=60,OX=150,OY=70;
const routes=[
 [[0,3],[4,3],[4,0]],
 [[0,5],[3,5],[3,2],[8,2],[8,6]],
 [[0,1],[4,1],[4,5],[1,5],[1,3],[8,3],[8,0]],
 [[10,1],[7,1],[7,5],[3,5],[3,2],[0,2]],
 [[0,6],[2,6],[2,1],[8,1],[8,5],[5,5],[5,3],[10,3]],
 [[0,2],[4,2],[4,6],[9,6],[9,1],[6,1],[6,4],[1,4],[1,0]]
];
const key=(x,y)=>x+','+y;
export const reflect=(dx,dy,slash)=>slash==='/'?[-dy,-dx]:[dy,dx];
export const LEVELS=routes.map((points,index)=>{
 const path=new Set(),mirrors=[],receivers=[];for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],dx=Math.sign(bx-ax),dy=Math.sign(by-ay),length=Math.abs(bx-ax)+Math.abs(by-ay);for(let n=0;n<=length;n++)path.add(key(ax+dx*n,ay+dy*n));if(length>2&&receivers.length<4){const receiver={x:ax+dx*Math.floor(length/2),y:ay+dy*Math.floor(length/2)};if(!receivers.some(p=>p.x===receiver.x&&p.y===receiver.y))receivers.push(receiver);}if(i<points.length-1){const [cx,cy]=points[i+1],out=[Math.sign(cx-bx),Math.sign(cy-by)];const slash=reflect(dx,dy,'/').every((v,n)=>v===out[n])?'/':'\\';mirrors.push({x:bx,y:by,solution:slash,slash:(i+index)%3===0?slash:slash==='/'?'\\':'/'});}}
 const walls=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(!path.has(key(x,y))&&(x*7+y*11+index*3)%9===0)walls.push({x,y});const [sx,sy]=points[0],next=points[1];return {name:['First light','Switchback','The folded room','After hours','Crossed signals','The long way home'][index],start:{x:sx,y:sy,dx:Math.sign(next[0]-sx),dy:Math.sign(next[1]-sy)},goal:{x:points.at(-1)[0],y:points.at(-1)[1]},mirrors,receivers,walls};
});
export function trace(board,mirrors){let {x,y,dx,dy}=board.start;const points=[{x,y}],seen=new Set(),lit=new Set();let goal=false,loop=false;for(let step=0;step<400;step++){const stamp=[x,y,dx,dy].join(',');if(seen.has(stamp)){loop=true;break;}seen.add(stamp);const receiver=board.receivers.findIndex(p=>p.x===x&&p.y===y);if(receiver>=0)lit.add(receiver);if(x===board.goal.x&&y===board.goal.y){goal=true;break;}if(board.walls.some(p=>p.x===x&&p.y===y))break;const mirror=mirrors.find(p=>p.x===x&&p.y===y);if(mirror)[dx,dy]=reflect(dx,dy,mirror.slash);x+=dx;y+=dy;points.push({x,y});if(x<0||x>=COLS||y<0||y>=ROWS)break;}return {points,lit,goal,loop,solved:goal&&lit.size===board.receivers.length};}
export class LightRoom{
 constructor(level=1){this.level=Math.max(1,Math.min(LEVELS.length,Math.floor(level)||1));this.board=LEVELS[this.level-1];this.mirrors=this.board.mirrors.map(m=>({...m}));this.selected=0;this.moves=0;this.time=0;this.history=[];this.events=[];this.status='playing';this.message='Click a mirror to turn it. Light every receiver, then reach the exit.';this.beam=trace(this.board,this.mirrors);this.score=0;}
 rotate(index=this.selected){if(this.status!=='playing'||!this.mirrors[index])return false;this.selected=index;this.history.push(index);this.mirrors[index].slash=this.mirrors[index].slash==='/'?'\\':'/';this.moves++;this.events.push('turn');this.refresh();return true;}
 refresh(){this.beam=trace(this.board,this.mirrors);if(this.beam.solved){this.status='won';this.score=Math.max(100,1000-this.moves*35);this.events.push('win');this.message='Circuit complete. Every receiver is glowing.';}else this.message=this.beam.loop?'The beam is looping. Try changing its route.':this.beam.goal?'The exit is lit, but some receivers are still dark.':'Light every receiver and carry the beam to the exit.';}
 undo(){if(!this.history.length)return false;const i=this.history.pop();this.mirrors[i].slash=this.mirrors[i].slash==='/'?'\\':'/';this.selected=i;this.moves=Math.max(0,this.moves-1);this.status='playing';this.refresh();return true;}
 select(delta){this.selected=(this.selected+delta+this.mirrors.length)%this.mirrors.length;}
 pointer(x,y){const col=Math.floor((x-OX)/CELL),row=Math.floor((y-OY)/CELL),i=this.mirrors.findIndex(m=>m.x===col&&m.y===row);return i>=0&&this.rotate(i);}
 act(){return this.rotate();}
 step(dt){if(this.status==='playing')this.time+=dt;}
 checkpoint(){return {v:1,level:this.level,slashes:this.mirrors.map(m=>m.slash),moves:this.moves,time:this.time,selected:this.selected,history:this.history.slice(-250)};}
 static restore(raw){if(!raw||raw.v!==1||!Number.isInteger(raw.level)||raw.level<1||raw.level>LEVELS.length||!Array.isArray(raw.slashes)||!Number.isFinite(raw.moves)||!Number.isFinite(raw.time))return null;const g=new LightRoom(raw.level);if(raw.slashes.length!==g.mirrors.length||raw.slashes.some(s=>s!=='/'&&s!=='\\'))return null;g.mirrors.forEach((m,i)=>m.slash=raw.slashes[i]);g.moves=Math.max(0,raw.moves);g.time=Math.max(0,raw.time);g.selected=Math.max(0,Math.min(g.mirrors.length-1,Math.floor(raw.selected)||0));if(Array.isArray(raw.history)&&raw.history.length<=250&&raw.history.every(i=>Number.isInteger(i)&&i>=0&&i<g.mirrors.length))g.history=[...raw.history];g.refresh();return g.status==='playing'?g:null;}
}
