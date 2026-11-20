import * as T from './vendor/three.module.js';

// The background has no physical distance. Both draws stay ahead of planets in
// the opaque queue, so even the farthest world can cover it without depth tricks.
const SKY_ORDER=-220,TAU=Math.PI*2;
const PALETTES={
 helios:{dust:'#aeb9cc',cloud:'#607d9d',coal:'#29233a',turn:0},
 vesper:{dust:'#c7ab8d',cloud:'#9c6b53',coal:'#362124',turn:.38},
 amber:{dust:'#c8ae91',cloud:'#517f86',coal:'#302b2a',turn:1.12},
 aster:{dust:'#c3c9d5',cloud:'#668999',coal:'#282d3b',turn:2.07},
 abyss:{dust:'#b39791',cloud:'#8f403a',coal:'#35151d',turn:2.81},
 tempest:{dust:'#b0c7d5',cloud:'#3e789f',coal:'#182b49',turn:3.54}
};
// Keep the galactic plane in the system map's default view. The previous normal
// faced that camera almost head on, leaving only a sparse polar sky on screen.
const normal=new T.Vector3(0,.76,-.65).normalize();
const mapSightline=new T.Vector3(Math.sin(.3)*.8,.65,Math.cos(.3)*.8).normalize();
const across=new T.Vector3().crossVectors(normal,new T.Vector3(0,1,0)).normalize();
const along=new T.Vector3().crossVectors(across,normal).normalize();
const saturate=v=>Math.min(1,Math.max(0,v));
function random(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function hash(x,y,z){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^h>>>13,1274126177);return ((h^h>>>16)>>>0)/4294967295;}
function noise(x,y,z){
 const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z);x-=X;y-=Y;z-=Z;
 const u=x*x*(3-2*x),v=y*y*(3-2*y),w=z*z*(3-2*z),mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(mix(hash(X,Y,Z),hash(X+1,Y,Z),u),mix(hash(X,Y+1,Z),hash(X+1,Y+1,Z),u),v),mix(mix(hash(X,Y,Z+1),hash(X+1,Y,Z+1),u),mix(hash(X,Y+1,Z+1),hash(X+1,Y+1,Z+1),u),v),w);
}
function fBm(x,y,z){return noise(x,y,z)*.57+noise(x*2.04+11,y*2.04-3,z*2.04+7)*.28+noise(x*4.13-4,y*4.13+17,z*4.13+9)*.15;}
function galactic(longitude,latitude){
 const c=Math.cos(latitude),s=Math.sin(latitude),a=Math.cos(longitude)*c,b=Math.sin(longitude)*c;
 return [across.x*a+along.x*b+normal.x*s,across.y*a+along.y*b+normal.y*s,across.z*a+along.z*b+normal.z*s];
}

// Public, deterministic generators let us verify the asset without a DOM or GPU.
export function cosmicStarData(count=3400,seed=0x5A1F1E1D){
 count=Math.max(1,Math.min(12000,Math.floor(count)));const rng=random(seed),positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),color=new T.Color();
 for(let i=0;i<count;i++){
  let d;
  if(rng()<.43){const a=rng()*TAU,u=Math.max(.00001,rng()),gauss=Math.sqrt(-2*Math.log(u))*Math.cos(TAU*rng()),lat=Math.min(.52,Math.max(-.52,gauss*.11+.028*Math.sin(a*3)));d=galactic(a,lat);}
  else{const y=rng()*2-1,a=rng()*TAU,r=Math.sqrt(1-y*y);d=[Math.cos(a)*r,y,Math.sin(a)*r];}
  positions.set(d.map(n=>n*44),i*3);
  const hue=rng(),hex=hue<.54?'#d4dcec':hue<.76?'#b1c9e6':hue<.96?'#e2c5a7':'#dfb298';color.set(hex);
  const luminous=rng(),strength=.22+Math.pow(luminous,3)*.85;
  colors.set([color.r*strength,color.g*strength,color.b*strength],i*3);
  sizes[i]=.75+Math.pow(luminous,3.8)*2.5+(i%127===0?1.25:0);
 }
 return {positions,colors,sizes};
}

export function cosmicDustData(width=1024,height=512){
 width=Math.max(8,Math.floor(width));height=Math.max(4,Math.floor(height));const data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/(width-1),v=y/(height-1),lon=u*TAU,lat=(v-.5)*Math.PI,c=Math.cos(lat),d=[-Math.cos(lon)*c,Math.sin(lat),Math.sin(lon)*c];
  const gx=d[0]*across.x+d[1]*across.y+d[2]*across.z,gz=d[0]*along.x+d[1]*along.y+d[2]*along.z,gy=d[0]*normal.x+d[1]*normal.y+d[2]*normal.z;
  const grain=fBm(gx*6+17,gy*12+4,gz*6-9),filaments=fBm(gx*18+31,gy*35-15,gz*18+7),flow=Math.sin(Math.atan2(gz,gx)*3+.7)*.035;
  const widthBand=.135+grain*.10,band=Math.exp(-Math.pow((gy-flow)/widthBand,2)),cloudCore=.54+.46*Math.pow(Math.max(0,(gx*.7+gz*.3+1)*.5),2);
  const rift=Math.exp(-Math.pow((gy-flow-.019*Math.sin(gx*13+gz*8))/(.012+grain*.035),2))*(.35+filaments*.65);
  const dust=band*(.3+grain*.7)*cloudCore*(1-rift*.88),cloud=band*Math.pow(Math.max(0,(grain-.45)*2.3),1.4)*(.25+filaments*.75);
  // Small, irregular high-latitude wisps rather than billboard nebula blobs.
  const highWisp=Math.pow(Math.max(0,fBm(d[0]*3-14,d[1]*7+29,d[2]*3+3)-.62)*4,2)*Math.exp(-Math.pow((gy+.27)/.22,2));
  const i=(y*width+x)*4;data[i]=Math.round(saturate(dust)*255);data[i+1]=Math.round(saturate(cloud+highWisp*.45)*255);data[i+2]=Math.round(saturate(band*rift)*255);data[i+3]=255;
 }
 return {data,width,height};
}

