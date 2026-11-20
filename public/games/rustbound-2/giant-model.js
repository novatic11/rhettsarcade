import * as T from './vendor/three.module.js';
import {SCOPE_SURFACES,bindScopeTexture,solarTextureGLSL} from './scope-textures.js';

// The clouds are one continuous, lit surface. Fine structure is procedural in
// object space, so there are no texture seams or coincident cloud shells.
const BRONTES_PALETTE=['#f4e4c7','#d5b18e','#a86c50','#dcd4e1','#71677d'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback)=>Number.isFinite(v)?v:fallback;
const seedFor=id=>[...String(id||'giant')].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17)%10000/109;
const CLOUD_FUNCTIONS=`
uniform float giantTime,giantFlow,giantSeed,giantBandScale,giantKind;
uniform vec3 giantPalette[5],giantStorm;
varying vec3 giantNormal;
float giantHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float giantNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(giantHash(i),giantHash(i+vec3(1,0,0)),f.x),mix(giantHash(i+vec3(0,1,0)),giantHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(giantHash(i+vec3(0,0,1)),giantHash(i+vec3(1,0,1)),f.x),mix(giantHash(i+vec3(0,1,1)),giantHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float giantTurbulence(vec3 p){return giantNoise(p)*.65+giantNoise(p*2.07+9.3)*.25+giantNoise(p*4.13+21.7)*.1;}
vec3 giantCloud(vec3 n){
 float lat=asin(clamp(n.y,-1.0,1.0)),lon=atan(n.z,n.x);
 float spin=giantTime*giantFlow*.006;
 // Adjacent belts move at different rates. Every sample remains periodic at
 // the longitude seam because the noise is evaluated on a rotated sphere.
 float jet=sin(lat*14.0+giantSeed)*.27+cos(lat*6.0)*.19;
 float flowLon=lon-spin*(1.0+jet),cs=cos(lat);
 vec3 p=vec3(cos(flowLon)*cs,n.y,sin(flowLon)*cs);
 float broad=giantTurbulence(p*6.0+giantSeed),detail=giantNoise(p*51.0+giantSeed);
 float curl=sin(flowLon*9.0+sin(lat*39.0)*2.0+giantSeed)*.18;
 float warped=lat*giantBandScale+(broad-.5)*1.7+curl;
 float belt=sin(warped*1.35)+sin(warped*2.73+.8)*.29;
 float ivory=smoothstep(-.34,.5,belt),copper=smoothstep(.23,1.24,belt);
 vec3 color=mix(giantPalette[3],giantPalette[1],ivory);
 color=mix(color,giantPalette[0],smoothstep(-1.25,-.7,belt));
 color=mix(color,giantPalette[2],copper*.68);
 float ribbon=sin(warped*8.0+sin(flowLon*18.0)*.25+(detail-.5)*2.8);
 color=mix(color,giantPalette[0],smoothstep(.5,.94,ribbon)*.15);
 color*=.94+(broad-.5)*.19+(detail-.5)*.09;
 // A persistent oval storm has a raised cream eye, a dark boundary and
 // wound spiral arms; its center is stable rather than random every frame.
 float stormLon=lon-spin-giantStorm.x;
 vec2 q=vec2(atan(sin(stormLon),cos(stormLon))*cos(giantStorm.y),lat-giantStorm.y)/giantStorm.z;
 q.y*=1.65;float r=length(q),a=atan(q.y,q.x);
 float edge=1.0-smoothstep(.9,1.28,r);
 float spiral=sin(a*2.0-r*19.0+giantTime*giantFlow*.025);
 vec3 storm=mix(giantPalette[2],giantPalette[0],.28+.17*spiral);
 storm=mix(storm,giantPalette[0],(1.0-smoothstep(.12,.44,r))*.82);
 storm*=1.0-.23*exp(-pow((r-.84)*11.0,2.0));
 if(giantKind>3.5){storm=mix(vec3(.012,.035,.09),giantPalette[1],smoothstep(.2,1.1,r)*.4);storm=mix(storm,vec3(.68,.79,.88),exp(-pow((r-1.08)*11.0,2.0))*.65);}
 color=mix(color,storm,edge*(giantKind>2.5&&giantKind<3.5?.12:.94));
 // Both poles have tightly curled vortices and a muted polar hood.
 float polar=smoothstep(1.07,1.5,abs(lat));
 float vortex=sin((1.57-abs(lat))*110.0+sin(flowLon*6.0+spin)*1.9);
 vec3 polarColor=mix(giantPalette[4],giantPalette[3],.5+.15*vortex);
 color=mix(color,polarColor,polar*.78);
 if(giantKind>.5&&giantKind<1.5){
  // Jupiter: lacy equatorial belts, white ovals and copper turbulence.
  float lace=pow(1.0-abs(sin(warped*5.0+detail*5.0)),8.0);
  color=mix(color,giantPalette[0],lace*.17);
  float oval=length(vec2(sin(flowLon*3.0+.8)*2.1,(lat+.62)*6.0));
  color=mix(color,giantPalette[2],(1.0-smoothstep(.3,.55,oval))*.6);
 }else if(giantKind>1.5&&giantKind<2.5){
  // Saturn: restrained cream bands and a distinct north polar hexagon.
  color=mix(color,giantPalette[0],.17);float hexLat=lat-(1.18+cos(flowLon*6.0)*.025);
  float hex=exp(-hexLat*hexLat*900.0);color=mix(color,giantPalette[4]*.65,hex*.55);
  color=mix(color,giantPalette[3]*.6,smoothstep(1.39,1.54,lat)*.65);
 }else if(giantKind>2.5&&giantKind<3.5){
  // Uranus: soft cyan cloud decks and a wide, pale seasonal polar cap.
  vec3 cyan=mix(giantPalette[1],giantPalette[0],.46+.07*sin(lat*12.0+broad));
  float cap=smoothstep(.58,1.25,lat);color=mix(cyan,giantPalette[2],cap*.72);
  color+=vec3(.07,.08,.075)*pow(smoothstep(.73,.9,detail),3.0)*(1.0-cap)*.35;
 }else if(giantKind>3.5){
  // Neptune: deep blue jets, dark oval storms and bright fast cirrus.
  float cirrus=pow(smoothstep(.63,.83,detail),3.0)*(1.0-smoothstep(.25,.8,abs(lat+.35)));
  color=mix(color,vec3(.7,.82,.92),cirrus*.5);color*=vec3(.86,.94,1.02);
 }
 return max(color,vec3(.012));
}`;

