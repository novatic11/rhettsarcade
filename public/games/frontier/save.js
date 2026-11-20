const buildings=['hq','solar','mine','farm','water','hab','lab','smelter','port'];
const terrains=['ore','ice','ridge','plain'],resources=['minerals','food','water','alloy','science'];
export function readColony(raw){
 try{
  const data=JSON.parse(raw),s=data?.colony;if(data?.version!==1||!s||!Number.isInteger(s.sol)||s.sol<1||s.sol>1e8||!Number.isInteger(s.pop)||s.pop<2||s.pop>1000||typeof s.won!=='boolean')return null;
  if(!resources.every(k=>Number.isFinite(s.res?.[k])&&s.res[k]>=0&&s.res[k]<=1e12))return null;
  if(!Array.isArray(s.tech)||new Set(s.tech).size!==s.tech.length||s.tech.some(k=>!['metal','orbit'].includes(k))||s.tech.includes('orbit')&&!s.tech.includes('metal'))return null;
  if(!Array.isArray(s.tiles)||s.tiles.length!==61)return null;
  const coords=new Set();for(const t of s.tiles){if(!Number.isInteger(t.q)||!Number.isInteger(t.r)||Math.max(Math.abs(t.q),Math.abs(t.r),Math.abs(t.q+t.r))>4||!terrains.includes(t.terrain)||typeof t.seen!=='boolean'||t.building!==null&&!buildings.includes(t.building)||t.building&&!t.seen)return null;const key=t.q+':'+t.r;if(coords.has(key))return null;coords.add(key);}
  const hq=s.tiles.filter(t=>t.building==='hq');if(hq.length!==1||hq[0].q!==0||hq[0].r!==0)return null;
  return {sol:s.sol,res:Object.fromEntries(resources.map(k=>[k,s.res[k]])),pop:s.pop,won:s.won,tech:[...s.tech],tiles:s.tiles.map(t=>({q:t.q,r:t.r,terrain:t.terrain,seen:t.seen,building:t.building})),log:Array.isArray(s.log)?s.log.slice(0,5).filter(l=>Number.isInteger(l.sol)&&l.sol>=1&&typeof l.text==='string').map(l=>({sol:l.sol,text:l.text.slice(0,200)})):[]};
 }catch{return null;}
}
export function writeColony(state){return JSON.stringify({version:1,colony:state});}
