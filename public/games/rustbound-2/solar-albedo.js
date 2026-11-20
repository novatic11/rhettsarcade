import * as T from './vendor/three.module.js';
import {SCOPE_SURFACES,bindScopeTexture} from './scope-textures.js';
export const OBSERVED_SOLAR_TEXTURES={earth:false,moon:false,venus:false,mars:false,phobos:true,deimos:true,io:false,europa:true,ganymede:true,callisto:true,mimas:true,enceladus:true,tethys:true,dione:true,rhea:true,iapetus:true,ariel:true,umbriel:true,titania:true,oberon:true,miranda:true};
const ORIGINAL='mercury ceres titan hyperion proteus triton nereid pluto charon styx nix kerberos hydra haumea hiiaka namaka makemake mk2 eris dysnomia'.split(' ');
export const SOLAR_ALBEDO_IDS=Object.freeze([...Object.keys(OBSERVED_SOLAR_TEXTURES),...ORIGINAL]);
const cache=new Map(),placeholder=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);placeholder.needsUpdate=true;
function readImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{image.onload=image.onerror=null;resolve(image);};image.onerror=()=>reject(Error('Texture unavailable'));image.src=url;});}
function fillCoverage(canvas,fallback){const context=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height,observed=context.getImageData(0,0,w,h),back=document.createElement('canvas');back.width=w;back.height=h;const ctx=back.getContext('2d');ctx.drawImage(fallback,0,0,w,h);const original=ctx.getImageData(0,0,w,h),stride=w+1,sum=new Float64Array((w+1)*(h+1)),square=new Float64Array(sum.length);let mask=new Float32Array(w*h);
 for(let y=0;y<h;y++){let row=0,rowSquare=0;for(let x=0;x<w;x++){const k=(y*w+x)*4,v=(observed.data[k]+observed.data[k+1]+observed.data[k+2])/3,i=(y+1)*stride+x+1;row+=v;rowSquare+=v*v;sum[i]=sum[i-stride]+row;square[i]=square[i-stride]+rowSquare;}}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=Math.max(0,x-2),b=Math.min(w,x+3),c=Math.max(0,y-2),d=Math.min(h,y+3),area=(b-a)*(d-c),mean=(sum[d*stride+b]-sum[c*stride+b]-sum[d*stride+a]+sum[c*stride+a])/area,variance=(square[d*stride+b]-square[c*stride+b]-square[d*stride+a]+square[c*stride+a])/area-mean*mean;mask[y*w+x]=variance<1.8&&(mean>180||mean<2)?1:0;}
 for(let pass=0;pass<2;pass++){const next=new Float32Array(mask.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;next[i]=(mask[i]*4+mask[y*w+(x+w-1)%w]+mask[y*w+(x+1)%w]+mask[Math.max(0,y-1)*w+x]+mask[Math.min(h-1,y+1)*w+x])/8;}mask=next;}
 for(let i=0;i<mask.length;i++)if(mask[i]>0)for(let k=0;k<3;k++)observed.data[i*4+k]=observed.data[i*4+k]*(1-mask[i])+original.data[i*4+k]*mask[i];context.putImageData(observed,0,0);
}
function acquire(id,size){const key=id+':'+size;if(cache.has(key)){const entry=cache.get(key);entry.refs++;return entry;}const entry={refs:1,texture:null,promise:null};cache.set(key,entry);entry.promise=(async()=>{try{const observed=Object.hasOwn(OBSERVED_SOLAR_TEXTURES,id),mono=OBSERVED_SOLAR_TEXTURES[id]===true,url=file=>new URL('./assets/solar/'+file,import.meta.url).href,[image,fallback]=await Promise.all([readImage(url(id+(observed?'.jpg':'.png'))),mono?readImage(url(id+'.png')):null]),canvas=document.createElement('canvas');canvas.width=size;canvas.height=size/2;canvas.getContext('2d').drawImage(image,0,0,size,size/2);if(fallback)fillCoverage(canvas,fallback);image.src='';if(fallback)fallback.src='';const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.anisotropy=4;entry.texture=texture;if(!entry.refs){texture.dispose();cache.delete(key);}return texture;}catch{if(!entry.refs)cache.delete(key);return null;}})();return entry;}
export function prepareSolarAlbedo(material,body,{detailed=true,textureSize=1024}={}){
 if(!body.realSolar||!SOLAR_ALBEDO_IDS.includes(body.id))return null;
 if(SCOPE_SURFACES[body.id]){const binding=bindScopeTexture(material,SCOPE_SURFACES[body.id],{size:textureSize}),uniforms={solarAlbedo:binding.texture,solarAlbedoReady:binding.ready};if(body.id==='earth'){const night=bindScopeTexture(material,'earth-night.jpg',{size:textureSize});uniforms.solarNight=night.texture;uniforms.solarNightReady=night.ready;}return uniforms;}
 const uniforms={solarAlbedo:{value:placeholder},solarAlbedoReady:{value:0}};if(typeof document==='undefined')return uniforms;const id=body.id,size=detailed?Math.min(1024,textureSize):512,entry=acquire(id,size);let disposed=false;entry.promise.then(texture=>{if(texture&&!disposed){uniforms.solarAlbedo.value=texture;uniforms.solarAlbedoReady.value=1;}});material.addEventListener('dispose',()=>{if(disposed)return;disposed=true;entry.refs--;if(!entry.refs&&entry.texture){entry.texture.dispose();cache.delete(id+':'+size);}});return uniforms;
}
export function solarAlbedoGLSL(body){if(!body.realSolar||!SOLAR_ALBEDO_IDS.includes(body.id))return '';const mono=!SCOPE_SURFACES[body.id]&&OBSERVED_SOLAR_TEXTURES[body.id]===true,tint=new T.Color(body.color).lerp(new T.Color('#ffffff'),.8);return `
 {vec3 atlasN=normalize(p);vec2 atlasUV=vec2(atan(atlasN.x,atlasN.z)/6.28318530718+.5,asin(clamp(atlasN.y,-1.0,1.0))/3.14159265359+.5);
 vec3 observed=solarTexture(solarAlbedo,atlasUV).rgb;
 ${mono?`observed=vec3(pow(dot(observed,vec3(.333333)),${['europa','mimas','enceladus','tethys','dione','rhea'].includes(body.id)?'.76':'1.0'}))*vec3(${tint.toArray().map(v=>v.toFixed(5)).join(',')});`:''}
 float coverage=${SCOPE_SURFACES[body.id]||['earth','moon',...ORIGINAL].includes(body.id)?'1.0':'smoothstep(.003,.028,max(observed.r,max(observed.g,observed.b)))'};
 float atlasWeight=mix(.72,1.0,orbitalBlend)*solarAlbedoReady*coverage;
 base=mix(base,observed,atlasWeight);
 ${body.id==='earth'?`float water=smoothstep(.005,.04,base.b-base.r);surfaceRoughness=mix(.91,.18,water);surfaceBump*=1.0-water;float dryPad=(1.0-smoothstep(285.0,330.0,length(p.xz)))*step(0.0,atlasN.y)*(1.0-orbitalBlend);base=mix(base,mix(vec3(.12,.23,.095),vec3(.34,.33,.23),detail*.6+broad*.4),dryPad);surfaceRoughness=mix(surfaceRoughness,.95,dryPad);`:''}
 surfaceBump+=dot(observed,vec3(.333333))*.012;
 }`;
}
export function solarNightGLSL(body){return body.realSolar&&body.id==='earth'?`
 #if NUM_DIR_LIGHTS > 0
 vec3 nightN=normalize(vSoilPosition);vec2 nightUV=vec2(atan(nightN.x,nightN.z)/6.28318530718+.5,asin(clamp(nightN.y,-1.0,1.0))/3.14159265359+.5);
 float nightSide=1.0-smoothstep(-.15,.15,dot(normal,directionalLights[0].direction));
 totalEmissiveRadiance+=solarTexture(solarNight,nightUV).rgb*nightSide*solarNightReady*orbitalBlend*.85;
 #endif
 `:'';}
