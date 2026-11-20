import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {cosmicStarData,cosmicDustData,createCosmicSky} from '../public/games/rustbound-2/cosmic-sky.js';

test('seeded stars have natural galactic clustering, varied sizes and finite unit-shell positions',()=>{
 const a=cosmicStarData(3400),b=cosmicStarData(3400);assert.deepEqual(a,b);const n=new T.Vector3(0,.76,-.65).normalize();let near=0;
 for(let i=0;i<a.sizes.length;i++){const p=new T.Vector3().fromArray(a.positions,i*3);assert(Math.abs(p.length()-44)<1e-5);assert(Number.isFinite(a.sizes[i]));if(Math.abs(p.normalize().dot(n))<.16)near++;}
 assert(near/3400>.42,'The galaxy should contain a visible stellar band');assert(near/3400<.7,'There must also be isolated stars across the sky');assert(Math.max(...a.sizes)-Math.min(...a.sizes)>2);assert(new Set(a.colors).size>100);
});

test('dust texture wraps at the seam and keeps meaningful cloud structure',()=>{
 const {data,width,height}=cosmicDustData(128,64);let light=0,dark=0;
 for(let y=0;y<height;y++){const a=(y*width)*4,b=(y*width+width-1)*4;assert.deepEqual(data.slice(a,a+4),data.slice(b,b+4));}
 for(let i=0;i<data.length;i+=4){assert.equal(data[i+3],255);if(data[i]>35)light++;if(data[i]<2)dark++;}
 assert(light>100);assert(dark>width*height*.4);
});

test('sky follows camera with no parallax and stays behind world geometry and atmospheric backdrops',()=>{
 const sky=createCosmicSky({performance:true}),camera=new T.PerspectiveCamera();camera.position.set(4000,700,-2200);sky.update({camera,system:'abyss',visibility:.6,map:true,performance:true});assert.deepEqual(sky.root.position.toArray(),camera.position.toArray());assert.equal(sky.root.children.length,2);
 const dust=sky.root.children[0],stars=sky.root.children[1];assert(dust.renderOrder<-100&&stars.renderOrder<-100);assert(!dust.material.transparent&&!stars.material.transparent);assert(!dust.material.depthWrite&&!stars.material.depthWrite);assert.equal(stars.geometry.drawRange.count,1600);assert(Math.abs(dust.material.uniforms.strength.value-.432)<1e-9);assert.equal(dust.material.uniforms.cloudTint.value.getHexString(),'8f403a');
 sky.update({camera,system:'tempest',visibility:1,performance:false});assert.equal(stars.geometry.drawRange.count,3400);assert.equal(dust.material.uniforms.cloudTint.value.getHexString(),'3e789f');sky.update({camera,visibility:0});assert(!sky.root.visible);sky.dispose();assert.equal(sky.root.children.length,0);
});

test('the default system map sees the galaxy rather than its sparse pole in every system',()=>{
 const sky=createCosmicSky({performance:true}),ray=new T.Vector3(Math.sin(.3)*.8,.65,Math.cos(.3)*.8).normalize().negate(),n=new T.Vector3(0,.76,-.65).normalize();
 for(const system of ['helios','vesper','amber','aster','abyss','tempest']){sky.update({system,map:true});const local=ray.clone().applyQuaternion(sky.root.quaternion.clone().invert());assert(Math.abs(local.dot(n))<.02,system+' should show the galactic band');}
 sky.dispose();
});
