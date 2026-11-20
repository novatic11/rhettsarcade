import {starterBlueprint,sanitizeBlueprint} from './blueprints.js';
const clone=bp=>JSON.parse(JSON.stringify(bp));
const part=(id,type,parent,node='bottom',stage=0,angle=0)=>({id,type,parent,node,stage,angle});
function lander(){const bp=starterBlueprint();bp.name='Survey Lander';bp.parts.push(part('seismic','seismometer','fuel','radial',0,0),part('air','atmosphere','fuel','radial',0,Math.PI));return bp;}
function courier(){const bp=starterBlueprint();bp.name='Cargo Courier';bp.parts.find(p=>p.id==='fuel').parent='bay2';bp.parts.push(part('bay2','cargo','bay'));return bp;}
function scout(){return {name:'Orbital Scout',parts:[part('core','probe',null,'root'),part('fuel','tank','core'),part('main','vacuumEngine','fuel'),part('science','experiment','fuel','radial',0,0),part('wing0','solar','core','radial',0,Math.PI/2),part('wing1','solar','core','radial',0,-Math.PI/2)]};}
function voyager(){const bp=lander();bp.name='Deep Space Voyager';bp.parts.find(p=>p.id==='main').type='vacuumEngine';bp.parts.find(p=>p.id==='main').parent='reserve';bp.parts.push(part('reserve','longTank','fuel'));return bp;}
function lifter(){return {name:'Two Stage Explorer',parts:[part('core','capsule',null,'root'),part('bay','cargo','core'),part('upper','tank','bay'),part('upper-engine','vacuumEngine','upper','bottom',1),part('separator','separator','upper-engine','bottom',1),part('lower','wideTank','separator'),part('main','engine','lower'),...Array.from({length:4},(_,i)=>({...part('leg'+i,'legs','upper-engine','radial',1,i*Math.PI/2),group:'landing-legs'})),part('spectrum','experiment','bay','radial',0,Math.PI/2),part('seismic','seismometer','upper','radial',0,0),part('air','atmosphere','upper','radial',0,Math.PI),part('wing','solar','core','radial',0,0),part('cell','battery','core','radial',0,Math.PI)]};}
export const SHIP_PRESETS=[
 {id:'surveyor',name:'Survey Lander',description:'Crewed lander · all three science instruments',design:lander()},
 {id:'scout',name:'Orbital Scout',description:'Light probe · orbital spectrometer · solar wings',design:scout()},
 {id:'courier',name:'Cargo Courier',description:'Crewed hauler · 240 kg of cargo bays',design:courier()},
 {id:'voyager',name:'Deep Space Voyager',description:'Long range · vacuum engine · full science suite',design:voyager()},
 {id:'explorer',name:'Two Stage Explorer',description:'Stage 0 launch · stage 1 separate and ignite',design:lifter()}
];
export function presetBlueprint(id){const preset=SHIP_PRESETS.find(p=>p.id===id);return preset?sanitizeBlueprint(clone(preset.design)):null;}
