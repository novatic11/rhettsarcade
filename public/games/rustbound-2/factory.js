import {CONTENT_TYPES,CONTENT_RECIPES,CONTENT_ORDERS} from './content.js';
export const FACTORY_TYPES={fabricator:{name:'Fabricator',radius:3.5,demand:10,cost:450,description:'Make components, electronics and advanced alloy from mined materials. Choose a recipe, then pipe in its ingredients.'},cryoplant:{name:'Cryo Plant',radius:3.5,demand:14,cost:350,description:'Turn mined ice and Helium-3 into rocket propellant. Pipe FUEL OUT into a Refueler’s fuel inlet.'},reactor:{name:'Fusion Reactor',radius:3.5,cost:900,description:'Up to 90 energy/s, day or night. Uses 0.02 Helium-3 and 0.04 ice per second at full output. Automatically throttles to demand and battery space.'},...CONTENT_TYPES};
export const RECIPES={
 ...CONTENT_RECIPES,
 components:{name:'Mechanical components',machine:'fabricator',seconds:6,input:{alloy:2,iron:1},output:{components:1}},
 electronics:{name:'Control electronics',machine:'fabricator',seconds:8,input:{copper:1,crystal:1},output:{electronics:1}},
 alloy:{name:'Cobalt-strengthened alloy',machine:'fabricator',seconds:5,input:{iron:3,cobalt:1},output:{alloy:2}},
 precision:{name:'Precision components',machine:'fabricator',seconds:8,input:{alloy:2,iridium:1},output:{components:3}},
 iceFuel:{name:'Ice propellant',machine:'cryoplant',seconds:6,input:{ice:2},output:{fuel:40}},
 heliumFuel:{name:'Helium-rich propellant',machine:'cryoplant',seconds:10,input:{helium3:1,ice:1},output:{fuel:100}}
};
export const recipeFor=(type,id)=>RECIPES[id]?.machine===type?RECIPES[id]:Object.values(RECIPES).find(r=>r.machine===type);
export const recipeId=(type,id)=>RECIPES[id]?.machine===type?id:Object.keys(RECIPES).find(k=>RECIPES[k].machine===type)||null;
export const recipeText=r=>Object.entries(r.input).map(([k,n])=>n+' '+k).join(' + ')+' → '+Object.entries(r.output).map(([k,n])=>n+' '+k).join(' + ')+' / '+r.seconds+'s';
export function runRecipe(state,recipe,seconds,rate=1){const cap=recipe.machine==='cryoplant'?600:60;let batches=seconds*rate/recipe.seconds;for(const [key,n] of Object.entries(recipe.input))batches=Math.min(batches,state.input[key]/n);batches=Math.min(batches,Math.max(0,cap-Object.values(state.output).reduce((a,v)=>a+v,0))/Object.values(recipe.output).reduce((a,v)=>a+v,0));if(!(batches>0))return 0;for(const [k,n] of Object.entries(recipe.input))state.input[k]=Math.max(0,state.input[k]-n*batches);let total=0;for(const [k,n] of Object.entries(recipe.output)){state.output[k]+=n*batches;total+=n*batches;}state.produced+=total;return total;}
export const UPGRADE_TYPES=[...Object.keys(CONTENT_TYPES).filter(k=>CONTENT_TYPES[k].demand),'drill','gaswell','refinery','refueler','fabricator','cryoplant'];
export const upgradeCost=level=>level===0?{alloy:6,components:2}:{alloy:12,components:4,electronics:2};
export const SUPPLY_ORDERS=[
 {id:'workshop',name:'A working workshop',cost:{alloy:10,components:3},reward:1000},
 {id:'controls',name:'Flight control systems',cost:{electronics:6,components:3},reward:1700},
 {id:'fleet',name:'Colony fleet supply',cost:{alloy:25,components:8,electronics:4},reward:2800},
 {id:'precision',name:'Precision instrument order',cost:{iridium:4,components:8,electronics:6},reward:3600},
 ...CONTENT_ORDERS
];
export function rolloutMaterials(bp){return {alloy:Math.max(2,Math.ceil(bp.parts.length*.45)),components:Math.max(1,Math.ceil(bp.parts.length/6)),electronics:1};}
