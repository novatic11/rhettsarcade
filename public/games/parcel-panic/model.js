// Parcel Panic 2.0 — packing puzzle logic. Pure, deterministic per seed.
export const SHAPES=[
 {c:[[0,0]],w:6},{c:[[0,0],[1,0]],w:9},{c:[[0,0],[1,0],[2,0]],w:9},{c:[[0,0],[1,0],[2,0],[3,0]],w:7},{c:[[0,0],[1,0],[2,0],[3,0],[4,0]],w:4},
 {c:[[0,0],[1,0],[0,1],[1,1]],w:8},{c:[[0,0],[0,1],[1,1]],w:9},{c:[[0,0],[0,1],[0,2],[1,2]],w:7},{c:[[1,0],[1,1],[1,2],[0,2]],w:7},
 {c:[[0,0],[1,0],[2,0],[1,1]],w:7},{c:[[0,0],[1,0],[1,1],[2,1]],w:6},{c:[[1,0],[2,0],[0,1],[1,1]],w:6},{c:[[0,0],[0,1],[0,2],[1,2],[2,2]],w:4},
 {c:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],w:3},{c:[[1,0],[0,1],[1,1],[2,1],[1,2]],w:2},{c:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]],w:2},
 {c:[[0,0],[1,1]],w:2},{c:[[0,0],[1,1],[2,2]],w:1}
];
export const TOOLS={hammer:{name:'Box cutter',key:'H',desc:'Remove a single box from the van.'},swap:{name:'New order',key:'N',desc:'Swap all three parcels for a fresh order.'},bomb:{name:'Forklift',key:'B',desc:'Clear a 3×3 area.'}};
export function rng(seed){let s=(seed>>>0)||1;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function cells(p){let out=SHAPES[p.kind].c.map(a=>[...a]);for(let i=0;i<(p.turn||0);i++)out=out.map(([x,y])=>[-y,x]);const mx=Math.min(...out.map(a=>a[0])),my=Math.min(...out.map(a=>a[1]));return out.map(([x,y])=>[x-mx,y-my]);}
export const CAMPAIGN=60;
// Cell values: 0 empty; 1..6 parcel colors; board side layers: tape (needs an extra clear), star (priority), pillar (never moves), stamp (gives a tool).
export function route(n){
 const r=rng(n*2654435761),ri=(a,b)=>a+Math.floor(r()*(b-a+1)),k=Math.min(1,(n-1)/(CAMPAIGN-1));
 const size=n<6?7:n>=14&&n%7===0?9:8,goals=[];const def={n,size,pillars:[],stars:[],tape:[],stamps:[],filled:[],pieces:0,goals};
 const taken=new Set(),free=()=>{for(let t=0;t<99;t++){const x=ri(0,size-1),y=ri(0,size-1);if(!taken.has(x+','+y)){taken.add(x+','+y);return {x,y};}}return null;};
 // symmetric pillars from level 8
 if(n>=8&&n%3!==1){const count=ri(1,2+Math.floor(k*3));for(let i=0;i<count;i++){const p=free();if(!p)continue;def.pillars.push(p);const m={x:size-1-p.x,y:size-1-p.y};if(!taken.has(m.x+','+m.y)){taken.add(m.x+','+m.y);def.pillars.push(m);}}}
 const kinds=['score','lines','stars','tape'],first=n<=3?'score':n<=6?'lines':n<=10?'stars':kinds[(n*7)%4];
 const second=n>=20&&n%2===0?kinds.filter(x=>x!==first)[(n*3)%3]:null;
 for(const kind of [first,second].filter(Boolean)){
  if(kind==='score')goals.push({kind,need:400+Math.round(k*2600)+ri(0,4)*50});
  if(kind==='lines')goals.push({kind,need:4+Math.round(k*12)+ri(0,2)});
  if(kind==='stars'){const c=2+Math.round(k*5)+ri(0,1);for(let i=0;i<c;i++){const p=free();if(p)def.stars.push(p);}goals.push({kind,need:def.stars.length});}
  if(kind==='tape'){const c=3+Math.round(k*7);for(let i=0;i<c;i++){const p=free();if(p)def.tape.push(p);}goals.push({kind,need:def.tape.length});}
 }
 for(let i=0;i<(n>=4?ri(1,2):0);i++){const p=free();if(p)def.stamps.push(p);}
 // pre-packed clutter makes later vans start messy
 const clutter=n>12?ri(2,4+Math.floor(k*8)):0;for(let i=0;i<clutter;i++){const p=free();if(p)def.filled.push({...p,color:ri(1,6)});}
 const need=goals.reduce((a,g)=>a+(g.kind==='score'?g.need/45:g.kind==='lines'?g.need*2.2:g.kind==='tape'?g.need*5:g.need*2.6),0)*(size/8)**2;
 def.pieces=Math.max(12,Math.round(need*(1.55-k*.25))+6);
 return def;
}

export class Packing{
 constructor(opts={}){
  this.mode=opts.mode||'classic';this.def=opts.route||null;this.size=this.def?.size||8;this.seed=(opts.seed??Math.floor(Math.random()*2**32))>>>0;
  const n=this.size*this.size;this.board=new Array(n).fill(0);this.tape=new Array(n).fill(0);this.star=new Array(n).fill(false);this.pillar=new Array(n).fill(false);this.stamp=new Array(n).fill(false);
  if(this.def){for(const p of this.def.pillars)this.pillar[this.i(p.x,p.y)]=true;for(const p of this.def.stars){this.star[this.i(p.x,p.y)]=true;this.board[this.i(p.x,p.y)]=7;}for(const p of this.def.tape){this.tape[this.i(p.x,p.y)]=2;this.board[this.i(p.x,p.y)]=8;}for(const p of this.def.stamps)this.stamp[this.i(p.x,p.y)]=true;for(const p of this.def.filled)this.board[this.i(p.x,p.y)]=p.color;}
  this.dealt=0;this.score=0;this.lines=0;this.delivered=0;this.taped=0;this.combo=0;this.bestCombo=0;this.placed=0;this.status='playing';this.events=[];this.tools={hammer:opts.tools?.hammer??1,swap:opts.tools?.swap??1,bomb:opts.tools?.bomb??0};this.undo=null;
  this.limit=this.def?this.def.pieces:opts.limit||Infinity;this.tray=[];this.deal();
 }
 i(x,y){return y*this.size+x;}
 piece(r){let total=0;const allowed=SHAPES.map((s,i)=>i).filter(i=>this.size>=8||i!==15);const heavy=this.mode==='classic'?1+this.placed/45:1,wt=i=>SHAPES[i].w*(SHAPES[i].c.length>=5?heavy:1);for(const i of allowed)total+=wt(i);let v=r()*total;for(const i of allowed){v-=wt(i);if(v<=0)return {kind:i,turn:Math.floor(r()*4),color:1+Math.floor(r()*6)};}return {kind:0,turn:0,color:1};}
 deal(){this.dealt++;const r=rng(this.seed+this.dealt*7309);const left=this.limit-this.placed;this.tray=[0,1,2].map(i=>i<left?this.piece(r):null);
  // one mercy re-roll in classic if nothing fits
  if(!this.hasMove()&&this.mode!=='route'&&this.placed<40){const r2=rng(this.seed+this.dealt*104729);this.tray=this.tray.map(p=>p&&this.piece(r2));}
  this.events.push({kind:'deal'});}
 fits(p,x,y){if(!p)return false;for(const [a,b] of cells(p)){const cx=x+a,cy=y+b;if(cx<0||cy<0||cx>=this.size||cy>=this.size)return false;const j=this.i(cx,cy);if(this.board[j]||this.pillar[j])return false;}return true;}
 canFitAnywhere(p){if(!p)return false;for(let t=0;t<4;t++){const q={...p,turn:t};for(let y=0;y<this.size;y++)for(let x=0;x<this.size;x++)if(this.fits(q,x,y))return true;}return false;}
 hasMove(){return this.tray.some(p=>this.canFitAnywhere(p));}
 rotate(slot,dir=1){const p=this.tray[slot];if(p){p.turn=(p.turn+dir+4)%4;this.events.push({kind:'rotate'});}}
 lineInfo(){const full=[];const s=this.size,filled=j=>this.board[j]>0||this.pillar[j];
  for(let y=0;y<s;y++){let ok=true,any=false;for(let x=0;x<s;x++){const j=this.i(x,y);if(!filled(j)){ok=false;break;}if(!this.pillar[j])any=true;}if(ok&&any)full.push({row:y});}
  for(let x=0;x<s;x++){let ok=true,any=false;for(let y=0;y<s;y++){const j=this.i(x,y);if(!filled(j)){ok=false;break;}if(!this.pillar[j])any=true;}if(ok&&any)full.push({col:x});}return full;}
 previewClears(p,x,y){if(!this.fits(p,x,y))return [];const saved=this.board.slice();for(const [a,b] of cells(p))this.board[this.i(x+a,y+b)]=p.color;const lines=this.lineInfo();this.board=saved;return lines;}
 snapshot(){return {board:this.board.slice(),tape:this.tape.slice(),star:this.star.slice(),stamp:this.stamp.slice(),tray:this.tray.map(p=>p&&{...p}),score:this.score,lines:this.lines,delivered:this.delivered,taped:this.taped,combo:this.combo,placed:this.placed,dealt:this.dealt,tools:{...this.tools}};}
 place(slot,x,y){
  const p=this.tray[slot];if(this.status!=='playing'||!this.fits(p,x,y))return false;
  this.undo=this.snapshot();
  const cs=cells(p);for(const [a,b] of cs)this.board[this.i(x+a,y+b)]=p.color;this.tray[slot]=null;this.placed++;this.score+=cs.length;
  this.events.push({kind:'place',cells:cs.map(([a,b])=>[x+a,y+b]),color:p.color});
  this.resolve(cs.map(([a,b])=>[x+a,y+b]));
  if(!this.tray.some(Boolean)&&this.placed<this.limit)this.deal();
  this.check();return true;
 }
 resolve(origin){
  const lines=this.lineInfo();if(!lines.length){this.combo=0;return;}
  this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);const clear=new Set();
  for(const l of lines)for(let t=0;t<this.size;t++){const j=l.row!=null?this.i(t,l.row):this.i(l.col,t);if(!this.pillar[j])clear.add(j);}
  let stamps=0;const removed=[];
  for(const j of clear){if(this.stamp[j]){this.stamp[j]=false;stamps++;}
   if(this.board[j]===8){this.tape[j]--;if(this.tape[j]<=0){this.tape[j]=0;this.board[j]=0;this.taped++;removed.push([j,8]);}else removed.push([j,9]);continue;}
   if(this.star[j]){this.star[j]=false;this.delivered++;}removed.push([j,this.board[j]]);this.board[j]=0;}
  this.lines+=lines.length;const gain=Math.round((clear.size*10)*lines.length*(1+.5*(this.combo-1)));this.score+=gain;
  this.events.push({kind:'clear',lines,cells:removed.map(([j,c])=>[j%this.size,Math.floor(j/this.size),c]),gain,combo:this.combo});
  for(let s=0;s<stamps;s++)this.award();
  if(this.combo>0&&this.combo%(this.mode==='classic'?5:3)===0)this.award();
  if(lines.length>=3)this.award();
 }
 award(){const r=rng(this.seed+this.placed*977+this.lines*13)(),k=r<.45?'hammer':r<.8?'swap':'bomb';this.tools[k]=Math.min(9,this.tools[k]+1);this.events.push({kind:'tool',tool:k});}
 useHammer(x,y){if(this.tools.hammer<=0||this.status!=='playing')return false;const j=this.i(x,y);if(!this.board[j]||this.pillar[j])return false;this.undo=null;this.tools.hammer--;if(this.board[j]===8){this.tape[j]--;if(this.tape[j]<=0){this.board[j]=0;this.tape[j]=0;this.taped++;}}else{if(this.star[j])return (this.tools.hammer++,false);this.board[j]=0;}this.events.push({kind:'hammer',x,y});this.check();return true;}
 useBomb(x,y){if(this.tools.bomb<=0||this.status!=='playing')return false;this.undo=null;this.tools.bomb--;const cs=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const cx=x+dx,cy=y+dy;if(cx<0||cy<0||cx>=this.size||cy>=this.size)continue;const j=this.i(cx,cy);if(this.pillar[j]||this.star[j]||!this.board[j])continue;if(this.board[j]===8){this.tape[j]=0;this.taped++;}cs.push([cx,cy,this.board[j]]);this.board[j]=0;}this.events.push({kind:'bomb',x,y,cells:cs});this.check();return true;}
 useSwap(){if(this.tools.swap<=0||this.status!=='playing')return false;this.undo=null;this.tools.swap--;const r=rng(this.seed+this.dealt*31337+this.placed);this.tray=this.tray.map(p=>p?this.piece(r):null);this.events.push({kind:'swap'});this.check();return true;}
 restoreUndo(){if(!this.undo||this.status!=='playing')return false;const u=this.undo;this.board=u.board;this.tape=u.tape;this.star=u.star;this.stamp=u.stamp;this.tray=u.tray;Object.assign(this,{score:u.score,lines:u.lines,delivered:u.delivered,taped:u.taped,combo:u.combo,placed:u.placed,dealt:u.dealt,tools:u.tools});this.undo=null;this.events.push({kind:'undo'});return true;}
 progress(g){return g.kind==='score'?this.score:g.kind==='lines'?this.lines:g.kind==='stars'?this.delivered:this.taped;}
 goalsMet(){return !!this.def&&this.def.goals.every(g=>this.progress(g)>=g.need);}
 check(){
  if(this.def&&this.goalsMet()){this.status='won';this.events.push({kind:'won'});return;}
  if(this.placed>=this.limit&&!this.tray.some(Boolean)){this.status='lost';this.reason='Out of parcels.';this.events.push({kind:'lost'});return;}
  if(!this.hasMove()&&!(this.tools.hammer>0||this.tools.bomb>0||this.tools.swap>0)){this.status='lost';this.reason='No room for any parcel.';this.events.push({kind:'lost'});}
 }
 stuck(){return this.status==='playing'&&!this.hasMove();}
 get starsEarned(){if(!this.def)return 0;const left=this.limit-this.placed,f=left/this.limit;return f>=.25?3:f>=.1?2:1;}
 serialize(){return {mode:this.mode,seed:this.seed,size:this.size,limit:Number.isFinite(this.limit)?this.limit:null,...this.snapshot(),pillar:this.pillar.slice(),bestCombo:this.bestCombo};}
 static load(s){const g=new Packing({mode:s.mode||'classic',seed:s.seed,limit:s.limit??undefined});if(!Array.isArray(s.board)||s.board.length!==g.size*g.size)throw new Error('bad');
  const ok=a=>Array.isArray(a)&&a.length===g.board.length;g.board=s.board.map(v=>Number.isInteger(v)&&v>=0&&v<=8?v:0);if(ok(s.tape))g.tape=s.tape.map(v=>Math.max(0,Math.min(2,v|0)));if(ok(s.star))g.star=s.star.map(Boolean);if(ok(s.stamp))g.stamp=s.stamp.map(Boolean);if(ok(s.pillar))g.pillar=s.pillar.map(Boolean);
  if(Array.isArray(s.tray)&&s.tray.length===3)g.tray=s.tray.map(p=>p&&SHAPES[p.kind]?{kind:p.kind,turn:(p.turn|0)%4,color:Math.max(1,Math.min(6,p.color|0))}:null);
  for(const k of ['score','lines','delivered','taped','combo','placed','dealt','bestCombo'])if(Number.isFinite(s[k]))g[k]=s[k];if(s.tools)for(const k in g.tools)if(Number.isFinite(s.tools[k]))g.tools[k]=s.tools[k];g.events=[];if(!g.tray.some(Boolean))g.deal();g.check();return g;}
}
