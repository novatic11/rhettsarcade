import test from 'node:test';import assert from 'node:assert/strict';
import {Pond,DUCKS,DOGS,CAMPAIGN,duckStats} from '../public/games/ducks-vs-dogs/model.js';
import {NEW_DUCKS,NEW_LEVELS} from '../public/games/ducks-vs-dogs/expansion.js';
import {DUCK_KEYS,pageFor,PAGE_SIZE} from '../public/games/ducks-vs-dogs/deck.js';
import {freshProfile,recordResult,encodeProfile,readProfile,campaignAvailable} from '../public/games/ducks-vs-dogs/profile.js';
function yard(){const g=new Pond(0,18,{mode:'endless'});g.crumbs=3000;g.startWave();g.schedule=[{at:199,lane:4,type:'mutt'}];return g;}
function advance(g,seconds){for(let t=0;t<seconds;t+=.025)g.step(Math.min(.025,seconds-t));}
function dog(g,type='mutt',row=2,x=4){const d=g.spawn({type,lane:row});d.x=x;return d;}

test('16 unique recruits add 16 authored levels after the original 14, with matching rewards and four roster pages',()=>{
 assert.equal(Object.keys(NEW_DUCKS).length,16);assert.equal(Object.keys(DUCKS).length,30);assert.equal(CAMPAIGN.length,30);assert.deepEqual(CAMPAIGN.slice(14).map(l=>l.duck),Object.keys(NEW_DUCKS));assert.equal(new Set(Object.values(NEW_LEVELS).map(l=>JSON.stringify(l.waves))).size,16);
 for(const level of CAMPAIGN.slice(14)){assert.equal(level.steps[0].duck,level.duck);assert(level.waves.length>=4);assert(level.waves.flat().every(d=>DOGS[d.type]));assert(level.waves.every(w=>w.every((d,i)=>!i||d.at>=w[i-1].at)));}
 assert.equal(DUCK_KEYS.length,30);assert.equal(new Set(DUCK_KEYS).size,30);assert(!DUCK_KEYS.some(k=>['p','u','r',' '].includes(k)));for(const type of Object.keys(DUCKS))assert(pageFor(Object.keys(DUCKS),type)<4);assert.equal(Math.ceil(30/PAGE_SIZE),4);
 const signatures=Object.values(NEW_DUCKS).map(({name,color,description,...mechanics})=>JSON.stringify(mechanics));assert.equal(new Set(signatures).size,16);
});

test('Pebblebill splashes grouped armored and burrowed dogs in one lane; its landing point never homes',()=>{
 const g=yard(),duck=g.place('pebble',2,1).duck,a=dog(g,'helmet',2,4),b=dog(g,'burrower',2,4.3),aside=dog(g,'mutt',1,4);b.burrow=1.4;b.ability=5;duck.fire=0;g.step(.025);assert(g.shots[0].lob);const saved=Pond.restore(g.serialize());assert(saved);advance(g,.75);advance(saved,.75);assert.equal(g.serialize(),saved.serialize());assert.equal(a.hp,290-48);assert.equal(b.hp,210-48);assert.equal(aside.hp,125);
 const miss=yard(),p=miss.place('pebble',2,1).duck,d=dog(miss);p.fire=0;miss.step(.025);d.x=7;advance(miss,.8);assert.equal(d.hp,d.maxHp);
});

test('Comet Duck splashes exactly three nearby lanes, and both mortar types preserve in-flight state',()=>{
 const g=yard(),duck=g.place('comet',2,1).duck,targets=[0,1,2,3,4].map(row=>dog(g,'helmet',row,4));duck.fire=0;advance(g,.2);const loaded=Pond.restore(g.serialize());assert(loaded);assert.equal(g.serialize(),loaded.serialize());advance(g,.6);advance(loaded,.6);assert.equal(g.serialize(),loaded.serialize());assert.deepEqual(targets.map(d=>d.hp),[290,245,245,245,290]);
});

test('Snowdrift chills three lanes and Pepperbeak burns the first two dogs in a row',()=>{
 const snow=yard();snow.place('snow',2,0);const pack=[0,1,2,3,4].map(row=>dog(snow,'mutt',row,2));advance(snow,1);assert.deepEqual(pack.map(d=>d.hp),[125,117,117,117,125]);assert(pack.slice(1,4).every(d=>d.slow>0));
 const hot=yard();hot.place('pepper',2,0);const dogs=[2,2.4,2.8].map(x=>dog(hot,'helmet',2,x));advance(hot,1);assert(dogs[0].burn>0&&dogs[1].burn>0);assert.equal(dogs[2].hp,290);assert.equal(dogs[0].burnDps,5);
});

test('Dart Duck keeps firing rapidly; Ironwing reduces bites and spits, and retains its armored Veteran health',()=>{
 const rapid=yard();rapid.place('rapid',2,0);const target=dog(rapid,'mastiff',2,2);advance(rapid,2);assert(target.hp<=620-27);
 const armor=yard(),iron=armor.place('warden',2,2).duck,mutt=dog(armor,'mutt',2,3);armor.step(.025);assert.equal(iron.hp,1300-25*.65);assert.equal(mutt.hp,119);armor.upgrade(2,2);assert.equal(duckStats(iron).hp,1950);
 const ranged=yard(),wall=ranged.place('warden',2,1).duck;dog(ranged,'spitter',2,3.5);advance(ranged,.8);assert.equal(wall.hp,1300-20*.65);
});