function cloudMaterial(body,style,textureSize){
 const palette=(Array.isArray(style.palette)&&style.palette.length?style.palette:body.id==='brontes'?BRONTES_PALETTE:[body.color||'#9cb8ce','#b6cfde','#67869e','#d5e0e6','#4d667f']).map(c=>new T.Color(c));
 while(palette.length<5)palette.push(palette[palette.length-1].clone());
 const rawStorm=Array.isArray(style.storm)?style.storm:[1.05,-.28,.25];
 const uniforms={giantTime:{value:0},giantFlow:{value:clamp(finite(style.flow,1),-5,5)},giantSeed:{value:seedFor(body.id)},giantBandScale:{value:clamp(finite(style.bandScale,body.id==='brontes'?28:22),8,60)},giantPalette:{value:palette.slice(0,5)},giantStorm:{value:new T.Vector3(finite(rawStorm[0],1.05),clamp(finite(rawStorm[1],-.28),-1.25,1.25),clamp(finite(rawStorm[2],.25),.05,.6))}};
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.97,metalness:0});
 const atlas=body.realSolar&&SCOPE_SURFACES[body.id]?bindScopeTexture(material,SCOPE_SURFACES[body.id],{size:textureSize}):null;
 if(atlas){uniforms.giantAtlas=atlas.texture;uniforms.giantAtlasReady=atlas.ready;}
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 giantNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngiantNormal=normalize(position);');
  shader.fragmentShader=(atlas?'uniform sampler2D giantAtlas;uniform float giantAtlasReady;\n'+solarTextureGLSL:'')+CLOUD_FUNCTIONS+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+(atlas?`if(giantAtlasReady>.5){vec3 atlasN=normalize(giantNormal);vec2 atlasUV=vec2(atan(atlasN.x,atlasN.z)/6.28318530718+.5+giantTime*giantFlow*.000955,asin(clamp(atlasN.y,-1.0,1.0))/3.14159265359+.5);diffuseColor.rgb*=solarTexture(giantAtlas,atlasUV).rgb;}else{diffuseColor.rgb*=giantCloud(normalize(giantNormal));}`:'diffuseColor.rgb*=giantCloud(normalize(giantNormal));'));
 };
 uniforms.giantKind={value:body.realSolar?({jupiter:1,saturn:2,uranus:3,neptune:4}[body.id]||0):0};
 material.customProgramCacheKey=()=> 'rustbound-giant-clouds-v3-'+(atlas?'atlas':'procedural');
 material.userData.giantUniforms=uniforms;
 return material;
}

