import test from 'node:test';
import assert from 'node:assert/strict';
import {solarSurfaceGLSL} from '../public/games/rustbound-2/real-solar-surface.js';

const ids='earth mercury venus moon mars phobos deimos io europa ganymede callisto titan enceladus mimas tethys dione rhea hyperion iapetus miranda ariel umbriel titania oberon triton nereid proteus ceres pluto charon nix hydra kerberos styx haumea hiiaka namaka makemake mk2 eris dysnomia'.split(' ');

test('every Solar surface has its own deterministic scoped signature without changing fictional worlds',()=>{
 const sources=ids.map(id=>{
  const body={id,radius:1600,realSolar:true},source=solarSurfaceGLSL(body);
  assert(source.startsWith('\n{ // real-solar-surface:'+id));
  assert(source.endsWith('}\n'));assert(source.includes('base='));assert(source.includes('glow=vec3(0.0)'));
  assert.equal(source,solarSurfaceGLSL(body));
  assert(!/NaN|Infinity|undefined|texture2D|sampler|uniform|document\./.test(source));
  assert.equal((source.match(/groundNoise\(/g)||[]).length,3,'Two global fields plus one close material sample');
  assert.equal((solarSurfaceGLSL(body,{detailed:false}).match(/groundNoise\(/g)||[]).length,2,'Distant surfaces omit the close material sample');
  return source;
 });
 assert.equal(new Set(sources).size,ids.length);
 assert.equal(solarSurfaceGLSL({id:'cinder',radius:1600}),'');
 assert.equal(solarSurfaceGLSL({id:'earth',realSolar:false}),'');
 assert.equal(solarSurfaceGLSL({id:'unknown',realSolar:true}),'');
 assert.equal(solarSurfaceGLSL(null),'');
});

test('Solar source IDs and prefixed runtime IDs select the same known design',()=>{
 for(const id of ids){
  const expected=solarSurfaceGLSL({id,realSolar:true});
  assert.equal(solarSurfaceGLSL({id:'sol-'+id,realSolar:true}),expected);
  assert.equal(solarSurfaceGLSL({id:'runtime-'+id,solarId:id,realSolar:true}),expected);
  assert.equal(solarSurfaceGLSL({id:'runtime-'+id,realSolarId:id,realSolar:true}),expected);
 }
});

test('Earth has recognizable continents, ocean, polar ice and cloud flecks, while its north starter cap is dry',()=>{
 const earth=solarSurfaceGLSL({id:'earth',realSolar:true});
 for(const motif of ['southAmerica','continentUV','continents','ocean','polarIce','cloudFlecks','starterDryCap','starterGrass'])assert(earth.includes(motif));
 assert(earth.includes('smoothstep(285.0,330.0,length(p.xz))'));
 assert(earth.includes('step(0.0,solarN.y)'));
 assert(earth.indexOf('base=mix(base,starterGrass,starterDryCap)')>earth.indexOf('polarIce'));
 // A north-pole point is fully dry; the dry cap is gone before 330 m and
 // never applies to the south-pole ice, even though both have small p.xz.
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 const dry=(r,north)=>(1-smooth(285,330,r))*(north?1:0);
 assert.equal(dry(0,true),1);assert.equal(dry(331,true),0);assert.equal(dry(0,false),0);
});

test('landmark surface motifs distinguish Solar worlds without adding geometry or coplanar layers',()=>{
 const expect={io:['sulfurHalo','paterae'],europa:['europaCracks','europaBranches'],pluto:['heartBasin','heartShape'],triton:['nitrogenCap','plumeDeposit'],ceres:['occator','saltSpots'],mimas:['herschel'],iapetus:['cassiniDark','equatorialRidge'],moon:['lunarMaria','tychoRays'],mars:['marineris','olympus']};
 for(const [id,motifs] of Object.entries(expect)){
  const source=solarSurfaceGLSL({id,realSolar:true});for(const motif of motifs)assert(source.includes(motif),id+': '+motif);
  assert(!/gl_Position|gl_FragDepth|discard|new |position\s*=/.test(source));
 }
});