export function createCosmicSky({performance=false}={}){
 const root=new T.Group();root.name='Cosmic sky';root.frustumCulled=false;
 const field=cosmicDustData(performance?512:1024,performance?256:512),texture=new T.DataTexture(field.data,field.width,field.height,T.RGBAFormat);
 texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.wrapS=T.RepeatWrapping;texture.generateMipmaps=false;texture.needsUpdate=true;
 const dustMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  uniforms:{field:{value:texture},dustTint:{value:new T.Color()},cloudTint:{value:new T.Color()},coalTint:{value:new T.Color()},strength:{value:1}},
  vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec3 ray;uniform sampler2D field;uniform vec3 dustTint,cloudTint,coalTint;uniform float strength;
  void main(){vec3 d=normalize(ray);vec2 uv=vec2(fract(atan(d.z,-d.x)/6.28318530718+1.),asin(clamp(d.y,-1.,1.))/3.14159265359+.5);vec3 f=texture2D(field,uv).rgb;
   vec3 color=vec3(.0011,.002,.0043)+dustTint*f.r*.30+cloudTint*f.g*.19+coalTint*f.b*.021;gl_FragColor=vec4(color*strength,1.);
   #include <colorspace_fragment>
  }`});
 const shell=new T.Mesh(new T.SphereGeometry(46,32,16),dustMaterial);shell.name='Galactic dust';shell.renderOrder=SKY_ORDER;shell.frustumCulled=false;root.add(shell);
 const starData=cosmicStarData(),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(starData.positions,3));geometry.setAttribute('color',new T.BufferAttribute(starData.colors,3));geometry.setAttribute('pointSize',new T.BufferAttribute(starData.sizes,1));
 const starMaterial=new T.ShaderMaterial({depthWrite:false,depthTest:false,fog:false,toneMapped:false,
  // Explicit additive blending in the opaque queue draws stars before worlds.
  transparent:false,blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:T.OneFactor,blendEquation:T.AddEquation,
  uniforms:{strength:{value:1},pixelScale:{value:1}},
  vertexShader:`attribute float pointSize;attribute vec3 color;uniform float pixelScale;varying vec3 tint;
   void main(){tint=color;vec4 view=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(pointSize*pixelScale,1.,7.);}`,
  fragmentShader:`varying vec3 tint;uniform float strength;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*22.);float halo=exp(-r*r*8.)*.18;float point=(core+halo)*smoothstep(.5,.28,r);gl_FragColor=vec4(tint*point*strength,1.);
   #include <colorspace_fragment>
  }`});
 const stars=new T.Points(geometry,starMaterial);stars.name='Clustered stars';stars.renderOrder=SKY_ORDER+1;stars.frustumCulled=false;root.add(stars);
 let mood='';
 function update({camera,system='helios',visibility=1,map=false,performance:low=performance}={}){
  if(camera?.position)root.position.copy(camera.position);const fade=saturate(Number.isFinite(visibility)?visibility:1);root.visible=fade>.001;
  const palette=Object.hasOwn(PALETTES,system)?PALETTES[system]:PALETTES.helios;
  if(mood!==system){dustMaterial.uniforms.dustTint.value.set(palette.dust);dustMaterial.uniforms.cloudTint.value.set(palette.cloud);dustMaterial.uniforms.coalTint.value.set(palette.coal);root.quaternion.setFromAxisAngle(mapSightline,palette.turn+.16);mood=system;}
  // Map readability comes from the restrained palette, not crushing the dust
  // below the toe of ACES when the scene is composited through its HDR target.
  dustMaterial.uniforms.strength.value=fade*(map ? .72 : 1);starMaterial.uniforms.strength.value=fade*(map ? .76 : 1);
  const ratio=typeof devicePixelRatio==='number'?devicePixelRatio:1;starMaterial.uniforms.pixelScale.value=Math.max(1,Math.min(low?1:1.65,ratio));geometry.setDrawRange(0,low?1600:3400);
 }
 update({system:'helios',performance});
 return {root,update,dispose(){shell.geometry.dispose();dustMaterial.dispose();geometry.dispose();starMaterial.dispose();texture.dispose();root.clear();}};
}
