import {chargeShip} from './rb2-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/games/rustbound-2/vendor/three.module.js';
import {Demo,BODIES,LANDABLE_IDS} from '../public/games/rustbound-2/world.js';
import {Campaign} from '../public/games/rustbound-2/expedition.js';
import {BlueprintEditor,FlightVehicle,assemblyLayout,starterBlueprint,blueprintStats} from '../public/games/rustbound-2/blueprints.js';
import {rolloutMaterials} from '../public/games/rustbound-2/factory.js';
import {SHIP_PRESETS} from '../public/games/rustbound-2/ship-presets.js';
import {builtShipModel} from '../public/games/rustbound-2/ship-models.js';
import {Shipyard} from '../public/games/rustbound-2/shipyard.js';
import {stationAssembly} from '../public/games/rustbound-2/station-assembly.js';
import {followSpotlight,targetRect,buildTutorialAction,wireTutorialAction,ventTutorialFuel} from '../public/games/rustbound-2/tutorial-ui.js';
import {autopilotWarp} from '../public/games/rustbound-2/flight-warp.js';
import {groundPoint,add} from '../public/games/rustbound-2/world.js';

test('station skin is one closed surface with valid selection owners and unchanged logical placement',()=>{
 const d=new Demo();d.campaign.money=1e5;const s=d.campaign.stations.create('cinder').station;d.campaign.stations.starterPlan(s.id);const before=structuredClone(s.modules),a=stationAssembly(s),g=a.hull.geometry;
 assert(g.index.count>0);assert.equal(a.hull.userData.pressureOwners.length,g.index.count/3);assert(a.hull.userData.pressureOwners.every(id=>s.modules.some(n=>n.id===id)));
 for(const attr of Object.values(g.attributes))assert([...attr.array].every(Number.isFinite));
 const edges=new Map();for(let i=0;i<g.index.count;i+=3){const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];for(let j=0;j<3;j++){const edge=[tri[j],tri[(j+1)%3]].sort((a,b)=>a-b).join(',');edges.set(edge,(edges.get(edge)||0)+1);}}
 assert([...edges.values()].every(n=>n===2),'no holes or doubled internal faces');assert.deepEqual(s.modules,before);
 for(const {node,model} of a.models)assert.deepEqual(model.root.position.toArray(),node.cell.map(n=>n*12));
 const ray=new T.Raycaster(new T.Vector3(6,10,0),new T.Vector3(0,-1,0));a.root.updateMatrixWorld(true);assert(ray.intersectObject(a.hull).length,'continuous full-width bridge at the old module gap');a.dispose();a.dispose();
});
test('ship joined skins preserve transforms, selectable parts, engine motion and staging',()=>{
 const design=SHIP_PRESETS.find(p=>p.id==='explorer').design,layout=assemblyLayout(design),a=builtShipModel(layout);assert(a.root.userData.hullJoins>0);
 for(const p of layout){const model=a.root.children.find(x=>x.userData.partId===p.id);assert.deepEqual(model.position.toArray(),[p.x,p.y,p.z]);}
 a.update(.05,{burn:1,gimbal:[.04,-.04],time:20});a.root.traverse(o=>{if(o.geometry)for(const attr of Object.values(o.geometry.attributes))assert([...attr.array].every(Number.isFinite));if(o.userData.hullJoin)assert(o.userData.partId);});
 const stage=new FlightVehicle(design);stage.activateNext();const b=builtShipModel(stage.layout.filter(p=>!stage.removed.has(p.id)));b.root.traverse(o=>{if(o.userData.connectsTo)assert(!stage.removed.has(o.userData.connectsTo));});a.dispose();b.dispose();
});
test('tutorial actions progress from toolbar to card, cursor, and exact connection controls',()=>{
 assert.equal(buildTutorialAction('solar',{buildOpen:false}).target,'#build-toggle');assert.equal(buildTutorialAction('solar',{buildOpen:true,cardVisible:true}).target,'[data-build="solar"]');assert.deepEqual(buildTutorialAction('solar',{placing:true,pointer:{x:300,y:200}}).target,{x:300,y:200});
 const p={source:'sun/power',destination:'drill/power',sourceName:'Solar',destinationName:'Drill'};assert.equal(wireTutorialAction(p).target,'#colony-open');p.open=true;assert.equal(wireTutorialAction(p).target,'[data-network="power"]');p.mode='power';assert.equal(wireTutorialAction(p).target,'#connection-editor summary');p.expanded=true;assert.equal(wireTutorialAction(p).target,'#connection-from');p.from=p.source;assert.equal(wireTutorialAction(p).target,'#connection-to');p.to=p.destination;assert.equal(wireTutorialAction(p).target,'#connect-lists');
});
test('spotlight tracks moving controls and scroll clipping, hides missing targets, and never chases its own card',()=>{
 const saved=Object.fromEntries(['document','innerWidth','innerHeight','getComputedStyle'].map(k=>[k,globalThis[k]]));try{
  globalThis.innerWidth=1024;globalThis.innerHeight=600;globalThis.getComputedStyle=e=>e.css||{display:'block',visibility:'visible',overflowX:'visible',overflowY:'visible'};
  let r={left:100,top:400,right:180,bottom:440,width:80,height:40};const el={closest:()=>null,parentElement:null,getBoundingClientRect:()=>r,scrollIntoView:()=>{}},spot={style:{}},prompt={style:{},offsetHeight:140,contains:()=>false};globalThis.document={querySelector:()=>el};
  followSpotlight(spot,prompt,'#control');assert.equal(spot.style.left,'140px');r={left:500,top:300,right:580,bottom:340,width:80,height:40};followSpotlight(spot,prompt,'#control');assert.equal(spot.style.left,'540px');assert.equal(spot.style.top,'320px');
  const top=prompt.style.top;prompt.contains=()=>true;followSpotlight(spot,prompt,'#control');assert.equal(prompt.style.top,top);
  el.parentElement={parentElement:null,css:{overflowX:'auto',overflowY:'hidden'},getBoundingClientRect:()=>({left:520,top:300,right:560,bottom:340})};assert.equal(targetRect(el).width,40);el.closest=()=>({hidden:true});followSpotlight(spot,prompt,'#control');assert(spot.hidden);
 }finally{for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('full-tank fuel test works on displayed step7 and never vents solid boosters',()=>{
 const d=new Demo();d.campaign.progress.tutorial={status:'active',step:7};assert(ventTutorialFuel(d).ok);assert.equal(d.fuel,98);d.vehicle=new FlightVehicle(starterBlueprint());const e=new BlueprintEditor(d.vehicle.blueprint);e.add('booster','fuel','radial',1);d.vehicle=new FlightVehicle(e.design);const booster=d.vehicle.blueprint.parts.find(p=>p.type==='booster'),before=d.vehicle.fuel[booster.id];assert(ventTutorialFuel(d).ok);assert.equal(d.vehicle.fuel[booster.id],before);d.mode='flight';assert(!ventTutorialFuel(d).ok);
});
test('stack parts use one slot at the limit regardless of radial symmetry selection',()=>{
 const parts=[{id:'core',type:'capsule',parent:null,node:'root',stage:0},...Array.from({length:58},(_,i)=>({id:'tank'+i,type:'tank',parent:i?'tank'+(i-1):'core',node:'bottom',stage:0}))];
 for(const symmetry of [2,4]){const e=new BlueprintEditor({name:'Long craft',parts});assert.equal(e.add('engine','tank57','bottom',symmetry).length,1);assert.equal(e.design.parts.length,60);}
 const e=new BlueprintEditor({name:'Long craft',parts});assert.throws(()=>e.add('solar','core','radial',2),/60/);assert.equal(e.design.parts.length,59);
});
test('rollout checks actual launch world and actual orbital stock while previews remain informative',()=>{
 const d=new Demo(),e=new BlueprintEditor(SHIP_PRESETS.find(p=>p.id==='voyager').design);e.add('cargo','core','bottom',1);e.add('cargo','core','bottom',1);assert(blueprintStats(e.design,BODIES.cinder.gravity).twr>1);assert(blueprintStats(e.design,BODIES.ferrum.gravity).twr<1);d.campaign.money=1e5;
 const elements=new Map(),get=q=>{if(!elements.has(q))elements.set(q,{value:'',checked:false});return elements.get(q);};get('#yard-world').value='ferrum';const ui={staging(){},campaign:d.campaign,editor:e,body:'cinder',$:get,element:{querySelectorAll:()=>[]},orbitalStation:null};Shipyard.prototype.stats.call(ui);assert.equal(get('#yard-deploy').disabled,false);
 ui.orbitalStation={stock:rolloutMaterials(e.design)};get('#yard-materials').checked=true;Shipyard.prototype.stats.call(ui);assert.equal(get('#yard-deploy').disabled,false);ui.orbitalStation.stock={};Shipyard.prototype.stats.call(ui);assert.equal(get('#yard-deploy').disabled,true);
});
test('only Cinder and Luma start with bases; untouched legacy colonies clear while built or stocked saves survive',()=>{
 const c=new Campaign();assert.deepEqual(LANDABLE_IDS.filter(id=>c.hasBase(id)),['cinder','luma']);assert(!c.bases.cinder.buildings.some(b=>b.type==='solar'));assert(c.bases.luma.buildings.some(b=>b.type==='solar'));assert(!c.roverAvailable('ferrum'));
 const raw=c.snapshot();delete raw.starterBasePolicy;raw.bases.ferrum.buildings=[{id:'ferrum-science',type:'science',x:-16,z:12,yaw:0},{id:'ferrum-warehouse',type:'warehouse',x:-19,z:-15,yaw:0}];assert.equal(new Campaign(raw).bases.ferrum.buildings.length,0);
 raw.bases.ferrum.buildings.push({id:'ferrum-build-88',type:'drill',x:30,z:20,paid:100});assert.equal(new Campaign(raw).bases.ferrum.buildings.length,3);raw.bases.ferrum.buildings.pop();raw.bases.ferrum.ore.iron=4;assert.equal(new Campaign(raw).bases.ferrum.buildings.length,2);
 assert.deepEqual(new Campaign(c.snapshot()).snapshot().bases,c.snapshot().bases);
});
test('accelerated guidance reaches Luma with intact hull and real fuel while slowing at the final approach',()=>{
 const d=new Demo();chargeShip(d);assert(d.travelTo('luma'));let max=1,frames=0;
 for(;frames<6000&&d.mode==='flight';frames++){
  if(d.landing){d.resolveLanding(true);continue;}
  const warp=autopilotWarp(d,288),seconds=Math.min(warp/60,12),steps=Math.ceil(seconds/.25);max=Math.max(max,warp);
  for(let i=0;i<steps;i++){d.step(seconds/steps);if(d.landing||!d.guidance||d.docking||autopilotWarp(d,288)<warp*.75)break;}
 }
 assert.equal(d.body,'luma');assert.equal(d.mode,'cockpit');assert.equal(d.power.integrity,100);assert(d.fuel<100&&d.fuel>90);assert(max>=240);assert(frames<3500);
 d.mode='flight';d.ship=groundPoint('luma',[0,1,0],3);d.guidance={kind:'travel',id:'luma',stage:'LANDING',waypoints:[],index:0};assert.equal(autopilotWarp(d),1);
 d.ship=add(BODIES.cinder.position,[0,BODIES.cinder.radius+200000,0]);d.guidance={kind:'travel',id:'luma',stage:'TRANSFER',waypoints:[],index:0};assert.equal(autopilotWarp(d),720);assert.equal(autopilotWarp(d,288),288);d.docking={};assert.equal(autopilotWarp(d),1);
});
