import * as T from './vendor/three.module.js';
import {bindScopeTexture,solarTextureGLSL} from './scope-textures.js';
const CLOUDS={earth:{height:.026,color:'#e1e9ec',opacity:.50,density:.50,scale:18,flow:.003},venus:{height:.095,color:'#d3bb87',opacity:.92,density:.2,scale:7,flow:.0015},titan:{height:.082,color:'#c39958',opacity:.38,density:.34,scale:8,flow:.001}};
const FUNCTIONS=solarTextureGLSL+`
uniform float solarCloudTime,solarCloudScale,solarCloudDensity,solarCloudFlow;
varying vec3 solarCloudN;
float cloudHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float cloudNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(cloudHash(i),cloudHash(i+vec3(1,0,0)),f.x),mix(cloudHash(i+vec3(0,1,0)),cloudHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(cloudHash(i+vec3(0,0,1)),cloudHash(i+vec3(1,0,1)),f.x),mix(cloudHash(i+vec3(0,1,1)),cloudHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function solarCloudModel(body,{segments=64,textureSize=1024}={}){const spec=body.realSolar&&CLOUDS[body.id];if(!spec)return null;
 const uniforms={solarCloudTime:{value:0},solarCloudScale:{value:spec.scale},solarCloudDensity:{value:spec.density},solarCloudFlow:{value:spec.flow}},material=new T.MeshStandardMaterial({color:spec.color,roughness:1,transparent:true,opacity:spec.opacity,depthWrite:false});
 const mapped=['earth','venus'].includes(body.id),binding=mapped?bindScopeTexture(material,body.id+'-clouds.jpg',{size:textureSize}):null;
 if(binding){uniforms.solarCloudMap=binding.texture;uniforms.solarCloudReady=binding.ready;}
 material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 solarCloudN;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsolarCloudN=normalize(position);');shader.fragmentShader=(mapped?'uniform sampler2D solarCloudMap;uniform float solarCloudReady;\n':'')+FUNCTIONS+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec3 cn=normalize(solarCloudN);float angle=solarCloudTime*solarCloudFlow;cn.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*cn.xz;
 float curl=cloudNoise(cn*4.0);vec3 warp=vec3(sin(cn.y*17.0+curl*3.0),sin(cn.z*11.0),cos(cn.x*13.0))*.38;
 float cloud=cloudNoise(cn*solarCloudScale+warp)*.55+cloudNoise(cn*solarCloudScale*2.1+warp*2.0+7.0)*.30+cloudNoise(cn*solarCloudScale*4.3+11.0)*.15;
 float coverage=smoothstep(solarCloudDensity,solarCloudDensity+.21,cloud);
 diffuseColor.a*=mix(coverage,1.0,step(.8,opacity));diffuseColor.rgb*=.91+.12*cloud;
 ${mapped?`vec2 cloudUV=vec2(atan(cn.x,cn.z)/6.28318530718+.5,asin(clamp(cn.y,-1.0,1.0))/3.14159265359+.5);vec3 cloudImage=solarTexture(solarCloudMap,cloudUV).rgb;
 diffuseColor.rgb=mix(diffuseColor.rgb,${body.id==='earth'?'vec3(.96,.98,1.0)':'cloudImage'},solarCloudReady);
 diffuseColor.a=mix(diffuseColor.a,${body.id==='earth'?'smoothstep(.035,.65,dot(cloudImage,vec3(.333333)))*.91':'0.96'},solarCloudReady);
 diffuseColor.a*=smoothstep(${(body.radius*.015).toFixed(3)},${(body.radius*.12).toFixed(3)},length(vViewPosition));`:''}
 `);};material.customProgramCacheKey=()=> 'solar-cloud-layer-v2-'+body.id;
 const model=new T.Mesh(new T.SphereGeometry(body.radius*(1+spec.height),segments,Math.max(24,Math.floor(segments*.5))),material);model.name='solar-clouds-'+body.id;model.renderOrder=1;model.userData.solarClouds=uniforms;return model;
}
export function updateSolarClouds(root,time){for(const child of root.children){const state=child.userData.solarClouds;if(state)state.solarCloudTime.value=Number.isFinite(time)?time:0;}}
