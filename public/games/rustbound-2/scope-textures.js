import * as T from './vendor/three.module.js';

// Solar System Scope / INOVE, CC BY 4.0. Files are bundled, never hotlinked.
export const SCOPE_SURFACES=Object.freeze({mercury:'mercury.jpg',venus:'venus-surface.jpg',earth:'earth-day.jpg',moon:'moon.jpg',mars:'mars.jpg',jupiter:'jupiter.jpg',saturn:'saturn.jpg',uranus:'uranus.jpg',neptune:'neptune.jpg',ceres:'ceres.jpg',haumea:'haumea.jpg',makemake:'makemake.jpg',eris:'eris.jpg'});
export const scopeTextureSize=segments=>segments<=80?512:segments>128?2048:1024;
// atan wraps at the date line. Correct the derivatives there so mip filtering
// does not turn a one-pixel seam into a stripe of the entire map's mean color.
export const solarTextureGLSL=`
vec4 solarTexture(sampler2D image,vec2 uv){vec2 dx=dFdx(uv),dy=dFdy(uv);dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);return texture2DGradEXT(image,uv,dx,dy);}
`;
const cache=new Map(),placeholder=new T.DataTexture(new Uint8Array([128,128,128,255]),1,1);placeholder.needsUpdate=true;
function readImage(file){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{image.onload=image.onerror=null;resolve(image);};image.onerror=()=>reject(Error('Solar image unavailable: '+file));image.src=new URL('./assets/solar/scope/'+file,import.meta.url).href;});}
function acquire(file,size){
 const key=file+':'+size;let entry=cache.get(key);if(entry){entry.refs++;return entry;}
 entry={refs:1,texture:null,promise:null,done:false};cache.set(key,entry);
 entry.promise=(async()=>{try{
  const image=await readImage(file),canvas=document.createElement('canvas');canvas.width=Math.min(size,image.naturalWidth);canvas.height=Math.max(1,Math.round(canvas.width*image.naturalHeight/image.naturalWidth));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.src='';
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.anisotropy=size<=512?2:4;entry.texture=texture;entry.done=true;
  if(!entry.refs){texture.dispose();if(cache.get(key)===entry)cache.delete(key);}return texture;
 }catch{entry.done=true;if(!entry.refs&&cache.get(key)===entry)cache.delete(key);return null;}})();return entry;
}
/** Shared and reference-counted; dispose the owning material to release it. */
export function bindScopeTexture(material,file,{size=1024}={}){
 const uniforms={texture:{value:placeholder},ready:{value:0}};if(typeof document==='undefined')return uniforms;
 size=size<=512?512:size>=2048?2048:1024;const entry=acquire(file,size),key=file+':'+size;let disposed=false;
 if(entry.texture){uniforms.texture.value=entry.texture;uniforms.ready.value=1;}
 entry.promise.then(texture=>{if(texture&&!disposed){uniforms.texture.value=texture;uniforms.ready.value=1;}});
 material.addEventListener('dispose',()=>{if(disposed)return;disposed=true;entry.refs--;if(!entry.refs&&entry.done){entry.texture?.dispose();if(cache.get(key)===entry)cache.delete(key);}});
 return uniforms;
}
