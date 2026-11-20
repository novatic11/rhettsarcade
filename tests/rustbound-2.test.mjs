import {chargeShip} from './rb2-fixtures.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Demo,BODIES,BODY_IDS,LANDABLE_IDS,GRAVITY_IDS,LANDMARKS,OBSTACLES,safeRoute,length,sub,terrainHeight,nearestBody,groundPoint,unit,gravity,orbitElements,basis,mul,add,dot} from '../public/games/rustbound-2/world.js';
import {facingAngle,advanceGait,GAIT_RADIANS_PER_METER} from '../public/games/rustbound-2/motion.js';
import {CinematicRig} from '../public/games/rustbound-2/camera.js';import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {SpaceSound} from '../public/games/rustbound-2/sound.js';
import {orbitPath} from '../public/games/rustbound-2/system.js';
const step=(d,n,input)=>{for(let i=0;i<n;i++)d.step(1/60,input);};
const finish=(d,limit=800)=>{let t=0;for(;d.mode==='flight'&&t<limit;t+=.1){d.step(.1);if(d.landing)d.resolveLanding(true);assert(d.ship.every(Number.isFinite));for(const b of [BODIES.cinder,BODIES.luma])assert(length(sub(d.ship,b.position))>=b.radius-.01,'Guidance must stay outside '+b.name);assert(d.gimbal.every(x=>Math.abs(x)<=.045));}assert.equal(d.mode,'cockpit');return t;};
test('the astronaut walks, runs, jumps and stays on solid spherical terrain',()=>{
 const d=new Demo(),start=[...d.position];step(d,60,{forward:1});assert(length(sub(d.position,start))>2.5);assert(Math.abs(length(sub(d.position,BODIES.cinder.position))-terrainHeight('cinder',d.normal))<.001);assert(d.jump());step(d,12);assert(d.jumpHeight>0);assert.equal(d.jump(),false);step(d,180);assert.equal(d.jumpHeight,0);
 const walking=new Demo(),running=new Demo();step(walking,60,{forward:1});step(running,60,{forward:1,run:true});assert(running.odometer>walking.odometer*1.9);
});
test('body facing and forward movement rotate together through 360 degrees, including idle',()=>{
 for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2,-Math.PI]){const d=new Demo(),start=[...d.position];step(d,30,{forward:1,yaw});const heading=facingAngle(yaw,1),visual=[Math.sin(heading),0,Math.cos(heading)],delta=unit([d.position[0]-start[0],0,d.position[2]-start[2]]);assert(dot(visual,delta)>.99);assert(Math.abs(Math.sin(facingAngle(yaw)-heading))<1e-8);}
});
test('each footfall sound corresponds to an animation plant, with slower walking cadence',()=>{
 let phase=0,plants=0;for(let i=0;i<600;i++){const g=advanceGait(phase,3.5/60,true);phase=g.phase;plants+=Number(g.planted);}assert.equal(plants,Math.floor(35*GAIT_RADIANS_PER_METER/Math.PI));assert(plants>=21&&plants<=23);assert(!advanceGait(phase,1,false).planted);assert(!advanceGait(phase,0,true).planted);
});
test('the astronaut cannot walk through the grounded lander, and boarding requires proximity',()=>{const d=new Demo();d.normal=unit([0,1600,8]);d.position=groundPoint('cinder',d.normal);step(d,240,{forward:1});assert(d.position[2]>=2.6);assert(d.distanceToShip()<4);assert(d.board());const far=new Demo();step(far,600,{forward:-1,run:true});assert.equal(far.board(),false);});
test('launch has real velocity; transfers reach either world with finite, terrain-safe motion',()=>{
 const d=new Demo();assert(d.board());assert(d.launch());step(d,120,{boost:true});assert.equal(d.mode,'flight');assert(nearestBody(d.ship).altitude>10);assert(d.fuel<100);
 for(const source of ['cinder','luma'])for(const target of ['cinder','luma']){const s=Demo.restore({v:2,body:source});chargeShip(s);assert(s.travelTo(target));assert(finish(s)>60);assert.equal(s.body,target);assert(s.exit());assert.equal(s.jumpHeight,0);assert(s.visited.includes(target));}
});
test('landing guidance routes around either far hemisphere instead of crossing solid planets',()=>{
 for(const source of ['cinder','luma'])for(const target of ['cinder','luma']){const d=new Demo();d.ship=groundPoint(source,[0,-1,0],8);d.position=[...d.ship];d.direction=[0,-1,0];d.mode='flight';d.body=source;chargeShip(d);assert(d.travelTo(target));finish(d);assert.equal(d.body,target);}
});
test('orbit assist circularizes and then coasts with engines off and conserved energy',()=>{
 const d=new Demo();chargeShip(d);assert(d.enterOrbit());for(let i=0;i<1800&&d.guidance;i++)d.step(.1);assert.equal(d.guidance,null);assert.equal(d.mode,'flight');const a=orbitElements(d.ship,d.velocity);assert(a.periapsis>850);assert(a.eccentricity<.025);assert.equal(d.throttle,0);for(let i=0;i<1200;i++)d.step(.1);const b=orbitElements(d.ship,d.velocity);assert(d.burn<1e-8);assert(b.periapsis>850);assert(Math.abs((a.energy-b.energy)/a.energy)<.001);
});
test('manual thrust, engine cut, retro braking and guidance cancellation remain controllable',()=>{
 const d=new Demo();d.ship=[0,5000,0];d.position=[...d.ship];d.mode='flight';d.velocity=[60,0,0];d.direction=d.aim=[0,1,0];step(d,120,{boost:true});assert(d.burn>.99);const fuel=d.fuel;step(d,120,{cut:true});assert(d.burn<.001);assert(d.fuel<=fuel);const speed=length(d.velocity);step(d,180,{brake:true});assert(length(d.velocity)<speed);d.travelTo('luma');assert(d.guidance);d.cancelGuidance();assert.equal(d.guidance,null);assert.equal(d.throttle,0);assert.equal(d.travelTo('helios'),false);
});
test('Luma has lower gravity, checkpoints migrate and distances preserve the wider system',()=>{
 const a=new Demo(),b=Demo.restore({v:1,body:'luma',visited:['cinder','luma'],sound:false});a.jump();b.jump();step(a,150);step(b,150);assert.equal(a.jumpHeight,0);assert(b.jumpHeight>0);const restored=Demo.restore(JSON.parse(JSON.stringify(b.checkpoint())));assert.equal(restored.body,'luma');assert(restored.position.every(Number.isFinite));assert(restored.distanceToShip()<16);assert.equal(restored.mode,'foot');assert.equal(restored.sound,false);assert.equal(Demo.restore({v:2,body:'bad'}).body,'cinder');assert(length(BODIES.luma.position)>BODIES.cinder.radius*45);assert(length(BODIES.helios.position)>1000000);assert.equal(BODIES.helios.radius,4200*5);
 const g1=length(gravity([0,3200,0])),g2=length(gravity([0,6400,0]));assert(Math.abs(g1/g2-4)<.01);
});
test('cinematic camera remains stable during an engine reversal, widens smoothly and follows the ship',()=>{
 const rig=new CinematicRig();rig.reset(new T.Vector3(30,5015,20),new T.Vector3(0,1,0));let ship=[0,5000,0],previous;
 for(let i=0;i<600;i++){ship=add(ship,[10,0,0]);const shot=rig.sample(1/60,{ship,velocity:[600,0,0],body:BODIES.cinder,target:BODIES.luma,altitude:i<300?3000:10,zoom:11});assert(shot.position.toArray().every(Number.isFinite));assert(shot.position.distanceTo(new T.Vector3(...ship))<85);assert(shot.fov>=52&&shot.fov<=61);if(previous){const before=previous.position.clone().sub(new T.Vector3(...sub(ship,[10,0,0]))),after=shot.position.clone().sub(new T.Vector3(...ship));assert(before.angleTo(after)<.009,'No camera whip');}previous=shot;}
 assert(previous.fov<53);assert(rig.range<40);const before=rig.back.clone();rig.sample(1/60,{ship,velocity:[-600,0,0],body:BODIES.cinder,target:BODIES.luma,altitude:2000});assert(before.angleTo(rig.back)<.008);
});
class Param{constructor(value=0){this.value=value;}setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){assert(v>0);this.value=v;}}
class Node{constructor(){for(const key of ['gain','frequency','pan','threshold','ratio','playbackRate'])this[key]=new Param();}connect(){}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
class Context{constructor(){this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination=new Node();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createOscillator(){return new Node();}createBiquadFilter(){return new Node();}createStereoPanner(){return new Node();}createBufferSource(){return new Node();}createBuffer(c,size){const data=new Float32Array(size);return {getChannelData:()=>data};}async resume(){this.state='running';}close(){this.state='closed';}}
test('boot sounds have bounded, distinct surfaces and variations; pause, mute and airborne states stay silent',async()=>{
 const s=new SpaceSound({Context});assert(await s.unlock());const gravel=s.bootBuffer('gravel',0).getChannelData(0),dust=s.bootBuffer('regolith',0).getChannelData(0),metal=s.bootBuffer('metal',0).getChannelData(0);for(const a of [gravel,dust,metal]){assert(a.every(Number.isFinite));assert(Math.max(...a.map(Math.abs))<1);assert(Math.max(...a.map(Math.abs))>.1);assert(Math.abs(a.at(-1))<.01);}assert.notDeepEqual(gravel,dust);assert.notDeepEqual(gravel,s.bootBuffer('gravel',1).getChannelData(0));
 s.update(.016,{active:true,grounded:true,footPlant:true,walkSpeed:3.5});assert.equal(s.active.size,1);const source=[...s.active][0];source.onended();assert.equal(s.active.size,0);for(const state of [{active:false,grounded:true},{active:true,grounded:false}])s.update(.016,{...state,footPlant:true});assert.equal(s.active.size,0);s.enabledState(false);s.update(.016,{active:true,grounded:true,footPlant:true});assert.equal(s.active.size,0);assert.equal(s.master.gain.value,0);const c=s.context;s.close();assert.equal(c.state,'closed');
});
test('Rustbound Legacy is archived and keeps its quote and password saves',async()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));const main=read('public/games.json');assert(!main.some(g=>g.id==='rustbound-2'));assert(!read('public/secret-games.json').some(g=>g.id==='rustbound-2'));const entry=read('public/junkyard-games.json').find(g=>g.id==='rustbound-2');assert.equal(entry.title,'Rustbound Legacy');assert.equal(entry.url,'games/rustbound-2/');assert.equal(entry.choiceQuote,"The sequel to Rustbound. Some of the site's best. Colonize, fly, and walk in full 3D.");assert(read('game-sources.json').some(g=>g.id==='rustbound-2'&&g.collection==='junkyard'));
 const {encodeSaveCode,decodeSaveCode,saveGroup}=await import('../public/save-code.js');assert.equal(saveGroup('rustbound-2-demo-v1').id,'rustbound-2');const entries=[['rustbound-2-demo-v1',JSON.stringify(new Demo().checkpoint())]];assert.deepEqual((await decodeSaveCode(await encodeSaveCode(entries))).entries,entries);
});

