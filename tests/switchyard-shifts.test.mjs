import test from 'node:test';
import assert from 'node:assert/strict';
import {Switchyard,EDGES,routeAdvice} from '../public/games/switchyard/model.js';
import {readStats,bestFor,recordScore,recordRun} from '../public/games/switchyard/stats.js';

test('the timetable previews the next three actual arrivals, including express services',()=>{
 const g=new Switchyard(()=>.4,'rush');
 for(let i=0;i<12;i++){
  const preview={...g.queue[0]},train=g.spawn();
  assert.equal(train.target,preview.target);assert.equal(train.express,preview.express);
  assert.equal(train.express,i%3===2);assert.equal(g.queue.length,3);
 }
});
test('Local starts gently, Rush Hour has distinct traffic waves, and Practice slows and spaces arrivals',()=>{
 const local=new Switchyard(()=>.5),rush=new Switchyard(()=>.5,'rush'),practice=new Switchyard(()=>.5,'practice');
 assert.equal(local.spawnDelay(),6.2);assert.equal(practice.spawnDelay(),8);
 assert(practice.spawn().speed<local.spawn().speed);assert(rush.spawn().speed>82);
 rush.time=5;const busy=rush.spawnDelay();rush.time=16;assert(rush.spawnDelay()>busy);
 const express=rush.spawn();assert.equal(express.express,false);assert.equal(rush.spawn().express,true);
 assert.equal(new Switchyard(()=>.5,'invalid').shift,'local');
});
test('express bonuses are paid only for correct deliveries, not mistakes',()=>{
 const g=new Switchyard(()=>.5,'rush');g.spawnIn=10000;
 for(let i=0;i<3;i++){
  const t=g.spawn();t.edge=['A','B','C'][i];t.distance=EDGES[t.edge].length-.1;g.step(.025);
 }
 assert.equal(g.score,375);assert.equal(g.expressDelivered,1);
 const t=g.spawn();Object.assign(t,{edge:'A',distance:EDGES.A.length-.1,express:true,target:3});g.step(.025);
 assert.equal(g.score,375);assert.equal(g.expressDelivered,1);assert.equal(g.lives,2);
});
test('Practice allows mistakes through a full shift and remains unranked',()=>{
 const g=new Switchyard(()=>.5,'practice');g.spawnIn=10000;
 for(let i=0;i<8;i++){const t=g.spawn();Object.assign(t,{edge:'B',target:0,distance:EDGES.B.length-.1});g.step(.025);}
 assert.equal(g.errors,8);assert.equal(g.lives,3);assert.equal(g.result,null);
 g.time=89.99;g.step(.025);assert.equal(g.result.reason,'complete');assert.equal(g.result.medal,null);
});
test('route warnings identify a reachable fix and stop suggesting junctions already passed',()=>{
 const t={edge:'entry',target:3};
 assert.deepEqual(routeAdvice(t,[0,0,0]),{path:['entry','west','A'],station:0,correct:false,fix:0});
 assert.equal(routeAdvice(t,[1,0,0]).fix,2);
 assert.equal(routeAdvice(t,[1,0,1]).correct,true);
 assert.equal(routeAdvice({...t,edge:'west'},[0,0,0]).fix,null);
 assert.equal(routeAdvice({...t,edge:'east'},[1,0,0]).fix,2);
 assert.equal(routeAdvice({...t,edge:'C'},[1,0,1]).fix,null);
 assert.equal(routeAdvice({...t,edge:'D'},[0,0,0]).correct,true);
});
test('legacy records survive; Rush and Practice cannot overwrite a Local best',()=>{
 const stats=readStats({best:4100,runs:3,delivered:50,streak:12});
 assert.equal(bestFor(stats,'local'),4100);assert.equal(bestFor(stats,'rush'),0);
 assert(recordScore(stats,'rush',5000));assert.equal(stats.best,4100);
 assert(!recordScore(stats,'practice',9000));assert.equal(stats.best,4100);assert.equal(stats.rushBest,5000);
 recordRun(stats,{shift:'practice',score:10000,delivered:10,streak:6});
 assert.equal(stats.runs,4);assert.equal(stats.delivered,60);assert.equal(stats.best,4100);
 assert.equal(bestFor(stats,'practice'),null);
 assert.deepEqual(readStats({best:-1,rushBest:Infinity,runs:'99',selectedShift:'oops'}),readStats(null));
});
