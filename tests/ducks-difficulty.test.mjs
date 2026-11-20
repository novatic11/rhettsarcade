import test from 'node:test';
import assert from 'node:assert/strict';
import {Pond,DUCKS,DOGS,CAMPAIGN} from '../public/games/ducks-vs-dogs/model.js';
import {DIFFICULTIES,balanceFor,chooseDifficulty} from '../public/games/ducks-vs-dogs/difficulty.js';
import {freshProfile,encodeProfile,readProfile} from '../public/games/ducks-vs-dogs/profile.js';
const advance=(g,seconds)=>{for(let t=0;t<seconds;t+=.025)g.step(Math.min(.025,seconds-t));};
function yard(difficulty,mode='campaign'){const g=new Pond(0,18,{mode,difficulty});g.lessonSkipped=true;g.startWave();g.schedule=[{at:100,lane:2,type:'mutt'}];return g;}

test('three Campaign difficulties scale dog health and movement, leaving duck health and Endless unchanged',()=>{
 assert.deepEqual(Object.keys(DIFFICULTIES),['easy','normal','hard']);
 for(const difficulty of Object.keys(DIFFICULTIES)){
  const g=yard(difficulty),dog=g.spawn({type:'mutt',lane:2}),health=DIFFICULTIES[difficulty].health;dog.x=7;
  assert.equal(dog.hp,DOGS.mutt.hp*health);assert.equal(dog.maxHp,dog.hp);advance(g,1);assert(Math.abs(dog.x-(7-DOGS.mutt.speed*DIFFICULTIES[difficulty].speed))<1e-8);
  const duck=g.place('shooter',2,2).duck;assert.equal(duck.hp,DUCKS.shooter.hp);
  const endless=yard(difficulty,'endless'),original=endless.spawn({type:'mutt',lane:2});assert.equal(original.hp,DOGS.mutt.hp);assert.equal(endless.crumbReward(25),25);
 }
 assert.equal(new Pond(0,1,{mode:'campaign'}).difficulty,'normal');assert.equal(chooseDifficulty('bad'),'normal');assert.equal(chooseDifficulty('__proto__'),'normal');
});

test('every mandatory lesson stays affordable on all difficulties, without free crumbs from waiting in planning',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES))for(let level=0;level<CAMPAIGN.length;level++){
  const g=new Pond(0,18,{mode:'campaign',level,difficulty}),start=g.crumbs;assert(start<=CAMPAIGN[level].crumbs);assert(start>0);
  for(let n=0;n<20&&g.lesson();n++){const s=g.lesson();for(let wait=0;g.canPlace(s.duck,s.row,s.col)&&wait<100;wait++)g.step(.1);assert(g.place(s.duck,s.row,s.col).duck,difficulty+'/'+level);}
  const left=g.crumbs;advance(g,30);assert.equal(g.crumbs,left);assert(g.startWave());
 }
 assert.deepEqual(['easy','normal','hard'].map(difficulty=>new Pond(0,1,{mode:'campaign',difficulty}).crumbs),[200,180,150]);
});

test('passive crumbs, dog rewards and wave rewards scale once; baker output, refunds and stolen crumbs keep their full value',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES)){
  const g=yard(difficulty),start=g.crumbs,amount=g.crumbReward(25);advance(g,7.1);assert.equal(g.crumbs,start+amount);
  const dog=g.spawn({type:'mutt',lane:2});dog.loot=17;const before=g.crumbs;g.hit(dog,10000);assert.equal(g.crumbs,before+g.crumbReward(10)+17);g.hit(dog,10000);assert.equal(g.crumbs,before+g.crumbReward(10)+17);
  g.schedule=[];g.spawnIndex=0;g.dogs=[];const money=g.crumbs;g.step(.025);assert.equal(g.crumbs,money+g.crumbReward(50));assert.equal(g.events.find(e=>e.type==='clear').amount,g.crumbReward(50));g.step(.025);assert.equal(g.crumbs,money+g.crumbReward(50));
  const baker=new Pond(0,1,{mode:'campaign',level:1,difficulty});baker.lessonSkipped=true;const duck=baker.place('baker',1,0).duck;baker.startWave();baker.schedule=[{at:100,lane:1,type:'mutt'}];const old=baker.crumbs;advance(baker,9.1);assert.equal(baker.crumbs,old+baker.crumbReward(25)+25);const refundable=baker.crumbs;assert(baker.remove(duck.row,duck.col));assert.equal(baker.crumbs,refundable+25);
 }
});

test('difficulty preferences and mid-wave balance survive save/password payloads; old Campaign saves retain original balance',()=>{
 for(const difficulty of Object.keys(DIFFICULTIES)){
  const g=yard(difficulty);g.spawn({type:'helmet',lane:2});advance(g,4);const p=freshProfile();p.difficulty=difficulty;const loaded=readProfile(encodeProfile(p,null,{campaign:g}));assert(!loaded.invalid);assert.equal(loaded.profile.difficulty,difficulty);assert.equal(loaded.runs.campaign.difficulty,difficulty);assert.equal(loaded.runs.campaign.serialize(),g.serialize());advance(g,3);advance(loaded.runs.campaign,3);assert.equal(loaded.runs.campaign.serialize(),g.serialize());
 }
 const original=yard('original'),old=JSON.parse(original.serialize());delete old.difficulty;const migrated=Pond.restore(JSON.stringify(old));assert(migrated);assert.equal(migrated.difficulty,'original');assert.equal(balanceFor(migrated).health,1);assert.equal(migrated.crumbs,original.crumbs);assert.equal(migrated.serialize(),original.serialize());const corrupt=JSON.parse(original.serialize());corrupt.difficulty='impossible';assert.equal(Pond.restore(JSON.stringify(corrupt)),null);
});