test('full Helios family retains its hierarchy, distinct worlds, solid landing surfaces and safe checkpoints',()=>{
 assert.equal(BODY_IDS.filter(id=>BODIES[id].system==='helios').length,13);assert.equal(LANDABLE_IDS.filter(id=>BODIES[id].system==='helios').length,11);assert.equal(BODIES.brontes.landable,false);assert.equal(BODIES.shard.parent,'ferrum');for(const id of ['ember','zephyr','opal','bastion'])assert.equal(BODIES[id].parent,'brontes');
 for(const id of LANDABLE_IDS){const d=Demo.restore({v:2,body:id,visited:[id,'bad']});assert.equal(d.body,id);assert(d.position.every(Number.isFinite));assert(!d.visited.includes('bad'));assert(orbitPath(BODIES[id]).length>100);assert.equal(d.rovers[id].body,id);}
 for(const id of BODY_IDS)for(const other of BODY_IDS)if(id!==other)assert(length(sub(BODIES[id].position,BODIES[other].position))>BODIES[id].radius+BODIES[other].radius);
});
test('every added world can be reached by gravity-driven autopilot without crossing another body or running out of fuel',()=>{
 for(const target of LANDABLE_IDS.filter(id=>BODIES[id].system==='helios'&&!['cinder','luma'].includes(id))){const d=new Demo();chargeShip(d);assert(d.travelTo(target));for(let i=0;i<8000&&d.mode==='flight';i++){d.step(.5);if(d.landing)d.resolveLanding(true);assert(d.fuel>0);for(const b of Object.values(BODIES))assert(length(sub(d.ship,b.position))>=b.radius-.01,target+' path must avoid '+b.name);}assert.equal(d.mode,'cockpit',target);assert.equal(d.body,target);assert(d.exit());assert.equal(d.campaign.roverAvailable(target),false);assert.equal(d.distanceToRover(),Infinity);}
});
test('rover reaches full speed in a second, steers, slides with the handbrake and exits beside the vehicle',()=>{
 const a=new Demo(),b=new Demo();assert(a.enterRover());assert(b.enterRover());step(a,60,{forward:1});step(b,60,{forward:1});assert(a.rovers.cinder.speed>13.5);assert(a.rovers.cinder.odometer>6);step(a,45,{forward:1,side:1});step(b,45,{forward:1,side:1,brake:true});
 const slip=d=>{const r=d.rovers.cinder,{north,right}=basis(r.normal),forward=add(mul(north,Math.cos(r.heading)),mul(right,-Math.sin(r.heading)));return Math.acos(dot(unit(r.velocity),forward));};assert(slip(b)>slip(a)*2);assert(a.position.every(Number.isFinite));assert(Math.abs(length(sub(a.position,BODIES.cinder.position))-terrainHeight('cinder',a.normal))<.001);assert(a.exitRover());assert.equal(a.mode,'foot');assert(a.distanceToRover()>2);assert(a.distanceToRover()<3);assert(a.enterRover());
});