function ringModel(radius,rings,segments,{photographic=false,textureSize=1024}={}){
 const inner=clamp(finite(rings.inner,1.3),1.09,5),outer=Math.max(inner+.08,clamp(finite(rings.outer,2.2),1.2,7));
 const material=new T.MeshStandardMaterial({color:rings.color||'#d8cbb7',roughness:1,metalness:0,side:T.DoubleSide,transparent:true,opacity:.94,depthWrite:false});
 const uniforms={giantRadius:{value:radius},ringInner:{value:inner},ringOuter:{value:outer},ringSeed:{value:finite(rings.seed,17)}};
 const atlas=photographic?bindScopeTexture(material,'saturn-ring.png',{size:textureSize}):null;if(atlas){uniforms.ringAtlas=atlas.texture;uniforms.ringAtlasReady=atlas.ready;}
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 ringPoint,ringWorld,ringCenter;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 ringPoint=position;
 ringWorld=(modelMatrix*vec4(position,1.0)).xyz;
 ringCenter=(modelMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;`);
  shader.fragmentShader=`varying vec3 ringPoint,ringWorld,ringCenter;
uniform float giantRadius,ringInner,ringOuter,ringSeed;\n`+(atlas?'uniform sampler2D ringAtlas;uniform float ringAtlasReady;\n':'')+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float ringR=length(ringPoint.xy)/giantRadius;
 float ringU=clamp((ringR-ringInner)/(ringOuter-ringInner),0.0,1.0);
 // Filter each radial frequency over the pixel footprint. Unresolved fine
 // dust lanes fade to their mean instead of making a moire lattice when
 // the ring is small, foreshortened, or viewed on a low-resolution display.
 float ringFootprint=max(fwidth(ringU),.000001);
 float broadBand=sin(ringU*47.0+ringSeed)*exp(-.5*pow(ringFootprint*47.0,2.0));
 float middleBand=sin(ringU*137.0+ringSeed*.7)*exp(-.5*pow(ringFootprint*137.0,2.0));
 float fineBand=sin(ringU*337.0+ringSeed*1.3)*exp(-.5*pow(ringFootprint*337.0,2.0));
 float broadRings=.81+.09*broadBand+.045*middleBand+.035*fineBand;
 // The divisions are empty space in one mesh, never stacked ring planes.
 float ringEdge=max(.0015,ringFootprint*1.1);
 float ringDensity=smoothstep(0.0,max(.026,ringEdge),ringU)*(1.0-smoothstep(1.0-max(.026,ringEdge),1.0,ringU));
 ringDensity*=smoothstep(.014-ringEdge,.014+ringEdge,abs(ringU-.58));
 ringDensity*=smoothstep(.006-ringEdge,.006+ringEdge,abs(ringU-.81));
 // Keep most of the variation in color rather than alpha: alternating
 // almost-transparent spokes read like engraving rather than dusty rings.
 ringDensity*=.87+.055*broadBand+.025*middleBand+.015*fineBand;
 diffuseColor.rgb*=broadRings;
 diffuseColor.a*=ringDensity;
 ${atlas?'vec4 ringImage=texture2D(ringAtlas,vec2(ringU,.5));diffuseColor.rgb=mix(diffuseColor.rgb,ringImage.rgb,ringAtlasReady);diffuseColor.a=mix(diffuseColor.a,ringImage.a*.94,ringAtlasReady);':''}
 if(diffuseColor.a<.015)discard;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
 #if NUM_DIR_LIGHTS > 0
  vec3 ringSun=inverseTransformDirection(directionalLights[0].direction,viewMatrix);
  vec3 fromPlanet=ringWorld-ringCenter;
  float towardSun=dot(fromPlanet,ringSun);
  float impact=sqrt(max(0.0,dot(fromPlanet,fromPlanet)-towardSun*towardSun));
  float planetShadow=towardSun<0.0?smoothstep(giantRadius*.985,giantRadius*1.025,impact):1.0;
  outgoingLight*=mix(.12,1.0,planetShadow);
 #endif
 #include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'rustbound-giant-rings-v3-'+(atlas?'atlas':'procedural');
 const mesh=new T.Mesh(new T.RingGeometry(radius*inner,radius*outer,Math.max(64,segments),1),material);
 mesh.name='giant-rings';mesh.rotation.x=-Math.PI/2+finite(rings.tilt,0);mesh.renderOrder=1;
 return mesh;
}

function limbModel(radius,palette,segments,rows){
 const material=new T.MeshBasicMaterial({color:palette,transparent:true,opacity:.13,depthWrite:false,side:T.FrontSide});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 giantHazeNormal,giantHazeView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ngiantHazeNormal=normalize(normalMatrix*normal);giantHazeView=-mvPosition.xyz;');
  shader.fragmentShader='varying vec3 giantHazeNormal,giantHazeView;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat giantRim=1.0-abs(dot(normalize(giantHazeNormal),normalize(giantHazeView)));diffuseColor.a*=pow(giantRim,5.0);');
 };
 material.customProgramCacheKey=()=> 'rustbound-giant-limb-v1';
 const mesh=new T.Mesh(new T.SphereGeometry(radius*1.012,segments,rows),material);
 mesh.name='giant-limb';mesh.renderOrder=2;return mesh;
}

/** Gas/ice giant asset. Angles, including storm longitude/latitude, are radians. */
export function gasGiantModel(body,{segments=96,rows=64,textureSize=1024}={}){
 if(!Number.isFinite(body?.radius)||body.radius<=0)throw new TypeError('A gas giant needs a positive radius');
 segments=clamp(Math.round(finite(segments,96)),24,160);rows=clamp(Math.round(finite(rows,64)),16,96);
 const style=body.giantStyle||{},root=new T.Group(),tilted=new T.Group(),material=cloudMaterial(body,style,textureSize);
 root.name='gas-giant-'+String(body.id||'world');tilted.name='giant-equator';tilted.rotation.z=finite(style.tilt,body.id==='brontes'?.14:0);
 const globe=new T.Mesh(new T.SphereGeometry(body.radius,segments,rows),material);globe.name='giant-clouds';
 if(body.shape?.axes)globe.scale.set(...body.shape.axes);tilted.add(globe);
 // The shell is deliberately separated by 1.2% of the radius and never
 // writes depth; ring geometry starts beyond 1.09 radii. No coplanar layers.
 const limb=limbModel(body.radius,style.haze||'#c7d4ec',segments,Math.min(rows,40));if(body.shape?.axes)limb.scale.set(...body.shape.axes);tilted.add(limb);
 const rings=body.rings===false?null:body.rings||(body.id==='brontes'?{inner:1.32,outer:2.22,tilt:.06,color:'#ddc6a5',seed:31}:null);
 if(rings)tilted.add(ringModel(body.radius,rings,segments*2,{photographic:body.realSolar&&body.id==='saturn',textureSize}));
 root.add(tilted);root.userData.gasGiant={uniforms:material.userData.giantUniforms};
 return root;
}

/** Set an absolute animation time, so flow is deterministic across reloads. */
export function updateGasGiant(root,time){
 const state=root?.userData?.gasGiant;if(!state)return;
 state.uniforms.giantTime.value=finite(time,0);
}

/** Dispose this asset once it is removed from the scene. */
export function disposeGasGiant(root){
 const geometries=new Set(),materials=new Set();
 root?.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)(Array.isArray(node.material)?node.material:[node.material]).forEach(material=>materials.add(material));});
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
}
