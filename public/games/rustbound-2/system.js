import {REAL_SOLAR,HOME_SYSTEM} from './universe.js';
import {createRealSolarSystem,solarOrbitPoint} from './real-solar-system.js';
import {EXTRA_WORLDS} from './frontier-worlds.js';
import {OUTER_WORLDS,REWORKED_WORLDS,SYSTEM_THEMES} from './system-expansion.js';
// The original Rustbound's Helios family, with distances expanded for 3D flight.
const sun=[-600000,330000,-950000],distance=Math.hypot(...sun),u=sun.map(x=>-x/distance),v=[u[2],0,-u[0]],vl=Math.hypot(...v);for(let i=0;i<3;i++)v[i]/=vl;
const orbitPoint=(parent,r,a)=>parent.map((x,i)=>x+r*(u[i]*Math.cos(a)+v[i]*Math.sin(a)));
export const BODIES={
 helios:{id:'helios',name:'Helios',radius:21000,position:sun,star:true,color:'#fff2d9',role:'The home star'},
 cinder:{id:'cinder',name:'Cinder',radius:1600,position:[0,0,0],gravity:5.4,color:'#a16b50',atmosphere:260,dust:[.65,.39,.22],theme:'dust',parent:'helios',orbitRadius:distance,phase:0,role:'Starter world'},
 luma:{id:'luma',name:'Luma',radius:800,position:[22000,18000,-75000],gravity:.9,color:'#939ba0',atmosphere:14,theme:'crater',parent:'cinder',orbitRadius:Math.hypot(22000,18000,75000),role:'Cinder’s cratered moon'}
};
const entries=[
 ['ferrum','Ferrum',1984,7.29,'#a58b70','iron','helios',30000,-.85,150,[.5,.39,.31],'Iron mesas'],
 ['shard','Shard',928,1.512,'#93869f','shard','ferrum',4800,1.8,0,null,'Fractured metallic moon'],
 ['viridia','Viridia',1760,4.59,'#738d77','verdigris','helios',76000,.7,320,[.30,.45,.36],'Green mineral basins'],
 ['nix','Nix',1408,2.808,'#a0b3cc','frost','helios',112000,2.15,0,null,'Frozen frontier'],
 ['brontes','Brontes',6720,4.2,'#b69aa8','giant','helios',170000,-1.15,650,[.48,.36,.42],'Gas giant · no solid surface'],
 ['ember','Ember',1504,4.05,'#6e4a43','volcanic','brontes',9500,.3,45,[.41,.24,.17],'Volcanic foundry moon'],
 ['zephyr','Zephyr',1792,3.24,'#ad936e','haze','brontes',15500,2.1,410,[.57,.43,.24],'Amber atmosphere'],
 ['opal','Opal',1632,2.052,'#9fc5cb','crystal','brontes',23000,-1.6,0,null,'Turquoise crystal world'],
 ['bastion','Bastion',2080,4.86,'#7f788b','basalt','brontes',32000,3.1,0,null,'Basalt highlands']
];
for(const [id,name,radius,gravity,color,theme,parent,r,a,atmosphere,dust,role] of entries){const orbitRadius=r*distance/48000;BODIES[id]={id,name,radius,gravity,color,theme,parent,orbitRadius,phase:a,atmosphere,dust,role,giant:theme==='giant',position:orbitPoint(BODIES[parent].position,orbitRadius,a)};}
const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
export function ellipticalPoint(body,eccentricAnomaly){if(body.realSolar)return solarOrbitPoint(body,eccentricAnomaly,BODIES[body.parent].position);const {semiMajorAxis:a,eccentricity:e,inclination:i,argument:w}=body.orbit,tilted=v.map((x,j)=>x*Math.cos(i)+normal[j]*Math.sin(i)),x=a*(Math.cos(eccentricAnomaly)-e),y=a*Math.sqrt(1-e*e)*Math.sin(eccentricAnomaly),rx=x*Math.cos(w)-y*Math.sin(w),ry=x*Math.sin(w)+y*Math.cos(w);return BODIES[body.parent].position.map((p,j)=>p+u[j]*rx+tilted[j]*ry);}
BODIES.plon={id:'plon',name:'Plon',radius:1040,gravity:1.15,color:'#becbc9',theme:'plon',parent:'helios',atmosphere:8,role:'Fractured ice dwarf · tilted elliptical orbit',orbit:{semiMajorAxis:BODIES.brontes.orbitRadius*1.22,eccentricity:.29,inclination:Math.PI/15,argument:.72}};
BODIES.plon.orbitRadius=BODIES.plon.orbit.semiMajorAxis;BODIES.plon.position=ellipticalPoint(BODIES.plon,-1.1);
export const SYSTEMS={
 helios:{id:'helios',name:'Helios',star:'helios',class:'G-type main sequence',extent:BODIES.plon.orbit.semiMajorAxis*(1+BODIES.plon.orbit.eccentricity),description:'Your home system. Dust worlds, green basins and the Brontes moons.'},
 vesper:{id:'vesper',name:'Vesper',star:'vesper',class:'M-type red dwarf',extent:780000,description:'A quiet ember of a star. Rust flats, a twilight ocean world and frozen nightlands.'},
 amber:{id:'amber',name:'Amber',star:'amber',class:'K-type orange dwarf',extent:1100000,description:'Warm copper light over salt deserts, mineral gardens and an ice giant.'},
 aster:{id:'aster',name:'Aster',star:'aster',class:'F-type main sequence',extent:1500000,description:'A bright white sun. Glass deserts and cobalt cliffs under a hard blue sky.'},
 abyss:{id:'abyss',name:'Abyss',star:'abyss',class:'Black hole · red accretion disc',extent:1250000,description:'A red river of hot matter circling a black horizon. Land on the surviving relic worlds.'},
 tempest:{id:'tempest',name:'Tempest',star:'tempest',class:'Blue pulsar',extent:1150000,description:'A violent rotating beacon. Scoured worlds carry radiation scars and rare isotopes.'}
};
for(const b of Object.values(BODIES))b.system='helios';
const stars=[['vesper',[-12000000,0,0],10500,'#ff7451','star'],['amber',[12000000,0,0],17000,'#ffcb82','star'],['aster',[0,0,13000000],24000,'#e0efff','star'],['abyss',[-12000000,0,13000000],10000,'#ff743e','blackhole'],['tempest',[12000000,0,13000000],6500,'#65bfff','pulsar']];
for(const [id,position,radius,color,kind] of stars)BODIES[id]={id,name:SYSTEMS[id].name,position,radius,color,kind,system:id,star:true,role:SYSTEMS[id].class};
const exoplanets=[
 ['kiln','Kiln','vesper',1250,3.2,'#a7513e','iron',150000,.4,20,'iron','Tidally scorched iron flats','Twilight ridge','Charred survey mast','Ember lattice'],
 ['dusk','Dusk','vesper',1850,4.4,'#537c83','verdigris',370000,2.1,280,'copper','Turquoise mineral coastlines','Twilight salt coast','Seaward relay','Tidal resonator'],
 ['rime','Rime','vesper',970,.8,'#bfcbdc','frost',690000,4.2,0,'helium3','Permanent ice and violet shadows','Blue pressure ridge','Frostbound antenna','Nightglass vault'],
 ['saffron','Saffron','amber',1620,3.5,'#d2ad73','haze',220000,1.1,310,'copper','Salt dunes under an amber sun','Golden salt dunes','Half-buried observatory','Salt crystal organ'],
 ['moss','Moss','amber',1970,5.1,'#659181','verdigris',520000,3.3,360,'cobalt','Green mineral gardens and basalt streams','Copperstone gardens','Garden survey relay','Verdant column'],
 ['perle','Perle','amber',1150,1.3,'#b7d6d9','crystal',910000,5.3,10,'crystal','Pale crystal mesas above frozen plains','Opaline terraces','Pearl survey mast','Prism sanctuary'],
 ['vitria','Vitria','aster',1740,4.1,'#bba9c6','shard',320000,.7,15,'crystal','Violet glass ridges in brilliant starlight','Glass dune field','Shattered listening post','Violet chime'],
 ['cobalt','Cobalt','aster',2210,6.2,'#5c809b','basalt',760000,2.8,180,'cobalt','Blue metal cliffs and deep crater shelves','Cobalt staircase','Alloy survey tower','Magnetic gateway'],
 ['silva','Silva','aster',1380,1.8,'#d0dbe2','frost',1280000,4.8,0,'helium3','White spires and ancient ice faults','Silver ice maze','Ice-crusted relay','Frozen spectrum vault'],
 ['relic','Relic','abyss',1490,2.6,'#7b8095','basalt',280000,.6,0,'iridium','Ruined basalt shelves beneath the red disc','Tidal fracture field','Horizon listening station','Gravity scar'],
 ['veil','Veil','abyss',1830,3.8,'#749bb4','crystal',620000,2.5,160,'iridium','Blue crystal ravines catching the disc light','Blue glass canyon','Disc observatory','Lensing monolith'],
 ['hush','Hush','abyss',880,.65,'#b8c1cf','plon',1060000,4.6,0,'helium3','A frozen refuge at the edge of darkness','Quiet pressure plain','Black sky relay','Horizon archive'],
 ['arc','Arc','tempest',1320,2.9,'#7d85ac','iron',250000,.9,0,'cobalt','Charged metal ridges and radiation scars','Ion burn terraces','Pulse counter station','Blue arc resonator'],
 ['surge','Surge','tempest',1690,3.6,'#506c94','volcanic',560000,3.1,85,'iridium','Obsidian vents lit by the sweeping beacon','Charged basalt caldera','Storm survey bunker','Pulsar echo vault'],
 ['still','Still','tempest',1090,1.1,'#adc7dc','frost',980000,5,0,'helium3','Pale ice far beyond the strongest pulses','Irradiated ice ridges','Outer pulse relay','Stillwater antenna']
];
for(const [id,name,system,radius,gravity,color,theme,orbitRadius,phase,atmosphere,mineral,role,region,relay,artifact] of exoplanets){const star=BODIES[system];BODIES[id]={id,name,system,parent:system,radius,gravity,color,theme,orbitRadius,phase,atmosphere,mineral,role,region,relay,artifact,dust:atmosphere?[.3,.4,.53]:null,position:orbitPoint(star.position,orbitRadius,phase)};}
for(const spec of EXTRA_WORLDS){const parent=BODIES[spec.parent];BODIES[spec.id]={...spec,dust:spec.atmosphere?[.3,.4,.53]:null,position:orbitPoint(parent.position,spec.orbitRadius,spec.phase)};}
for(const [id,changes]of Object.entries(REWORKED_WORLDS))Object.assign(BODIES[id],changes);
for(const spec of OUTER_WORLDS){if(BODIES[spec.id]||!BODIES[spec.parent])throw Error('Invalid outer world '+spec.id);const body={...spec,dust:spec.atmosphere?[.3,.4,.53]:null};BODIES[spec.id]=body;body.position=body.orbit?ellipticalPoint(body,body.phase):orbitPoint(BODIES[body.parent].position,body.orbitRadius,body.phase);}
for(const b of Object.values(BODIES))b.category??=b.star?'star':b.giant?'gas-giant':b.orbit?'dwarf':BODIES[b.parent]?.star?'terrestrial':'moon';
BODIES.brontes.role='Cream and copper cloud belts, a vast spiral storm and fine tilted rings';
for(const [id,theme]of Object.entries(SYSTEM_THEMES)){Object.assign(SYSTEMS[id],theme);const reach=b=>!b.parent||b.star?0:(b.orbit?b.orbit.semiMajorAxis*(1+b.orbit.eccentricity):b.orbitRadius)+reach(BODIES[b.parent]);SYSTEMS[id].extent=Math.max(...Object.values(BODIES).filter(b=>b.system===id&&!b.star).map(b=>reach(b)+b.radius*3));}
if(REAL_SOLAR){const real=createRealSolarSystem();for(const id of Object.keys(BODIES))delete BODIES[id];for(const id of Object.keys(SYSTEMS))delete SYSTEMS[id];Object.assign(BODIES,real.bodies);Object.assign(SYSTEMS,real.systems);}
export const SYSTEM_EXTENT=SYSTEMS[HOME_SYSTEM].extent;
export const BODY_IDS=Object.keys(BODIES),GRAVITY_IDS=BODY_IDS.filter(id=>!BODIES[id].star),LANDABLE_IDS=GRAVITY_IDS.filter(id=>!BODIES[id].giant);
export const systemBodies=id=>BODY_IDS.filter(key=>BODIES[key].system===id);
export function bodyClass(id){const b=typeof id==='string'?BODIES[id]:id;return {'gas-giant':'Gas giant','ice-giant':'Ice giant',dwarf:'Dwarf planet',moon:'Moon',terrestrial:'Rocky planet',star:'Star'}[b?.category]||'World';}
export function systemSurvey(id){const bodies=systemBodies(id).map(key=>BODIES[key]).filter(b=>!b.star);return {bodies:bodies.length,landable:bodies.filter(b=>b.landable).length,giants:bodies.filter(b=>b.giant).length,moons:bodies.filter(b=>b.category==='moon').length,dwarfs:bodies.filter(b=>b.category==='dwarf').length};}
export function systemAt(position){let nearest=HOME_SYSTEM,distance=Infinity;for(const s of Object.values(SYSTEMS)){const p=BODIES[s.star].position,d=Math.hypot(...position.map((x,i)=>x-p[i]));if(d<distance){nearest=s.id;distance=d;}}return nearest;}
for(const b of Object.values(BODIES)){b.landable=LANDABLE_IDS.includes(b.id);b.mu=(b.gravity||50)*b.radius**2;}
export function orbitPath(body,count=192){if(!body.parent)return [];if(body.orbit)return Array.from({length:count},(_,i)=>ellipticalPoint(body,i/count*Math.PI*2));const parent=BODIES[body.parent];if(body.id==='luma'){const relative=body.position.map((x,i)=>x-parent.position[i]),a=relative.map(x=>x/body.orbitRadius),b=[a[2],0,-a[0]],len=Math.hypot(...b);return Array.from({length:count},(_,i)=>parent.position.map((x,j)=>x+body.orbitRadius*(a[j]*Math.cos(i/count*Math.PI*2)+b[j]/len*Math.sin(i/count*Math.PI*2))));}return Array.from({length:count},(_,i)=>orbitPoint(parent.position,body.orbitRadius,i/count*Math.PI*2));}
