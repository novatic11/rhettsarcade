import {solarSurfaceGLSL} from './real-solar-surface.js';
import {prepareSolarAlbedo,solarAlbedoGLSL,solarNightGLSL} from './solar-albedo.js';
import {solarTextureGLSL} from './scope-textures.js';
const noiseGLSL=solarTextureGLSL+`
float groundHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float groundNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(groundHash(i),groundHash(i+vec3(1,0,0)),f.x),mix(groundHash(i+vec3(0,1,0)),groundHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(groundHash(i+vec3(0,0,1)),groundHash(i+vec3(1,0,1)),f.x),mix(groundHash(i+vec3(0,1,1)),groundHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const palettes={
 dust:`base=mix(vec3(.29,.155,.105),vec3(.61,.38,.26),broad);float dune=pow(.5+.5*sin(p.x*.065+sin(p.z*.018)*2.0),7.0);base+=vec3(.09,.065,.045)*dune;base=mix(base,vec3(.12,.105,.095),smoothstep(.69,.82,detail));`,
 crater:`base=mix(vec3(.18,.205,.235),vec3(.52,.56,.59),broad);base+=vec3(.07)*smoothstep(1.0,4.0,height);base*=.87+.18*detail;`,
 iron:`float vein=1.0-smoothstep(.025,.09,abs(sin(broad*18.0+p.z*.016)));base=mix(vec3(.15,.18,.21),vec3(.40,.30,.24),detail);base=mix(base,vec3(.55,.25,.095),vein*.8);base*=.85+.16*sin(height*1.8);`,
 shard:`float plates=abs(sin(p.x*.032+broad*3.0)*sin(p.z*.025-detail));base=mix(vec3(.16,.12,.22),vec3(.47,.42,.56),detail);base=mix(base,vec3(.74,.68,.80),(1.0-smoothstep(.025,.07,plates))*.7);`,
 verdigris:`base=mix(vec3(.085,.19,.14),vec3(.35,.47,.32),broad);base+=vec3(.035,.06,.025)*sin(height*2.4);base=mix(base,vec3(.42,.27,.07),smoothstep(.62,.82,detail)*(1.0-smoothstep(-2.0,4.0,height)));`,
 frost:`float crack=1.0-smoothstep(.025,.08,abs(sin(p.x*.017+broad*5.0)+sin(p.z*.022)));base=mix(vec3(.24,.40,.53),vec3(.69,.78,.82),detail);base=mix(base,vec3(.08,.20,.30),crack*.8);base=mix(base,vec3(.84,.88,.89),smoothstep(7.0,15.0,height)*.7);`,
 volcanic:`float rift=abs(broad-.5);float lava=1.0-smoothstep(.018,.065,rift);base=mix(vec3(.035,.035,.04),vec3(.14,.10,.095),detail);base=mix(base,vec3(.9,.16,.015),lava);glow=vec3(1.0,.18,.012)*lava*1.3;`,
 haze:`float streak=.5+.5*sin(p.x*.11+sin(p.z*.018)*3.0+broad*2.0);base=mix(vec3(.27,.15,.055),vec3(.64,.44,.19),broad);base+=vec3(.12,.085,.04)*pow(streak,8.0);`,
 crystal:`float fault=1.0-smoothstep(.02,.07,abs(sin(p.x*.021+detail*3.0)+sin(p.z*.019)));base=mix(vec3(.10,.32,.34),vec3(.51,.75,.72),broad);base=mix(base,vec3(.76,.94,.88),fault*.85);glow=vec3(.04,.16,.14)*fault*.3;`,
 basalt:`float ledge=.5+.5*sin(height*2.7);base=mix(vec3(.105,.09,.15),vec3(.29,.27,.35),broad);base*=.82+.23*ledge;base=mix(base,vec3(.46,.43,.49),smoothstep(.8,.94,detail)*.4);`,
 plon:`float fault=abs(sin(p.x*.009+sin(p.z*.006)*2.1+broad*.6)+sin(p.y*.008+sin(p.x*.005)));float seam=1.0-smoothstep(.015,.07,fault);base=mix(vec3(.43,.52,.52),vec3(.83,.88,.85),detail);base=mix(base,vec3(.25,.25,.17),seam*.85);`
};
export function applySurface(material,body,{detailed=true,textureSize=1024}={}){
 const albedo=prepareSolarAlbedo(material,body,{detailed,textureSize});
 const colorVec=color=>{const hex=color.replace('#','');return 'vec3('+[0,2,4].map(i=>(parseInt(hex.slice(i,i+2),16)/255).toFixed(4)).join(',')+')';};
 const custom=body.surfacePalette?`vec3 rockLow=${colorVec(body.surfacePalette[0])},rockHigh=${colorVec(body.surfacePalette[1])},rockAccent=${colorVec(body.surfacePalette[2])};float strata=groundNoise(p*.0031+3.7);vec3 nativeRock=mix(rockLow,rockHigh,clamp(broad*.72+strata*.28,0.0,1.0));base=mix(base,nativeRock,.66);float regionalSeam=1.0-smoothstep(.018,.065,abs(sin(p.x*.013+strata*4.7)+sin(p.z*.009)));base=mix(base,rockAccent,regionalSeam*.4);`:'';
 material.roughness=['frost','plon'].includes(body.theme)?.57:body.theme==='crystal'?.42:.96;material.metalness=body.theme==='iron'?.2:body.theme==='crystal'?.12:0;
 material.onBeforeCompile=shader=>{if(albedo)Object.assign(shader.uniforms,albedo);shader.vertexShader='varying vec3 vSoilPosition;varying vec3 vSoilNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSoilPosition=position;vSoilNormal=normal;');shader.fragmentShader='varying vec3 vSoilPosition;varying vec3 vSoilNormal;\n'+(body.realSolar?'uniform sampler2D solarAlbedo;uniform float solarAlbedoReady;\n':'')+(body.realSolar&&body.id==='earth'?'uniform sampler2D solarNight;uniform float solarNightReady;\n':'')+noiseGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 p=vSoilPosition;float broad=groundNoise(p*.009),detail=groundNoise(p*.052+11.7),height=length(p)-${body.radius.toFixed(1)};vec3 base=diffuseColor.rgb,glow=vec3(0.0);float orbitalBlend=${body.realSolar?`smoothstep(${(body.radius*.015).toFixed(3)},${(body.radius*.15).toFixed(3)},length(vViewPosition))`:'0.0'};float surfaceBump=0.0,surfaceRoughness=${material.roughness.toFixed(4)};${palettes[body.theme]||palettes.crater}
${custom}
${solarSurfaceGLSL(body,{detailed})}
${solarAlbedoGLSL(body)}
vec3 weights=pow(abs(normalize(vSoilNormal)),vec3(7.0));weights/=weights.x+weights.y+weights.z;vec3 grain=texture2D(map,p.yz*.32).rgb*weights.x+texture2D(map,p.xz*.32).rgb*weights.y+texture2D(map,p.xy*.32).rgb*weights.z;float microWeight=${body.realSolar?'(1.0-orbitalBlend)*(1.0-smoothstep(.4,5.0,length(fwidth(p))))':'1.0'};float groundRelief=(dot(grain,vec3(.3333))*.028+surfaceBump)*microWeight;diffuseColor.rgb=base*mix(vec3(1.0),vec3(.78)+grain*.48,microWeight);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec3 rockDx=dFdx(-vViewPosition),rockDy=dFdy(-vViewPosition);vec3 rockR1=cross(rockDy,normal),rockR2=cross(normal,rockDx);float rockDet=dot(rockDx,rockR1);if(abs(rockDet)>1e-8){normal=normalize(abs(rockDet)*normal-sign(rockDet)*(dFdx(groundRelief)*rockR1+dFdy(groundRelief)*rockR2));}');
  if(body.realSolar)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(surfaceRoughness,.15,1.0);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=glow;'+solarNightGLSL(body));
 };
 material.customProgramCacheKey=()=> 'world-surface-v8-'+body.id+(detailed?'-near':'-far');
}
