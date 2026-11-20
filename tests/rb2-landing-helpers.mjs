import assert from 'node:assert/strict';
export function passTrial(t){
 for(let round=0;round<3;round++){
  t.start();
  for(let i=0;i<1000&&t.started;i++){
   const k=t.kind;
   if(k==='track')t.move(t.target.x,t.target.y);
   if(k==='throttle')t.move(t.band.x,.5);
   if(k==='level')t.move(.5,.5);
   if(k==='capture'){t.move(t.target.x,t.target.y);t.action();}
   if(k==='timing'&&Math.abs(t.needle-t.band.x)<.015)t.action();
   if(k==='radar'){const diff=Math.abs(t.radarPhase-t.radarTarget);if(Math.min(diff,1-diff)<.008)t.action();}
   if(k==='reaction'&&t.flareActive)t.action();
   if(k==='sequence'&&t.elapsed>=2.2)t.direction(t.sequence[t.attempts.length]);
   if(k==='dodge'){const danger=t.debris.filter(d=>d.y>.5&&d.y<1&&!d.hit),safe=[.08,.3,.5,.7,.92].map(x=>({x,space:Math.min(2,...danger.map(d=>Math.abs(x-d.x)))})).sort((a,b)=>b.space-a.space)[0];t.move(safe.x,.8);}
   t.step(.025);
  }
 }
 assert(t.done);assert(t.success);
}
