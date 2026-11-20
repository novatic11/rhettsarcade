import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {astronautModel} from '../public/games/rustbound-2/astronaut-model.js';
const state=(extra={})=>({mode:'foot',walking:false,walkSpeed:0,jumpHeight:0,landingImpact:0,time:0,mining:false,campaign:{},...extra});
function advance(actor,demo,seconds=2){for(let i=0;i<seconds*60;i++){demo.time+=1/60;actor.update(1/60,demo,0,Math.PI);}}
test('the entire suit is sculpted buffer surfaces with normalized normals, bounded detail and retained animation joints',()=>{
 const actor=astronautModel(),parts=[],types=new Set();let meshes=0,triangles=0;actor.root.traverse(o=>{if(!o.isMesh)return;meshes++;types.add(o.geometry.type);const g=o.geometry,n=g.attributes.normal,p=g.attributes.position;triangles+=(g.index?.count||p.count)/3;for(const v of p.array)assert(Number.isFinite(v));for(let i=0;i<n.count;i++)assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);parts.push(...(o.userData.parts||[o.name]));});
 assert.deepEqual([...types],['BufferGeometry']);assert(meshes<=72,'rigid hardware stays batched');assert(triangles<90000);for(const name of ['sculpted-pressure-helmet','inset-optical-visor','sculpted-life-support-shell','shaped-glove-palm','tailored-finger','curved-boot-outsole','tailored-boot-upper','sculpted-knee-shield'])assert(parts.includes(name),name);
 actor.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(actor.root),size=bounds.getSize(new T.Vector3());assert(size.y>2&&size.y<2.2);assert(size.x<1.05);assert(bounds.min.y>-.015);for(const joint of [actor.rig.head,actor.rig.pack,...actor.rig.legs.flatMap(l=>[l.hip,l.knee,l.foot]),...actor.rig.arms.flatMap(a=>[a.shoulder,a.elbow,a.hand])])assert(joint.parent);actor.dispose();
});
test('walking and running keep the stance sole on the ground and preserve distance-based footstep cadence',()=>{
 for(const speed of [3.5,7.8]){const actor=astronautModel(),d=state({walking:true,walkSpeed:speed}),sole=[[0,-.119,.065],[0,-.106,.27],[0,-.106,-.135],[0,-.065,.288]];let plants=0,maxContact=0;
  for(let i=0;i<600;i++){d.time+=1/60;if(actor.update(1/60,d,0,Math.PI))plants++;if(i>90){actor.root.updateMatrixWorld(true);const phase=d.time*speed*2,leg=actor.rig.legs[Math.sin(phase)>=0?0:1],height=Math.min(...sole.map(p=>new T.Vector3(...p).applyMatrix4(leg.foot.matrixWorld).y));maxContact=Math.max(maxContact,Math.abs(height-.012));}}
  assert(maxContact<.007,'stance foot does not float: '+maxContact);assert(Math.abs(plants-Math.floor(10*speed*2/Math.PI))<=1);const before=actor.rig.legs[0].hip.rotation.x;actor.update(0,d,0,Math.PI);assert.equal(actor.rig.legs[0].hip.rotation.x,before);assert.equal(actor.update(0,d),false);actor.dispose();
 }
});
test('rover, jump and hand-held tool poses transition smoothly, stay finite and do not emit walking contacts',()=>{
 const actor=astronautModel(),d=state({mode:'rover'});assert(Math.abs(actor.rig.legs[0].hip.rotation.x)<1e-8);actor.update(1/60,d);assert(Math.abs(actor.rig.legs[0].hip.rotation.x)<.3,'no instantaneous seated snap');advance(actor,d);for(const leg of actor.rig.legs){assert(Math.abs(leg.hip.rotation.x+1.29)<.001);assert(Math.abs(leg.knee.rotation.x-1.4)<.001);}
 d.mode='foot';d.jumpHeight=.8;advance(actor,d);assert.equal(actor.update(1/60,d),false);d.jumpHeight=0;d.mining=true;advance(actor,d);actor.root.updateMatrixWorld(true);assert.equal(actor.rig.tool.root.visible,true);const direction=new T.Vector3(0,1,0).transformDirection(actor.rig.tool.root.matrixWorld);assert(direction.z>.95,'survey bit points forward while held');assert.equal(actor.rig.tool.root.parent,actor.rig.arms[1].hand);d.mining=false;advance(actor,d);assert.equal(actor.rig.tool.root.visible,false);
 for(const key of ['position','quaternion','scale'])actor.root.traverse(o=>assert(o[key].toArray().every(Number.isFinite)));actor.dispose();
});
test('the visor follows camera turns within neck limits without changing the root facing',()=>{
 const actor=astronautModel(),d=state();for(const yaw of [0,Math.PI,Math.PI*2,-Math.PI/2]){for(let i=0;i<60;i++)actor.update(1/60,d,1.2,yaw);assert(Math.abs(actor.rig.head.rotation.y)<=.337);assert.equal(actor.root.rotation.y,0);}actor.dispose();
});
test('removing a suit releases each owned geometry and material once',()=>{
 const actor=astronautModel(),geometries=new Set(),materials=new Set();actor.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});let g=0,m=0;geometries.forEach(x=>x.addEventListener('dispose',()=>g++));materials.forEach(x=>x.addEventListener('dispose',()=>m++));actor.dispose();actor.dispose();assert.equal(g,geometries.size);assert.equal(m,materials.size);assert.equal(actor.update(.016,state()),false);
});