test('Tempo and Marshal bonuses use the strongest nearby aura, never stack, and affect attacks rather than baking',()=>{
 const g=yard(),shooter=g.place('shooter',2,2).duck;g.place('tempo',1,1);g.cooldowns.tempo=0;g.place('tempo',3,1);g.place('marshal',2,3);shooter.fire=2;advance(g,.5);assert(Math.abs(shooter.fire-1.4)<1e-8);g.upgrade(1,1);shooter.fire=2;advance(g,.5);assert(Math.abs(shooter.fire-1.375)<1e-8);
 const far=g.place('rapid',4,7).duck;far.fire=2;advance(g,.5);assert(Math.abs(far.fire-1.5)<1e-8);
});

test('Orchard Duck pays 50 on its real timer; Veteran baskets and Moss Mender healing survive reload',()=>{
 const g=yard(),orchard=g.place('orchard',2,0).duck,start=g.crumbs;advance(g,14.1);assert.equal(g.crumbs,start+100);assert.equal(duckStats(orchard).produce,14);g.upgrade(2,0);assert.equal(duckStats(orchard).produce,12);const loaded=Pond.restore(g.serialize());assert(loaded);advance(g,13);advance(loaded,13);assert.equal(g.serialize(),loaded.serialize());
 const h=yard(),mender=h.place('mender',2,2).duck,a=h.place('guard',1,1).duck,b=h.place('warden',3,3).duck,far=h.place('shooter',4,7).duck;a.hp=100;b.hp=200;mender.hp=100;far.hp=50;advance(h,4.1);assert.equal(a.hp,109);assert.equal(b.hp,209);assert.equal(mender.hp,109);assert.equal(far.hp,50);
});

test('Anchorbill roots movement, bosses resist it, and Washdogs can release the anchor',()=>{
 for(const type of ['mastiff','boss']){const g=yard(),duck=g.place('anchor',2,0).duck,d=dog(g,type,2,2);duck.fire=0;advance(g,.3);assert(d.root>0);assert(d.root<=(type==='boss'?.28:.8));const x=d.x;g.step(.025);assert.equal(d.x,x);const copy=Pond.restore(g.serialize());assert(copy);advance(g,1);advance(copy,1);assert.equal(g.serialize(),copy.serialize());assert(d.x<x);}
 const g=yard(),d=dog(g,'mutt',2,4),cleaner=dog(g,'cleaner',1,4);d.root=.8;cleaner.ability=0;g.step(.025);assert.equal(d.root,0);
});

test('Lantern Duck exposes only nearby burrowers and Toll Teal pays the highest surviving toll exactly once',()=>{
 const g=yard();g.place('lantern',2,3);const near=dog(g,'burrower',1,5),far=dog(g,'burrower',4,5);for(const d of [near,far]){d.burrow=1.4;d.ability=5;}g.step(.025);assert.equal(near.burrow,0);assert(far.burrow>0);
 const h=yard();h.place('toll',2,0);h.cooldowns.toll=0;h.place('toll',1,0);h.upgrade(1,0);h.schedule=[];const start=h.crumbs;h.step(.025);assert.equal(h.crumbs,start+80);assert.equal(h.events.find(e=>e.type==='clear').amount,80);h.step(.025);assert.equal(h.crumbs,start+80);
});

test('Reed Duelist waits for close range; Lookout shoots behind itself; Volley Mallard sends six shots',()=>{
 const g=yard(),duelist=g.place('fencer',2,2).duck,d=dog(g,'mutt',2,5);duelist.fire=0;g.step(.025);assert.equal(d.hp,125);d.x=3.5;g.step(.025);assert.equal(d.hp,70);
 const h=yard();h.place('lookout',2,4);const behind=dog(h,'mutt',2,2.5);advance(h,1.3);assert.equal(behind.hp,100);assert(h.shots.every(s=>s.x>-.4&&s.x<9.5));
 const v=yard(),volley=v.place('volley',2,1).duck;dog(v,'mastiff',2,7);volley.fire=0;v.step(.025);assert.equal(v.shots.length,6);assert.deepEqual(v.shots.map(s=>s.row),[1,1,2,2,3,3]);
});

test('pre-expansion saves retain fourteen earned ducks and open level 15; new abilities and level 30 round-trip',()=>{
 const p=freshProfile();for(let level=0;level<14;level++)recordResult(p,{mode:'campaign',level,won:true,kills:10,medal:'GOLD'});assert.equal(campaignAvailable(p),14);
 const g=yard();g.place('baker',2,0);const original=JSON.parse(g.serialize());for(const key of Object.keys(NEW_DUCKS))delete original.cooldowns[key];const loaded=Pond.restore(JSON.stringify(original));assert(loaded);assert(Object.keys(NEW_DUCKS).every(k=>loaded.cooldowns[k]===0));const old=readProfile(encodeProfile(p,null,{endless:loaded}));assert(!old.invalid);assert.equal(Object.keys(old.profile.campaignMedals).length,14);assert.equal(campaignAvailable(old.profile),14);
 for(let level=14;level<29;level++)recordResult(p,{mode:'campaign',level,won:true,kills:10,medal:'SILVER'});const final=new Pond(0,18,{mode:'campaign',level:29,difficulty:'hard'});const round=readProfile(encodeProfile(p,null,{campaign:final}));assert(!round.invalid);assert.equal(round.runs.campaign.level,29);assert.equal(round.runs.campaign.difficulty,'hard');
 const state=yard();for(const [i,type]of Object.keys(NEW_DUCKS).entries()){state.cooldowns[type]=0;state.crumbs=10000;assert(state.place(type,Math.floor(i/8),i%8).duck);}dog(state,'mastiff',0,7);dog(state,'burrower',1,7);advance(state,.7);const copy=Pond.restore(state.serialize());assert(copy);assert.equal(copy.serialize(),state.serialize());advance(state,5);advance(copy,5);assert.equal(state.serialize(),copy.serialize());
});
