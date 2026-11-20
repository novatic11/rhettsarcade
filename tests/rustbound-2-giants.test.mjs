import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {gasGiantModel,updateGasGiant,disposeGasGiant} from '../public/games/rustbound-2/giant-model.js';

test('Brontes has a continuous cloud surface, separated limb, and a single nonoverlapping ring',()=>{
 const root=gasGiantModel({id:'brontes',radius:6720}),parts=root.children[0].children;
 assert.deepEqual(parts.map(p=>p.name),['giant-clouds','giant-limb','giant-rings']);
 assert.equal(parts[0].geometry.parameters.radius,6720);
 assert(parts[1].geometry.parameters.radius>6720*1.01);
 assert(parts[2].geometry.parameters.innerRadius>parts[1].geometry.parameters.radius);
 assert.equal(parts[2].material.depthWrite,false);
 assert.equal(parts[2].material.side,T.DoubleSide);
 assert(root.children[0].rotation.z>0);
 assert.equal(root.userData.gasGiant.uniforms.giantPalette.value.length,5);
});

test('giant detail follows the requested geometry budget and does not allocate canvases or textures',()=>{
 const root=gasGiantModel({id:'cold-giant',radius:3000,color:'#5c98bc',rings:false},{segments:32,rows:20});
 assert.equal(root.children[0].children.length,2);
 assert.equal(root.children[0].children[0].geometry.parameters.widthSegments,32);
 root.traverse(n=>{if(n.material)assert.equal(n.material.map,null);});
 assert.throws(()=>gasGiantModel({radius:0}),TypeError);
});

test('cloud design, storm placement and absolute-time flow are deterministic',()=>{
 const body={id:'aegis',radius:3200,giantStyle:{palette:['#d9eff0','#75b4c2','#385b81'],storm:[-.7,.2,.3],tilt:.5,flow:.6,bandScale:30},rings:{inner:1.5,outer:2.8,tilt:.16,color:'#dae3e4',seed:98}};
 const a=gasGiantModel(body),b=gasGiantModel(body),ua=a.userData.gasGiant.uniforms,ub=b.userData.gasGiant.uniforms;
 assert.deepEqual(ua.giantStorm.value.toArray(),[-.7,.2,.3]);
 assert.equal(ua.giantSeed.value,ub.giantSeed.value);
 assert.deepEqual(ua.giantPalette.value.map(c=>c.getHexString()),ub.giantPalette.value.map(c=>c.getHexString()));
 assert.equal(a.children[0].rotation.z,.5);
 updateGasGiant(a,812.5);assert.equal(ua.giantTime.value,812.5);
 updateGasGiant(a,2);assert.equal(ua.giantTime.value,2);
 updateGasGiant(a,NaN);assert.equal(ua.giantTime.value,0);
 assert.equal(ub.giantTime.value,0);
});

test('shader hooks preserve Three lighting/depth chunks and add procedural cloud, ring gaps and sphere shadow',()=>{
 const root=gasGiantModel({id:'brontes',radius:6720});
 for(const part of root.children[0].children){
  const source=part.material.isMeshStandardMaterial?T.ShaderLib.standard:T.ShaderLib.basic;
  const shader={vertexShader:source.vertexShader,fragmentShader:source.fragmentShader,uniforms:{}};
  part.material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('#include <project_vertex>'));
  assert(shader.vertexShader.includes('#include <logdepthbuf_vertex>'));
  assert(shader.fragmentShader.includes('#include <tonemapping_fragment>'));
  assert(shader.fragmentShader.includes('#include <colorspace_fragment>'));
  if(part.name==='giant-clouds'){
   assert(shader.fragmentShader.includes('giantCloud(normalize(giantNormal))'));
   assert(shader.fragmentShader.includes('#include <lights_fragment_begin>'));
   assert(shader.uniforms.giantTime);
  }
  if(part.name==='giant-rings'){
   assert(shader.fragmentShader.includes('float planetShadow'));
   assert(shader.fragmentShader.includes('abs(ringU-.58)'));
   assert(shader.fragmentShader.includes('directionalLights[0].direction'));
  }
 }
});

test('disposing the asset releases each geometry and material once',()=>{
 const root=gasGiantModel({id:'brontes',radius:6720});let geometries=0,materials=0;
 root.traverse(n=>{if(n.geometry)n.geometry.addEventListener('dispose',()=>geometries++);if(n.material)n.material.addEventListener('dispose',()=>materials++);});
 disposeGasGiant(root);assert.equal(geometries,3);assert.equal(materials,3);
});
