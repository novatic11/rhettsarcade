import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {LANDABLE_IDS} from '../public/games/rustbound-2/system.js';
import {FOOTSTEP_PROFILES,footstepProfile,synthesizeFootstep} from '../public/games/rustbound-2/footstep-profiles.js';
import {SpaceSound} from '../public/games/rustbound-2/sound.js';

const fingerprint=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
class Param{
 constructor(value=0){this.value=value;}
 setValueAtTime(value){this.value=value;}
 setTargetAtTime(value){this.value=value;}
 linearRampToValueAtTime(value){this.value=value;}
 exponentialRampToValueAtTime(value){assert(value>0);this.value=value;}
}
class AudioNode{
 constructor(){for(const name of ['gain','frequency','pan','threshold','ratio','playbackRate'])this[name]=new Param();}
 connect(){}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}
}
class Context{
 constructor(){this.currentTime=0;this.sampleRate=12000;this.state='suspended';this.destination=new AudioNode();}
 createGain(){return new AudioNode();}createDynamicsCompressor(){return new AudioNode();}createOscillator(){return new AudioNode();}createBiquadFilter(){return new AudioNode();}createStereoPanner(){return new AudioNode();}createBufferSource(){return new AudioNode();}
 createBuffer(channels,length){const data=new Float32Array(length);return {length,getChannelData:()=>data};}
 async resume(){this.state='running';}close(){this.state='closed';}
}

test('every landable world has an explicit, distinct physical surface profile',()=>{
 assert.equal(Object.keys(FOOTSTEP_PROFILES).length,LANDABLE_IDS.length);
 assert.deepEqual(Object.keys(FOOTSTEP_PROFILES).sort(),[...LANDABLE_IDS].sort());
 assert.equal(new Set(Object.values(FOOTSTEP_PROFILES).map(p=>p.material)).size,LANDABLE_IDS.length);
 assert.equal(new Set(Object.values(FOOTSTEP_PROFILES).map(p=>JSON.stringify(p))).size,LANDABLE_IDS.length);
 for(const id of LANDABLE_IDS){const p=footstepProfile(id);assert.equal(p,FOOTSTEP_PROFILES[id]);assert(p.duration>.25&&p.duration<.5);assert(p.fragments>=9&&p.fragments<=34);assert(p.heelHz>=40&&p.heelHz<=85);}
 assert.equal(footstepProfile('unknown'),FOOTSTEP_PROFILES.cinder);
 assert.equal(footstepProfile('luma','metal').material,'Ribbed metal platform');
});

