// Build the original maps for worlds without a suitable observed mosaic.
// Shared radial coordinates keep every image continuous across longitude.
import fs from 'node:fs';import zlib from 'node:zlib';import {createRealSolarSystem} from '../public/games/rustbound-2/real-solar-system.js';import {solarNoise,SOLAR_GEOLOGY} from '../public/games/rustbound-2/solar-geology.js';
const folder=new URL('../public/games/rustbound-2/assets/solar/',import.meta.url),sources=JSON.parse(fs.readFileSync(new URL('sources.json',folder),'utf8'));
const palettes={mercury:['#54504d','#aca69c','#b8aea0'],ceres:['#3e4646','#a1aaa4','#efe6cc'],titan:['#65401f','#c19554','#25211b'],hyperion:['#48331f','#b49970','#110f0b'],proteus:['#30383a','#78817d','#a2aba4'],triton:['#8b9393','#dccac4','#4d5550'],nereid:['#50585a','#a4aaa0','#ced1ba'],pluto:['#634332','#b78561','#ead6b2'],charon:['#545b5d','#adb0a5','#67372c'],styx:['#697577','#c7cfc7','#4e575a'],nix:['#8a9d9f','#e1e4d3','#a2583d'],kerberos:['#798887','#cbd4c6','#4b5754'],hydra:['#9caba6','#e7ead7','#64746f'],haumea:['#b0c4cc','#edf0e5','#97583e'],hiiaka:['#7f9eac','#d3e2dc','#4e7484'],namaka:['#7c8a8d','#c6cfc3','#816049'],makemake:['#804c32','#c49a70','#ecdcbd'],mk2:['#211c18','#615747','#a19a88'],eris:['#bac9cc','#eff0e5','#c5a8a3'],dysnomia:['#3c474c','#87928e','#b5bfb0']};
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),clamp=x=>Math.max(0,Math.min(1,x)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const text=Buffer.from(type),result=Buffer.alloc(data.length+12);result.writeUInt32BE(data.length,0);text.copy(result,4);data.copy(result,8);let crc=0xffffffff;for(const b of Buffer.concat([text,data]))crc=crcTable[(crc^b)&255]^(crc>>>8);result.writeUInt32BE((crc^0xffffffff)>>>0,result.length-4);return result;}
function png(width,height,bytes){const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;const scan=Buffer.alloc((width*3+1)*height);for(let y=0;y<height;y++)bytes.copy(scan,y*(width*3+1)+1,y*width*3,(y+1)*width*3);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
for(const body of Object.values(createRealSolarSystem().bodies).filter(b=>!b.star&&!b.giant&&(!sources[b.id]||sources[b.id].monochrome))){
 const id=body.id,profile=SOLAR_GEOLOGY[id],colors=(palettes[id]||body.surfacePalette).map(rgb),seed=[...id].reduce((s,c)=>s*1.03+c.charCodeAt(0),3)*.017;
 const craterCount=['crater','sponge','dust','blocks'].includes(profile.family)?(profile.family==='sponge'?115:65):18,craters=Array.from({length:craterCount},(_,i)=>{const y=1-2*(i+.5)/craterCount,a=i*2.399963+seed,r=Math.sqrt(1-y*y);return {n:[Math.sin(a)*r,y,Math.cos(a)*r],size:(.014+(i*17%31)*.0019)*(profile.family==='sponge'?1.65:1)};});
 const w=512,h=256,data=Buffer.alloc(w*h*3);
 for(let y=0;y<h;y++){const lat=Math.PI*(.5-(y+.5)/h),ny=Math.sin(lat),r=Math.cos(lat);for(let x=0;x<w;x++){const lon=((x+.5)/w-.5)*Math.PI*2,n=[Math.sin(lon)*r,ny,Math.cos(lon)*r],a=solarNoise(n[0]*6+seed,n[1]*6,n[2]*6-seed),b=solarNoise(n[0]*23-seed,n[1]*23+seed,n[2]*23),fine=solarNoise(n[0]*83+seed,n[1]*83,n[2]*83);let color=mix(colors[0],colors[1],clamp(.58+a*.27+b*.12)),seam=0;
  if(['fracture','glacier'].includes(profile.family)){seam=1-smooth(.01,.09,Math.abs(Math.sin(n[0]*23+n[2]*17+a*4)+Math.sin(n[1]*19+b)));color=mix(color,colors[2],seam*.32);}
  if(profile.family==='dunes'){const dune=(.5+.5*Math.sin(n[0]*170+n[2]*25+a*9))**8;color=color.map(v=>v*(1-dune*.22));}
  if(profile.family==='blocks')color=color.map(v=>v*(.88+Math.floor((b+1)*4)/32));
  if(id==='titan'){const lake=smooth(.58,.88,b)*smooth(.3,.9,ny);color=mix(color,colors[2],lake*.85);}
  if(id==='iapetus')color=mix(color,[37,29,22],(1-smooth(-.16,.16,n[0]))*.92);
  if(id==='charon')color=mix(color,colors[2],smooth(.55,.91,ny)*.88);
  if(['nix','haumea'].includes(id)){const q=Math.hypot((lon-.15)*Math.cos(lat),lat-.08);color=mix(color,colors[2],(1-smooth(.2,.5,q))*.8);}
  if(id==='makemake')color=mix(color,colors[2],smooth(.2,.65,b)*.68);
  if(id==='kerberos')color=color.map(v=>v*(1-(1-smooth(.04,.2,Math.abs(n[0])))*.23));
  if(id==='pluto'){const px=(lon-.12)/.62,py=(lat+.12)/.57,q=px*px+py*py-1,heart=q*q*q-px*px*py*py*py;color=mix(color,colors[2],1-smooth(-.08,.08,heart));}
  if(id==='ceres'){const q=Math.hypot((lon-.14)*Math.cos(lat),lat-.18);color=mix(color,colors[2],Math.exp(-q*q*1800));}
  let shadow=0,rim=0;for(const c of craters){const dot=n[0]*c.n[0]+n[1]*c.n[1]+n[2]*c.n[2],q=2*(1-dot)/(c.size*c.size);if(q>4.5)continue;shadow=Math.max(shadow,Math.exp(-q*3.4));rim=Math.max(rim,Math.exp(-((Math.sqrt(Math.max(0,q))-1)**2)*65));}
  const pitStrength=profile.family==='sponge'?.8:.24;for(let k=0;k<3;k++)data[(y*w+x)*3+k]=Math.round(Math.max(0,Math.min(255,color[k]*(1-shadow*pitStrength)*(.96+fine*.045)+rim*(profile.family==='sponge'?24:35))));
 }}fs.writeFileSync(new URL(id+'.png',folder),png(w,h,data));console.log('Baked '+id+' — '+profile.family);
}
