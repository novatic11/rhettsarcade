import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {createRealSolarSystem} from '../public/games/rustbound-2/real-solar-system.js';
import {SOLAR_GEOLOGY,solarTerrainRelief} from '../public/games/rustbound-2/solar-geology.js';
import {SOLAR_FINISH_IDS} from '../public/games/rustbound-2/solar-surface-finish.js';
import {SOLAR_ALBEDO_IDS,OBSERVED_SOLAR_TEXTURES} from '../public/games/rustbound-2/solar-albedo.js';
import {applySurface} from '../public/games/rustbound-2/surface-material.js';
import {solarCloudModel,updateSolarClouds} from '../public/games/rustbound-2/solar-clouds.js';
const bodies=Object.values(createRealSolarSystem().bodies),solid=bodies.filter(b=>!b.star&&!b.giant),ids=solid.map(b=>b.id).sort();
test('all 41 solid worlds have individual albedos, geology and finishes; every bundled image is present',()=>{
 for(const actual of [Object.keys(SOLAR_GEOLOGY),SOLAR_FINISH_IDS,SOLAR_ALBEDO_IDS])assert.deepEqual([...actual].sort(),ids);
 const source=JSON.parse(fs.readFileSync(new URL('../public/games/rustbound-2/assets/solar/sources.json',import.meta.url),'utf8'));assert.equal(Object.keys(source).length,21);
 for(const b of solid){const observed=Object.hasOwn(OBSERVED_SOLAR_TEXTURES,b.id),image=fs.readFileSync(new URL('../public/games/rustbound-2/assets/solar/'+b.id+(observed?'.jpg':'.png'),import.meta.url));if(observed){assert.equal(image[0],255);assert.equal(image[1],216);assert(source[b.id].url.startsWith('https://'));assert(source[b.id].credit.includes('NASA'));}if(!observed||OBSERVED_SOLAR_TEXTURES[b.id]){const png=fs.readFileSync(new URL('../public/games/rustbound-2/assets/solar/'+b.id+'.png',import.meta.url));assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),256);}}
});
test('terrain has distinct, bounded relief, no longitude seam and protected starting pads',()=>{
 const fingerprints=new Set();for(const b of solid){const heights=[];for(let i=0;i<80;i++){const y=1-2*(i+.5)/80,a=i*2.399963,r=Math.sqrt(1-y*y),n=[Math.sin(a)*r,y,Math.cos(a)*r],height=solarTerrainRelief(b,n);assert(Number.isFinite(height));assert(Math.abs(height)<=b.radius*.08+1e-8);assert.equal(height,solarTerrainRelief(b,n));heights.push(height.toFixed(6));}assert(Math.max(...heights)-Math.min(...heights)>.2,b.id);fingerprints.add(heights.join(','));assert(Math.abs(solarTerrainRelief(b,[0,1,0]))<1e-9);const epsilon=1e-8;assert(Math.abs(solarTerrainRelief(b,[epsilon,0,-1])-solarTerrainRelief(b,[-epsilon,0,-1]))<.001,b.id+' continuous seam');}assert.equal(fingerprints.size,41);assert.equal(solarTerrainRelief({id:'cinder',radius:1600},[1,0,0]),0);
});
test('near and distant material programs expose correct map/roughness uniforms and distinct cache keys',()=>{
 for(const b of solid){const keys=[];for(const detailed of [false,true]){const m=new T.MeshStandardMaterial({map:new T.Texture()});applySurface(m,b,{detailed});const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);assert(shader.fragmentShader.includes('uniform sampler2D solarAlbedo'));assert(shader.fragmentShader.includes('roughnessFactor=clamp(surfaceRoughness'));assert(shader.uniforms.solarAlbedo.value);assert.equal(shader.uniforms.solarAlbedoReady.value,0);assert(!/NaN|undefined/.test(shader.fragmentShader));keys.push(m.customProgramCacheKey());m.dispose();}assert.notEqual(...keys);}
});
test('only Earth, Venus and Titan get separated moving cloud layers; their geometry stays above terrain',()=>{
 for(const b of solid){const model=solarCloudModel(b);if(['earth','venus','titan'].includes(b.id)){assert(model);assert.equal(model.material.depthWrite,false);assert(model.geometry.boundingSphere===null);assert(model.geometry.parameters.radius>b.radius*1.02);const root=new T.Group();root.add(model);updateSolarClouds(root,20);assert.equal(model.userData.solarClouds.solarCloudTime.value,20);model.geometry.dispose();model.material.dispose();}else assert.equal(model,null);}
});