test('Plon has a tilted, focus-centered ellipse that crosses Brontes orbital distance',()=>{const b=BODIES.plon,points=orbitPath(b,720),r=points.map(p=>length(sub(p,BODIES.helios.position)));assert(Math.min(...r)<BODIES.brontes.orbitRadius);assert(Math.max(...r)>BODIES.brontes.orbitRadius);assert(b.orbit.inclination>0&&b.orbit.inclination<Math.PI/8);assert.equal(b.parent,'helios');assert(b.landable);assert(b.orbit.eccentricity>.2);assert(Math.abs(Math.min(...r)-b.orbit.semiMajorAxis*(1-b.orbit.eccentricity))<1);});

test('worlds have distinct, bounded terrain while landing pads remain flat and landmarks stay clear of spawn',()=>{const profiles=[];for(const id of LANDABLE_IDS){const samples=[];for(let i=0;i<150;i++){const n=unit([Math.sin(i*2.4)*100,BODIES[id].radius,Math.cos(i*2.4)*100]);const height=terrainHeight(id,n)-BODIES[id].radius;assert(Number.isFinite(height));assert(Math.abs(height)<70,id);samples.push(height.toFixed(3));}profiles.push(samples.join(','));for(const [x,z] of [[0,0],[3,4],[-4,3]])assert(Math.abs(terrainHeight(id,unit([x,BODIES[id].radius,z]))-BODIES[id].radius)<1e-7);assert(LANDMARKS[id].every(p=>Math.hypot(p.x,p.z)>30));assert(OBSTACLES[id].every(p=>p.radius>0&&p.height>0));}assert.equal(new Set(profiles).size,LANDABLE_IDS.length);});
