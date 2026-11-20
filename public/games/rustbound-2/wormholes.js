import {REAL_SOLAR} from './universe.js';
import {BODIES} from './system.js';
// Paired mouths form a traversable tree. Research is never required to use one.
export const WORMHOLES=REAL_SOLAR?[]:[
 {id:'brontes-gate',name:'Brontes Gate',system:'helios',host:'brontes',peer:'vesper-arrival',a:95000,e:.38,tilt:.25,phase:1.1,period:14000,argument:.4},
 {id:'vesper-arrival',name:'Dusk Gate · Helios',system:'vesper',host:'dusk',peer:'brontes-gate',a:11000,e:.12,tilt:.12,phase:2,period:2400,argument:0},
 {id:'vesper-depth',name:'Vesper Gate · Abyss',system:'vesper',host:'vesper',peer:'abyss-arrival',a:580000,e:.14,tilt:-.16,phase:4.2,period:22000,argument:.6},
 {id:'abyss-arrival',name:'Relic Gate · Vesper',system:'abyss',host:'relic',peer:'vesper-depth',a:12000,e:.16,tilt:.2,phase:1,period:2700,argument:0},
 {id:'abyss-tempest',name:'Veil Gate · Tempest',system:'abyss',host:'veil',peer:'tempest-arrival',a:14500,e:.18,tilt:.3,phase:3.2,period:3200,argument:.7},
 {id:'tempest-arrival',name:'Arc Gate · Abyss',system:'tempest',host:'arc',peer:'abyss-tempest',a:12500,e:.14,tilt:-.2,phase:4.4,period:2900,argument:0},
 {id:'abyss-amber',name:'Inner Gate · Amber',system:'abyss',host:'abyss',peer:'amber-arrival',a:108000,e:.24,tilt:-.22,phase:5.2,period:12000,argument:.8},
 {id:'amber-arrival',name:'Moss Gate · Abyss',system:'amber',host:'moss',peer:'abyss-amber',a:13000,e:.12,tilt:.15,phase:2.7,period:3000,argument:0},
 {id:'amber-aster',name:'Perle Gate · Aster',system:'amber',host:'perle',peer:'aster-arrival',a:11500,e:.2,tilt:.3,phase:.5,period:2600,argument:1},
 {id:'aster-arrival',name:'Cobalt Gate · Amber',system:'aster',host:'cobalt',peer:'amber-aster',a:15000,e:.15,tilt:-.1,phase:3,period:3200,argument:0}
];
export const GATE_RADIUS=700,ENTRY_RANGE=1900;
export function wormhole(id){return WORMHOLES.find(g=>g.id===id);}
export function wormholePoint(g,time=0){if(typeof g==='string')g=wormhole(g);if(!g)return null;const M=g.phase+time/g.period*Math.PI*2;let E=M;for(let i=0;i<7;i++)E-=(E-g.e*Math.sin(E)-M)/(1-g.e*Math.cos(E));return ellipse(g,E);}
function ellipse(g,E){const x=g.a*(Math.cos(E)-g.e),z=g.a*Math.sqrt(1-g.e*g.e)*Math.sin(E),a=g.argument||0,rx=x*Math.cos(a)-z*Math.sin(a),rz=x*Math.sin(a)+z*Math.cos(a),p=BODIES[g.host].position;return [p[0]+rx,p[1]+rz*Math.sin(g.tilt),p[2]+rz*Math.cos(g.tilt)];}
export function wormholeVelocity(g,time){const a=wormholePoint(g,time),b=wormholePoint(g,time+.2);return b.map((v,i)=>(v-a[i])/.2);}
export function wormholePath(g){return Array.from({length:160},(_,i)=>ellipse(g,i/160*Math.PI*2));}
export function nearestWormhole(p,system,time){return WORMHOLES.filter(g=>g.system===system).map(g=>({gate:g,distance:Math.hypot(...wormholePoint(g,time).map((v,i)=>v-p[i]))})).sort((a,b)=>a.distance-b.distance)[0]||null;}