test('all six footfall variations on all 71 worlds are deterministic, finite and distinct',()=>{
 const signatures=new Set(),worlds=Object.keys(FOOTSTEP_PROFILES);
 for(const rate of [8000,48000])for(const id of worlds)for(let v=0;v<6;v++){
  const a=synthesizeFootstep(rate,'gravel',v,id);let peak=0,power=0;
  for(const sample of a){assert(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
  assert(peak>.1&&peak<.82,`${id} ${v}: bounded contact transient`);
  assert(Math.sqrt(power/a.length)>.015&&Math.sqrt(power/a.length)<.25,`${id} ${v}: useful, balanced level`);
  assert(Math.abs(a[0])===0);assert(Math.abs(a.at(-1))<.000001,`${id} ${v}: no end click`);
  const signature=fingerprint(a);assert(!signatures.has(signature),`${id} ${v}: no reused body/variant recording`);signatures.add(signature);
  if(rate===8000&&v===0)assert.equal(signature,fingerprint(synthesizeFootstep(rate,'gravel',v,id)));
 }
 assert.equal(signatures.size,worlds.length*6*2);
});

test('worlds differ in authored contact sequences and measured sound texture, beyond random noise or pitch',()=>{
 const sequences=new Set(),descriptors=[];const rate=12000;
 for(const id of LANDABLE_IDS){
  const s=FOOTSTEP_PROFILES[id].signature;assert(Object.isFrozen(s));assert(Object.isFrozen(s.layers));assert(s.gesture.length>20);
  const sequence=JSON.stringify([s.toe,s.layers,s.impacts,s.modes]);assert(!sequences.has(sequence),id+' must have its own physical contact sequence');sequences.add(sequence);
  const a=synthesizeFootstep(rate,'gravel',0,id);let energy=0,early=0,late=0,centroid=0,edge=0,low=0,lowEnergy=0;const alpha=1-Math.exp(-2*Math.PI*450/rate);
  for(let i=0;i<a.length;i++){const x=a[i],e=x*x;energy+=e;if(i<rate*.05)early+=e;if(i>=rate*.1)late+=e;centroid+=e*i/a.length;if(i)edge+=(x-a[i-1])**2;low+=(x-low)*alpha;lowEnergy+=low*low;}
  descriptors.push({id,values:[early/energy,late/energy,centroid/energy,Math.sqrt(edge/energy),lowEnergy/energy]});
 }
 for(let i=0;i<descriptors.length;i++)for(let j=0;j<i;j++){const a=descriptors[i],b=descriptors[j],distance=Math.hypot(...a.values.map((x,k)=>x-b.values[k]));assert(distance>.02,a.id+' and '+b.id+' need distinct envelopes or surface texture');}
 const range=k=>Math.max(...descriptors.map(d=>d.values[k]))-Math.min(...descriptors.map(d=>d.values[k]));assert(range(0)>.5,'Contact timing must span quick taps and slow settling');assert(range(3)>.5,'Surfaces must span soft friction and sharp fractures');
});

test('buffers cache by world, contact surface and variation, including platform contacts',async()=>{
 const sound=new SpaceSound({Context});await sound.unlock();
 const a=sound.bootBuffer('gravel',0,'cinder');assert.equal(a,sound.bootBuffer('gravel',0,'cinder'));
 assert.notEqual(a,sound.bootBuffer('gravel',0,'luma'));assert.notEqual(a,sound.bootBuffer('regolith',0,'cinder'));assert.notEqual(a,sound.bootBuffer('gravel',1,'cinder'));
 assert.notEqual(fingerprint(a.getChannelData(0)),fingerprint(sound.bootBuffer('gravel',0,'luma').getChannelData(0)));
 assert.notEqual(fingerprint(a.getChannelData(0)),fingerprint(sound.bootBuffer('regolith',0,'cinder').getChannelData(0)));
 const cinderMetal=sound.bootBuffer('metal',0,'cinder'),lumaMetal=sound.bootBuffer('metal',0,'luma');assert.notEqual(cinderMetal,lumaMetal);assert.notDeepEqual(cinderMetal.getChannelData(0),lumaMetal.getChannelData(0),'Platforms keep their metal character with distinct world contact textures');
 assert(Object.hasOwn(sound.boots,'luma:metal:0'));assert.equal(sound.bootBuffer('???',6,'unknown'),a,'Invalid input uses the bounded default cache');
 sound.close();assert.equal(Object.keys(sound.boots).length,0);
});

test('body-aware playback keeps plant cadence, pause, mute and bounded voice behavior',async()=>{
 const sound=new SpaceSound({Context});await sound.unlock();
 const plant={active:true,grounded:true,footPlant:true,walkSpeed:3.5,surface:'gravel',body:'surge'};
 sound.update(1/60,{...plant,footPlant:false});assert.equal(sound.active.size,0);
 sound.update(1/60,plant);assert.equal(sound.active.size,1);const foot=[...sound.active][0];assert.equal(foot.buffer,sound.boots['surge:gravel:0']);foot.onended();assert.equal(sound.active.size,0);
 sound.update(1/60,{...plant,active:false});sound.update(1/60,{...plant,grounded:false});assert.equal(sound.active.size,0);assert.equal(sound.stepPhase,1);
 sound.enabledState(false);sound.update(1/60,plant);assert.equal(sound.active.size,0);assert.equal(sound.master.gain.value,0);
 sound.enabledState(true);sound.setVolume(0);sound.update(1/60,plant);sound.event('attach');assert.equal(sound.active.size,0);assert.equal(sound.master.gain.value,0);
 sound.setVolume(.4);sound.update(1/60,plant);assert(Math.abs(sound.master.gain.value-.18)<1e-10);assert.equal(sound.active.size,1);
 for(let i=0;i<30;i++)sound.footstep('gravel',.6,'rime');assert.equal(sound.active.size,20);sound.event('crash');assert.equal(sound.active.size,20);
 const context=sound.context,playing=[...sound.active];sound.close();assert.equal(context.state,'closed');assert(playing.every(s=>s.stopped));assert.equal(sound.active.size,0);
});

test('idle preparation follows the current surface and cache memory stays bounded across worlds',async()=>{
 let serial=0;const pending=new Map(),defer=callback=>{const id=++serial;pending.set(id,callback);return ()=>pending.delete(id);};
 const sound=new SpaceSound({Context,defer});await sound.unlock();
 const state={active:true,grounded:true,footPlant:false,body:'luma',surface:'regolith'};sound.update(1/60,state);assert.equal(Object.keys(sound.boots).length,0);assert.equal(pending.size,1);
 const runNext=()=>{const [id,callback]=pending.entries().next().value;pending.delete(id);callback();};runNext();assert(sound.boots['luma:regolith:0']);
 sound.update(1/60,{...state,body:'cinder',surface:'metal'});assert.equal(pending.size,1);while(pending.size)runNext();for(let v=0;v<6;v++)assert(sound.boots['cinder:metal:'+v]);
 sound.update(1/60,{...state,body:'nix'});assert.equal(pending.size,1);sound.update(1/60,{...state,active:false});assert.equal(pending.size,0);
 const playing=sound.bootBuffer('metal',0,'cinder'),original=fingerprint(playing.getChannelData(0));for(const id of LANDABLE_IDS)for(let v=0;v<2;v++)sound.bootBuffer('gravel',v,id);
 assert(Object.keys(sound.boots).length<=72);assert(sound.bootBytes<=6*1024*1024);assert.equal(fingerprint(playing.getChannelData(0)),original,'Evicting a cached reference cannot alter an already playing buffer');
 sound.update(1/60,state);assert.equal(pending.size,1);sound.close();assert.equal(pending.size,0);assert.equal(sound.bootBytes,0);assert.equal(Object.keys(sound.boots).length,0);
});
