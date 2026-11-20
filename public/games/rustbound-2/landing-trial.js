const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const gap=(a,b)=>Math.abs(((a-b+1.5)%1)-.5);
export const LANDING_ROUNDS=[
 {id:'attitude',name:'Attitude lock',kind:'track',hint:'Drag or use WASD / arrows to keep the crosshair in the moving ring for 2 seconds.',seconds:9},
 {id:'burn',name:'Braking burn',kind:'timing',hint:'Press Space or BURN as the needle crosses the blue band. Make three separate burns.',seconds:10},
 {id:'drift',name:'Cancel drift',kind:'track',hint:'Drag or steer with WASD / arrows. Hold the landing pad for 2 seconds against the crosswind.',seconds:10},
 {id:'sequence',name:'Thruster sequence',kind:'sequence',hint:'Remember the four thruster arrows. When they disappear, repeat them with WASD / arrows or the direction buttons.',seconds:11},
 {id:'pads',name:'Landing beacons',kind:'capture',hint:'Click each blue beacon, or steer the crosshair onto it and press Space. Acquire four beacons.',seconds:11},
 {id:'throttle',name:'Descent throttle',kind:'throttle',hint:'Drag the white slider or use A / D or left / right. Stay inside the moving blue range for 2.5 seconds.',seconds:10},
 {id:'radar',name:'Radar rendezvous',kind:'radar',hint:'Press Space or LOCK as the rotating sweep passes the blue radar marker. Acquire three locks.',seconds:11},
 {id:'debris',name:'Debris corridor',kind:'dodge',hint:'Drag or use WASD / arrows to dodge the amber debris for 8 seconds. Each impact lowers your score.',seconds:8},
 {id:'level',name:'Level the horizon',kind:'level',hint:'Use A / D or left / right to level the white horizon against turbulence. Drag horizontally for direct control. Hold level for 2 seconds.',seconds:10},
 {id:'flare',name:'Touchdown flare',kind:'reaction',hint:'Wait for the blue FLARE signal, then press Space or FLARE quickly. Three signals; pressing early wastes one.',seconds:10}
];
function random(seed){let n=(Math.floor(seed*1e6)^0x9e3779b9)>>>0;return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export class LandingTrial{
 constructor(seed=Math.random()*10000){this.seed=Number.isFinite(seed)?seed:0;const rng=random(this.seed),pool=LANDING_ROUNDS.map(r=>r.id);for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.order=pool.slice(0,3);this.sequence=Array.from({length:4},()=>Math.floor(rng()*4));this.beacons=Array.from({length:4},()=>({x:.2+rng()*.6,y:.2+rng()*.55,r:.13}));this.flares=[1+rng()*.6,3.5+rng()*.5,6+rng()*.5];this.round=0;this.elapsed=0;this.x=.28;this.y=.7;this.hold=0;this.scores=[];this.attempts=[];this.started=false;this.done=false;this.feedback='';this.lastAction=-1;this.roll=.65;this.hits=0;this.hitUntil=0;this.wave=0;this.debris=[];}
 get challenge(){return LANDING_ROUNDS.find(r=>r.id===this.order[Math.min(this.round,2)]);}
 get kind(){return this.challenge.kind;}
 get target(){if(this.challenge.id==='attitude')return {x:.5+Math.sin(this.elapsed*.65+this.seed)*.15,y:.5+Math.cos(this.elapsed*.8)*.1,r:.15};if(this.kind==='capture')return this.beacons[Math.min(this.attempts.length,3)];return {x:.5,y:.5,r:.19};}
 get needle(){return this.kind==='throttle'?this.x:.5+Math.sin(this.elapsed*2.3+this.seed)*.45;}
 get band(){return {x:this.kind==='throttle'?.5+Math.sin(this.elapsed*.85+this.seed)*.25:.5+Math.sin(this.seed)*.12,r:this.kind==='throttle'?.14:.12};}
 get radarPhase(){return (this.elapsed*.33+this.seed%1)%1;}
 get radarTarget(){return (.2+this.attempts.length*.31+this.seed%1)%1;}
 get flareActive(){const at=this.flares[this.attempts.length];return at!==undefined&&this.elapsed>=at&&this.elapsed<=at+.85;}
 get quality(){if(this.done)return this.score;if(!this.started)return 0;if(['track','throttle','level'].includes(this.kind))return clamp(this.hold/(this.kind==='throttle'?2.5:2),0,1);if(this.kind==='dodge')return clamp(1-this.hits*.25,0,1);return this.attempts.reduce((a,b)=>a+b,0)/(this.kind==='sequence'||this.kind==='capture'?4:3);}
 start(){if(this.done||this.started)return;this.started=true;this.elapsed=0;this.hold=0;this.x=this.kind==='dodge'?.5:.28;this.y=this.kind==='dodge'?.78:.7;this.attempts=[];this.feedback='';this.lastAction=-1;this.roll=.65;this.hits=0;this.hitUntil=0;this.wave=0;this.debris=[];}
 move(x,y){if(!this.started||this.done)return;if(['track','capture','dodge','throttle'].includes(this.kind)){this.x=clamp(x,.04,.96);this.y=clamp(y,.08,.92);}if(this.kind==='level')this.roll=(clamp(x,0,1)-.5)*2.8;}
 direction(index){if(!this.started||this.done||this.kind!=='sequence'||this.elapsed<2.2||!Number.isInteger(index)||index<0||index>3)return;const good=index===this.sequence[this.attempts.length];this.attempts.push(good?1:0);this.feedback=good?'Thruster confirmed':'Wrong thruster';if(this.attempts.length===4)this.finish(this.quality);}
 action(){if(!this.started||this.done||this.elapsed-this.lastAction<.28)return null;const kind=this.kind;let score=null;if(kind==='timing')score=clamp(1-Math.abs(this.needle-this.band.x)/(this.band.r*2.2),0,1);else if(kind==='radar')score=clamp(1-gap(this.radarPhase,this.radarTarget)/.105,0,1);else if(kind==='capture')score=Math.hypot(this.x-this.target.x,this.y-this.target.y)<=this.target.r?1:0;else if(kind==='reaction')score=this.flareActive?clamp(1-(this.elapsed-this.flares[this.attempts.length])*.7,.4,1):0;else return null;this.lastAction=this.elapsed;this.attempts.push(score);this.feedback=score>.75?'Confirmed':score>.3?'Partial correction':'Missed';if(this.attempts.length===(kind==='capture'?4:3))this.finish(this.quality);return score;}
 burn(){return this.action();}
 step(dt,input={}){if(!this.started||this.done)return;dt=clamp(dt,0,.1);this.elapsed+=dt;const kind=this.kind;
  if(['track','capture','dodge','throttle'].includes(kind)){this.x=clamp(this.x+(input.x||0)*dt*.52,.04,.96);this.y=clamp(this.y+(input.y||0)*dt*.52,.08,.92);}
  if(this.challenge.id==='drift'){this.x=clamp(this.x+Math.sin(this.elapsed*1.7+this.seed)*dt*.12,.04,.96);this.y=clamp(this.y+Math.cos(this.elapsed*1.3)*dt*.1,.08,.92);}
  if(kind==='level')this.roll=clamp(this.roll+(input.x||0)*dt*1.6+Math.sin(this.elapsed*1.8+this.seed)*dt*.3,-1.4,1.4);
  if(['track','throttle','level'].includes(kind)){const on=kind==='level'?Math.abs(this.roll)<.13:kind==='throttle'?Math.abs(this.x-this.band.x)<this.band.r:Math.hypot(this.x-this.target.x,this.y-this.target.y)<this.target.r;this.hold=clamp(this.hold+(on?dt:-dt*.45),0,3);if(this.quality>=1){this.finish(1);return;}}
  if(kind==='reaction'&&this.elapsed>this.flares[this.attempts.length]+.85){this.attempts.push(0);this.feedback='Signal missed';if(this.attempts.length===3){this.finish(this.quality);return;}}
  if(kind==='dodge'){if(this.elapsed>=this.wave*.8+.35){const i=this.wave++;this.debris.push({id:i,x:clamp(this.x+Math.sin(i*2.4+this.seed)*.14,.08,.92),y:-.1,r:.065});}for(const rock of this.debris){rock.y+=dt*.3;if(!rock.hit&&this.elapsed>=this.hitUntil&&Math.hypot((this.x-rock.x)*1.7,this.y-rock.y)<rock.r+.045){rock.hit=true;this.hits++;this.hitUntil=this.elapsed+.7;this.feedback='Debris impact';}}this.debris=this.debris.filter(r=>r.y<1.15);}
  if(this.elapsed>=this.challenge.seconds)this.finish(this.quality);
 }
 finish(score){if(!this.started||this.done)return;this.scores.push(clamp(score,0,1));this.started=false;this.round++;if(this.round>=3){this.done=true;this.success=this.score>=.55;}}
 get score(){return this.scores.reduce((a,v)=>a+v,0)/3;}
}
