import test from 'node:test';
import assert from 'node:assert/strict';
import {LandingTrial,LANDING_ROUNDS} from '../public/games/rustbound-2/landing-trial.js';
import {passTrial} from './rb2-landing-helpers.mjs';
test('each approach draws three distinct checks from all ten with varied order',()=>{
 assert.equal(LANDING_ROUNDS.length,10);const seen=new Set(),orders=new Set();
 for(let seed=0;seed<120;seed++){const t=new LandingTrial(seed+.17);assert.equal(t.order.length,3);assert.equal(new Set(t.order).size,3);t.order.forEach(id=>{assert(LANDING_ROUNDS.some(r=>r.id===id));seen.add(id);});orders.add(t.order.join(','));assert.deepEqual(new LandingTrial(seed+.17).order,t.order);}
 assert.equal(seen.size,10);assert(orders.size>90);
});
test('every challenge can achieve a high score through its actual controls and survives full landing rounds',()=>{
 const seen=new Set();for(let seed=0;seed<90;seed++){const t=new LandingTrial(seed+.31);t.order.forEach(id=>seen.add(id));passTrial(t);assert(t.score>.9,t.order+' scored '+t.score);assert.equal(t.scores.length,3);const scores=[...t.scores];t.step(.1);t.action();t.direction(0);t.start();assert.deepEqual(t.scores,scores);}
 assert.equal(seen.size,10);
});
function first(kind){for(let seed=0;seed<200;seed++){const t=new LandingTrial(seed);if(t.kind===kind){t.start();return t;}}throw Error('Missing '+kind);}
test('checks wait for Start and cannot be restarted or scored twice',()=>{const t=first('timing');t.step(.1);const before=t.elapsed;t.start();assert.equal(t.elapsed,before);t.action();const count=t.attempts.length;t.action();assert.equal(t.attempts.length,count);const ready=new LandingTrial(0);ready.step(.1);ready.move(.5,.5);assert.equal(ready.elapsed,0);assert.equal(ready.action(),null);});
test('memory hides behind a preview, accepts only four deliberate commands, and counts wrong answers',()=>{const t=first('sequence');t.direction(t.sequence[0]);assert.equal(t.attempts.length,0);for(let i=0;i<23;i++)t.step(.1);for(const n of t.sequence)t.direction((n+1)%4);assert.equal(t.round,1);assert.equal(t.scores[0],0);});
test('missed flare signals timeout and premature actions do not earn points',()=>{const t=first('reaction');for(let i=0;i<110&&t.started;i++)t.step(.1);assert.equal(t.round,1);assert.equal(t.scores[0],0);const early=first('reaction');for(let i=0;i<3;i++){early.action();for(let n=0;n<3;n++)early.step(.1);}assert.equal(early.scores[0],0);});
test('debris hits reduce quality while accurately acquired beacons are required',()=>{const t=first('dodge');for(let i=0;i<82&&t.started;i++)t.step(.1);assert(t.hits>0);assert(t.scores[0]<1);const p=first('capture');for(let i=0;i<4;i++){p.move(.04,.08);p.action();for(let n=0;n<3;n++)p.step(.1);}assert.equal(p.scores[0],0);});
