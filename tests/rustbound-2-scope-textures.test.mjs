import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {setImmediate as tick} from 'node:timers/promises';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {SCOPE_SURFACES,scopeTextureSize,bindScopeTexture} from '../public/games/rustbound-2/scope-textures.js';
import {applySurface} from '../public/games/rustbound-2/surface-material.js';
import {solarCloudModel} from '../public/games/rustbound-2/solar-clouds.js';
import {gasGiantModel,disposeGasGiant} from '../public/games/rustbound-2/giant-model.js';
import {createRealSolarSystem} from '../public/games/rustbound-2/real-solar-system.js';
const bodies=createRealSolarSystem().bodies;
test('all selected Scope maps are bundled with exact source checksums, licenses and reconstruction labels',()=>{
 const dir=new URL('../public/games/rustbound-2/assets/solar/scope/',import.meta.url),sources=JSON.parse(fs.readFileSync(new URL('sources.json',dir),'utf8'));assert.equal(Object.keys(sources).length,17);assert.equal(Object.keys(SCOPE_SURFACES).length,13);
 for(const [id,s]of Object.entries(sources)){const bytes=fs.readFileSync(new URL(s.file,dir));assert(s.url.startsWith('https://www.solarsystemscope.com/textures/download/'));assert.equal(s.license,'CC BY 4.0');assert.equal(s.bytes,bytes.length);assert.equal(s.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));assert.equal(s.fictional,['ceres','haumea','makemake','eris'].includes(id));}
 for(const file of Object.values(SCOPE_SURFACES))assert(Object.values(sources).some(s=>s.file===file));
 assert.deepEqual([scopeTextureSize(80),scopeTextureSize(128),scopeTextureSize(192)],[512,1024,2048]);
});
test('Scope maps reach solid-world, cloud and giant shaders while fictional worlds keep their original materials',()=>{
 const compile=m=>{const s={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(s);assert(!/NaN|undefined/.test(s.fragmentShader));return s;};
 for(const [id,b]of Object.entries(bodies)){if(b.star)continue;if(b.giant){const model=gasGiantModel(b),s=compile(model.getObjectByName('giant-clouds').material);assert(s.uniforms.giantAtlasReady);assert(s.fragmentShader.includes('solarTexture(giantAtlas'));if(id==='saturn')assert(compile(model.getObjectByName('giant-rings').material).uniforms.ringAtlasReady);disposeGasGiant(model);}else{const m=new T.MeshStandardMaterial({map:new T.Texture()});applySurface(m,b);const s=compile(m);assert(s.uniforms.solarAlbedoReady);assert(s.fragmentShader.includes('float orbitalBlend=smoothstep'));assert(s.fragmentShader.includes('(1.0-orbitalBlend)'));if(id==='earth'){assert(s.uniforms.solarNightReady);assert(s.fragmentShader.includes('dot(normal,directionalLights[0].direction)'));}m.dispose();}}
 for(const id of ['earth','venus']){const cloud=solarCloudModel(bodies[id]);assert(compile(cloud.material).uniforms.solarCloudReady);cloud.geometry.dispose();cloud.material.dispose();}
 const fictional=new T.MeshStandardMaterial({map:new T.Texture()});applySurface(fictional,{id:'cinder',radius:1600,theme:'dust'});assert(!compile(fictional).uniforms.solarAlbedo);fictional.dispose();
});
test('loaded textures are shared through LOD replacement, released once, and failed/pending loads clean up safely',async()=>{
 const originalDocument=globalThis.document,originalImage=globalThis.Image;let loads=0,fail=false;
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){}}}};}};
 globalThis.Image=class{naturalWidth=2048;naturalHeight=1024;set src(value){if(!value)return;loads++;queueMicrotask(()=>fail?this.onerror?.():this.onload?.());}};
 try{
  const a=new T.MeshStandardMaterial(),b=new T.MeshStandardMaterial(),ua=bindScopeTexture(a,'cache-test.jpg',{size:512}),ub=bindScopeTexture(b,'cache-test.jpg',{size:512});await tick();assert.equal(loads,1);assert.equal(ua.ready.value,1);assert.equal(ua.texture.value,ub.texture.value);assert.equal(ua.texture.value.image.width,512);let disposed=0;ua.texture.value.addEventListener('dispose',()=>disposed++);
  const c=new T.MeshStandardMaterial(),uc=bindScopeTexture(c,'cache-test.jpg',{size:512});assert.equal(uc.ready.value,1,'replacement is ready before the next render');a.dispose();b.dispose();assert.equal(disposed,0);c.dispose();assert.equal(disposed,1);c.dispose();assert.equal(disposed,1);
  const pending=new T.MeshStandardMaterial(),up=bindScopeTexture(pending,'pending-test.jpg',{size:2048});pending.dispose();await tick();assert.equal(up.ready.value,0);const after=new T.MeshStandardMaterial(),ua2=bindScopeTexture(after,'pending-test.jpg',{size:2048});await tick();assert.equal(ua2.ready.value,1);assert.equal(ua2.texture.value.image.width,2048);after.dispose();
  fail=true;const bad=new T.MeshStandardMaterial(),failed=bindScopeTexture(bad,'failure-test.jpg');await tick();assert.equal(failed.ready.value,0);bad.dispose();fail=false;const recovered=new T.MeshStandardMaterial(),retry=bindScopeTexture(recovered,'failure-test.jpg');await tick();assert.equal(retry.ready.value,1,'a failed load does not poison later material loads');recovered.dispose();
 }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;}
});
