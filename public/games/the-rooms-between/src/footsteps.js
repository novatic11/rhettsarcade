import {rng,hashText} from './world.js';

export const FOOTSTEP_SURFACES=['carpet','concrete','tile','metal','water'];
const profiles={carpet:{duration:.29,thump:76,noise:.25,tone:.6,filter:.12},concrete:{duration:.28,thump:104,noise:.58,tone:.5,filter:.4},tile:{duration:.34,thump:158,noise:.42,tone:.55,filter:.65},metal:{duration:.45,thump:89,noise:.3,tone:.44,filter:.48},water:{duration:.48,thump:66,noise:.8,tone:.24,filter:.8}};
export function surfaceAt(world,x,z,feet=0){const c=world.chunk(Math.floor(x/64),Math.floor(z/64)),g=world.ground(x,z);if(g.water&&feet<.1)return 'water';if(c.biome===0||c.biome===3)return 'carpet';if(c.biome===4)return 'tile';if(c.biome===7||c.ramps.some(a=>x>=a.x&&x<=a.x+a.w&&z>=a.z&&z<=a.z+a.d))return 'metal';return 'concrete';}
export function makeFootstepData(surface,variant,sampleRate=48000){const p=profiles[surface]||profiles.concrete,r=rng(hashText(`boot:${surface}:${variant}`)),data=new Float32Array(Math.ceil(sampleRate*p.duration)),pitch=.9+r()*.2,toeTime=.06+r()*.035;let filtered=0,low=0,peak=0;
 for(let i=0;i<data.length;i++){const t=i/sampleRate,white=r()*2-1;filtered+=(white-filtered)*p.filter;low+=(white-low)*.04;
  const heel=(1-Math.exp(-t*700))*Math.exp(-t*(surface==='carpet'?28:38)),toe=t>toeTime?(1-Math.exp(-(t-toeTime)*450))*Math.exp(-(t-toeTime)*48):0;
  let v=Math.sin(2*Math.PI*p.thump*pitch*t)*heel*p.tone+filtered*(heel+toe*.55)*p.noise;
  if(surface==='carpet')v+=low*Math.exp(-t*15)*.5+filtered*toe*.35;
  if(surface==='concrete')v+=white*(r()>.92?.35:0)*toe+Math.sin(t*2*Math.PI*210*pitch)*heel*.12;
  if(surface==='tile'){v+=Math.sin(2*Math.PI*390*pitch*t)*Math.exp(-t*32)*.12;if(variant===2||variant===6){const s=Math.max(0,t-.1);if(t>.1)v+=Math.sin(2*Math.PI*(760+s*900)*s)*Math.sin(Math.min(1,s/.11)*Math.PI)*Math.exp(-s*30)*.07;}}
  if(surface==='metal')v+=(Math.sin(2*Math.PI*310*pitch*t)+Math.sin(2*Math.PI*617*pitch*t)*.42)*Math.exp(-t*13)*.24;
  if(surface==='water'){const splash=t>.035?(1-Math.exp(-(t-.035)*140))*Math.exp(-(t-.035)*11):0;v+=filtered*splash*.5+Math.sin(2*Math.PI*(220+t*800)*t)*Math.exp(-t*23)*.14;}
  v*=Math.min(1,(p.duration-t)/.025);data[i]=v;peak=Math.max(peak,Math.abs(v));
 }if(peak>0)for(let i=0;i<data.length;i++)data[i]*=.75/peak;return data;
}
export function createFootstepBank(context){return Object.fromEntries(FOOTSTEP_SURFACES.map(surface=>[surface,Array.from({length:8},(_,variant)=>{const data=makeFootstepData(surface,variant,context.sampleRate),buffer=context.createBuffer(1,data.length,context.sampleRate);buffer.copyToChannel(data,0);return buffer;})]));}
