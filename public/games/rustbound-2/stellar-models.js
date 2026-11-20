import * as T from './vendor/three.module.js';

// Original procedural stellar effects. MeshBasicMaterial retains Three's
// logarithmic depth support; all optical glow layers leave depth writes off.
const states=new WeakMap();
let coronaTexture,pointFlareTexture;
const PULSAR_SPIN=.38; // Radians per second: a calm 16.5-second rotation.
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
function thermalColor(temperature){
 if(temperature<3800)return '#ff7445';
 if(temperature<5600)return '#ffc47c';
 if(temperature<8000)return '#f6f2e8';
 return '#b9dfff';
}
function colorFrom(value,fallback){
 if(Array.isArray(value)&&value.length>=3&&value.slice(0,3).every(Number.isFinite))return new T.Color().setRGB(...value.slice(0,3));
 if(value instanceof T.Color)return value.clone();
 return new T.Color(value??fallback);
}
function addMesh(parent,geometry,material,name){const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=false;mesh.receiveShadow=false;parent.add(mesh);return mesh;}
function glowMaterial(color,opacity=1){const m=new T.MeshBasicMaterial({color,transparent:true,opacity,blending:T.AdditiveBlending,depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});m.forceSinglePass=true;return m;}
function coronaMap(){
 if(coronaTexture)return coronaTexture;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
  const edge=Math.max(0,1-r*r),alpha=r>=1?0:(Math.exp(-r*r*11)*.38+Math.exp(-r*r*2.7)*.055)*edge*edge;
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(alpha*255);
 }
 coronaTexture=new T.DataTexture(data,size,size,T.RGBAFormat);coronaTexture.minFilter=T.LinearFilter;coronaTexture.magFilter=T.LinearFilter;coronaTexture.needsUpdate=true;return coronaTexture;
}
function corona(parent,color,diameter,opacity=1){
 const material=new T.SpriteMaterial({map:coronaMap(),color,transparent:true,opacity,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,alphaTest:.001});
 const sprite=new T.Sprite(material);sprite.name='stellar-corona';sprite.scale.set(diameter,diameter,1);sprite.renderOrder=2;parent.add(sprite);return sprite;
}
function pointFlare(parent){
 if(!pointFlareTexture){
  const size=96,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const px=(x+.5-size/2)/(size/2),py=(y+.5-size/2)/(size/2),r=Math.hypot(px,py);
   const streaks=Math.exp(-Math.abs(px)*85-Math.abs(py)*5)+Math.exp(-Math.abs(py)*85-Math.abs(px)*5);
   const alpha=Math.max(0,1-r)*(.54*Math.exp(-r*r*32)+streaks*.16),i=(y*size+x)*4;
   data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.min(1,alpha)*255);
  }
  pointFlareTexture=new T.DataTexture(data,size,size,T.RGBAFormat);pointFlareTexture.minFilter=T.LinearFilter;pointFlareTexture.magFilter=T.LinearFilter;pointFlareTexture.needsUpdate=true;
 }
 const sprite=new T.Sprite(new T.SpriteMaterial({map:pointFlareTexture,color:'#eaf7ff',transparent:true,opacity:.85,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,alphaTest:.001}));
 sprite.name='steady-white-blue-point-flare';sprite.scale.set(9,9,1);sprite.renderOrder=2;parent.add(sprite);return sprite;
}
function surfaceMaterial(color,temperature,time,pulsar=false){
 const material=new T.MeshBasicMaterial({color,toneMapped:false});
 const hot=color.clone().lerp(new T.Color('#ffffff'),pulsar?.67:temperature>7500?.42:.24);
 material.onBeforeCompile=shader=>{
  shader.uniforms.stellarTime=time;shader.uniforms.stellarHot={value:hot};shader.uniforms.stellarPulsar={value:pulsar?1:0};
  shader.vertexShader=`varying vec3 vStellarLocal,vStellarNormal,vStellarView;\n`+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vStellarLocal=normalize(position);vStellarNormal=normalize(normalMatrix*normal);vStellarView=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader=`varying vec3 vStellarLocal,vStellarNormal,vStellarView;
   uniform float stellarTime,stellarPulsar;uniform vec3 stellarHot;
   float stellarHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float stellarNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(stellarHash(i),stellarHash(i+vec3(1,0,0)),f.x),mix(stellarHash(i+vec3(0,1,0)),stellarHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stellarHash(i+vec3(0,0,1)),stellarHash(i+vec3(1,0,1)),f.x),mix(stellarHash(i+vec3(0,1,1)),stellarHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=vStellarLocal;float t=stellarTime*.022;
   vec3 warp=vec3(sin(p.y*9.0+t),sin(p.z*8.0-t*.7),cos(p.x*7.0+t*.8))*.65;
   float broad=stellarNoise(p*8.0+warp+t*.3),grain=stellarNoise(p*82.0+warp*3.0+vec3(t,-t*.8,t*.6));
   float filaments=pow(1.0-abs(stellarNoise(p*24.0+warp)-.5)*2.0,5.0);
   float coolSpots=smoothstep(.70,.89,stellarNoise(p*6.0+warp*.2));
   float limb=.61+.39*pow(max(.0,dot(normalize(vStellarNormal),normalize(vStellarView))),.45);
   vec3 plasma=mix(diffuseColor.rgb,stellarHot,clamp(grain*.34+filaments*.29,0.0,.7));
   float energy=(.72+broad*.22+grain*.20+filaments*.26)*(1.0-coolSpots*.55);
   diffuseColor.rgb=plasma*energy*limb*(1.0+stellarPulsar*.20);
  `);
 };
 material.customProgramCacheKey=()=>`rustbound-original-stellar-surface-v1-${pulsar?1:0}`;return material;
}
function prominence(parent,color){
 const loops=new T.Group();loops.name='coronal-loops';parent.add(loops);
 for(let j=0;j<3;j++){
  const angle=.5+j*2.1,normal=new T.Vector3(Math.sin(angle),.35*Math.cos(j*2),Math.cos(angle)).normalize();
  const tangent=new T.Vector3(normal.z,0,-normal.x).normalize(),points=[];
  for(let i=0;i<=20;i++){const t=i/20,a=(t-.5)*.25;points.push(normal.clone().multiplyScalar(Math.cos(a)*(1.008+Math.sin(t*Math.PI)*.135)).addScaledVector(tangent,Math.sin(a)));}
  addMesh(loops,new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.006,5,false),glowMaterial(color,.5),'magnetic-prominence');
 }
 return loops;
}
function accretionMaterial(time,color,opacity=1,outer=5){
 const material=glowMaterial(color,opacity);
 material.onBeforeCompile=shader=>{
  shader.uniforms.stellarTime=time;shader.uniforms.discOuter={value:outer};
  shader.vertexShader='varying vec2 vDiscPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDiscPosition=position.xy;');
  shader.fragmentShader='varying vec2 vDiscPosition;uniform float stellarTime,discOuter;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float r=length(vDiscPosition),baseAngle=atan(vDiscPosition.y,vDiscPosition.x),t=stellarTime;
   // Coherent angular flow, faster at the inner edge; no flashing radial bands.
   float a=baseAngle-t*(.025+.075/(r*sqrt(max(1.0,r))));
   float turbulent=.5+.5*sin(r*23.0+sin(a*5.0-r*3.0)*1.3);
   float winding=.5+.5*sin(a*4.0+r*8.0);
   float inner=exp(-max(0.0,r-1.65)*1.2),bright=.35+turbulent*.20+winding*.18+inner*.72;
   float edge=smoothstep(1.48,1.68,r)*(1.0-smoothstep(discOuter-.55,discOuter,r));
   float doppler=.78+.22*sin(baseAngle-.4);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,.65,.34),inner*.65)*bright*doppler;
   diffuseColor.a*=edge*(.32+inner*.48);
  `);
 };
 material.customProgramCacheKey=()=> 'rustbound-warm-circulating-accretion-v2';return material;
}
function beamMaterial(color,opacity){
 const material=glowMaterial(color,opacity);
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 vPulseUV;varying vec3 vPulseNormal,vPulseView;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vPulseUV=uv;vPulseNormal=normalize(normalMatrix*normal);vPulseView=-(modelViewMatrix*vec4(position,1.0)).xyz;`);
  shader.fragmentShader='varying vec2 vPulseUV;varying vec3 vPulseNormal,vPulseView;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float lengthFade=smoothstep(.0,.035,vPulseUV.y)*(1.0-smoothstep(.57,1.0,vPulseUV.y));
   float softEdge=pow(abs(dot(normalize(vPulseNormal),normalize(vPulseView))),.70);
   diffuseColor.a*=lengthFade*(.10+.90*softEdge)*(.40+.60*(1.0-vPulseUV.y));
  `);
 };
 material.customProgramCacheKey=()=> 'rustbound-soft-steady-pulsar-beam-v2';return material;
}

/** Geometry is centered at the group's origin. Position it in the active system. */
export function createStellarModel(spec={}){
 const radius=spec.radius,kind=spec.kind??'star';
 if(!Number.isFinite(radius)||radius<=0)throw new RangeError('A stellar model needs a positive finite radius.');
 if(!['star','blackhole','pulsar'].includes(kind))throw new RangeError(`Unknown stellar kind: ${kind}`);
 const temperature=T.MathUtils.clamp(finite(spec.temperature,kind==='pulsar'?20000:5700),1000,50000);
 // The black hole's warm accretion palette is intentional even for old blue specs.
 const color=kind==='blackhole'?new T.Color('#ee6439'):colorFrom(spec.color,kind==='pulsar'?'#8aceff':thermalColor(temperature));
 const root=new T.Group();root.name=`stellar-${spec.id??kind}`;
 const unit=new T.Group();unit.name='stellar-scaled-geometry';unit.scale.setScalar(radius);root.add(unit);
 const time={value:0},state={kind,unit,time,radius,core:null,rotors:[],lens:null,halo:null};
 if(kind==='star'){
  state.core=addMesh(unit,new T.SphereGeometry(1,48,28),surfaceMaterial(color,temperature,time),'stellar-photosphere');
  state.halo=corona(unit,color,8.5,.85);state.loops=prominence(unit,color.clone().lerp(new T.Color('#ffffff'),.28));
  root.userData.visualRadius=radius*4.25;
 }else if(kind==='blackhole'){
  state.core=addMesh(unit,new T.SphereGeometry(1,48,28),new T.MeshBasicMaterial({color:'#000104',toneMapped:false}),'opaque-event-horizon');
  const discFrame=new T.Group();discFrame.name='tilted-accretion-plane';discFrame.rotation.set(1.19,.12,.24);unit.add(discFrame);
  const main=addMesh(discFrame,new T.RingGeometry(1.5,5,96,10),accretionMaterial(time,color,.95,5),'warm-circulating-accretion-disc');
  const outer=addMesh(discFrame,new T.RingGeometry(3.4,5.25,80,3),accretionMaterial(time,color.clone().multiplyScalar(.6),.33,5.25),'diffuse-outer-inflow');outer.position.z=-.09;outer.rotation.x=.055;
  state.rotors.push({object:main,speed:.008},{object:outer,speed:.004});
  const lens=new T.Group();lens.name='camera-aligned-optical-lensing';unit.add(lens);state.lens=lens;
  addMesh(lens,new T.TorusGeometry(1.09,.018,6,96),glowMaterial('#ffd4ad',.90),'photon-ring');
  addMesh(lens,new T.TorusGeometry(1.17,.035,6,96),glowMaterial(color,.28),'soft-lens-ring');
  const arc=addMesh(lens,new T.TorusGeometry(2.45,.035,6,72,Math.PI),glowMaterial(color,.43),'warped-disc-upper-image');arc.scale.y=.62;arc.position.y=.08;
  const lower=addMesh(lens,new T.TorusGeometry(2.45,.024,6,72,Math.PI),glowMaterial(color,.22),'warped-disc-lower-image');lower.rotation.z=Math.PI;lower.scale.y=.62;lower.position.y=-.08;
  state.halo=corona(unit,color,12,.37);root.userData.visualRadius=radius*6;
 }else{
  state.core=addMesh(unit,new T.SphereGeometry(1,40,24),new T.MeshBasicMaterial({color:new T.Color('#e6f5ff').multiplyScalar(2.4),toneMapped:false}),'pulsar-core');
  state.halo=corona(unit,color,9,1.1);pointFlare(unit);
  const spinner=new T.Group(),magnetic=new T.Group();spinner.name='pulsar-spin';magnetic.name='tilted-magnetic-axis';magnetic.rotation.z=.56;spinner.add(magnetic);unit.add(spinner);state.spinner=spinner;
  for(const direction of [-1,1]){
   const jet=new T.Group();jet.position.y=direction*.82;if(direction<0)jet.rotation.z=Math.PI;magnetic.add(jet);
   for(const [r0,r1,len,opacity,jetColor] of [[.035,2.4,28,.18,color],[.018,.32,26,.48,new T.Color('#b3dcff')]]){
    const geometry=new T.CylinderGeometry(r1,r0,len,16,12,true),p=geometry.attributes.position;
    // A fixed gentle sweep keeps the distant haze organic without wobbling.
    for(let i=0;i<p.count;i++){const f=(p.getY(i)+len/2)/len;p.setX(i,p.getX(i)+Math.sin(f*Math.PI*.75)*f*f*.32);}geometry.computeVertexNormals();
    const beam=addMesh(jet,geometry,beamMaterial(jetColor,opacity),'opposing-pulsar-beam');beam.position.y=len/2;
   }
  }
  root.userData.visualRadius=radius*29;
 }
 root.userData.stellarKind=kind;root.userData.stellarRadius=radius;root.userData.temperature=temperature;
 states.set(root,state);updateStellarModel(root,0);return root;
}

/** Elapsed time is in seconds. Pass the scene camera for black-hole lens alignment. */
export function updateStellarModel(group,elapsed,camera){
 const state=states.get(group);if(!state)return group;
 const time=finite(elapsed)%86400;state.time.value=time;
 if(state.kind==='star'){
  state.core.rotation.y=time*.008;state.loops.rotation.y=time*.003;
  state.halo.material.opacity=.85+Math.sin(time*.21)*.025;
 }else if(state.kind==='blackhole'){
  for(const rotor of state.rotors)rotor.object.rotation.z=time*rotor.speed;
  if(camera?.isCamera){
   group.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);
   const parentRotation=state.unit.getWorldQuaternion(new T.Quaternion()).invert();
   state.lens.quaternion.copy(parentRotation.multiply(camera.getWorldQuaternion(new T.Quaternion())));
  }
 }else{
  state.spinner.rotation.y=time*PULSAR_SPIN;
 }
 return group;
}
