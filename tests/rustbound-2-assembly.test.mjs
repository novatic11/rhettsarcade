import test from 'node:test';import assert from 'node:assert/strict';
import {AssemblyEditor,branchIds,openSockets,sanitizeSubassembly,stageReport} from '../public/games/rustbound-2/assembly-editor.js';
import {PARTS,FlightVehicle,assemblyLayout,sanitizeBlueprint,blueprintStats,starterBlueprint} from '../public/games/rustbound-2/blueprints.js';
import {Campaign} from '../public/games/rustbound-2/expedition.js';
import {presetBlueprint} from '../public/games/rustbound-2/ship-presets.js';
const core=()=>({name:'Test rocket',parts:[{id:'core',type:'capsule',parent:null,node:'root',stage:0}]});
const close=(a,b)=>assert(Math.abs(a-b)<1e-7,a+' versus '+b);
test('picked-up stack parts insert at occupied nodes and complete branch moves are atomic and undoable',()=>{
 const e=new AssemblyEditor(starterBlueprint()),before=structuredClone(e.design),preview=e.preview({type:'tank'},{parent:'fuel',node:'bottom'},{symmetry:8});assert.deepEqual(e.design,before);assert.equal(preview.added.length,1);
 const placed=e.place({type:'tank'},{parent:'fuel',node:'bottom'},{symmetry:8});assert.equal(e.design.parts.find(p=>p.id==='main').parent,placed.selected);assert.equal(sanitizeBlueprint(e.design).parts.length,e.design.parts.length);assert(e.undo());assert.deepEqual(e.design,before);
 const history=e.undoStack.length;assert.throws(()=>e.place({id:'fuel'},{parent:'main',node:'bottom'}),/itself/);assert.equal(e.undoStack.length,history);assert.deepEqual(e.design,before);
 e.place({id:'science'},{parent:'fuel',node:'radial',angle:1,offset:[0,.6,0]});assert.equal(e.design.parts.filter(p=>p.id==='science').length,1);assert(e.undo());assert.deepEqual(e.design,before);
});
test('radial and mirror symmetry create unique complete branches, including eight-fold symmetry',()=>{
 const e=new AssemblyEditor(core()),r=e.place({type:'solar'},{parent:'core',node:'radial',angle:0},{symmetry:8}),layout=assemblyLayout(e.design),parts=r.added.map(id=>layout.find(p=>p.id===id));assert.equal(parts.length,8);close(parts.reduce((n,p)=>n+p.x,0),0);close(parts.reduce((n,p)=>n+p.z,0),0);assert.equal(new Set(e.design.parts.map(p=>p.id)).size,9);
 const mirror=new AssemblyEditor(core()),pair=mirror.place({type:'booster'},{parent:'core',node:'radial',angle:Math.PI/2},{symmetry:2,mirror:true}),a=assemblyLayout(mirror.design).find(p=>p.id===pair.added[0]),b=assemblyLayout(mirror.design).find(p=>p.id===pair.added[1]);close(a.x,-b.x);close(a.z,b.z);
 const copy=mirror.place({id:pair.selected,copy:true},{parent:'core',node:'radial',angle:0,offset:[0,4,0]},{symmetry:2});assert.equal(copy.added.length,2);assert.equal(mirror.design.parts.length,5);
});
test('offset and rotation propagate through children; re-root preserves the complete craft shape',()=>{
 const e=new AssemblyEditor(presetBlueprint('surveyor'));e.transform('fuel','rotation',[.15,.2,.1]);e.transform('fuel','offset',[.2,.1,-.3]);const before=assemblyLayout(e.design),lengths=new Map(before.map(a=>[a.id,Object.fromEntries(before.map(b=>[b.id,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)]))]));
 assert(before.every(p=>p.quaternion.every(Number.isFinite)));assert(e.reroot('fuel'));assert.equal(e.design.parts.find(p=>p.parent===null).id,'fuel');const after=assemblyLayout(e.design);for(const a of after)after.forEach((b,i)=>close(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),lengths.get(a.id)[b.id]));assert.equal(sanitizeBlueprint(e.design).parts.length,before.length);assert(e.undo());
});
test('fuel loads, crossfeed, priorities, thrust limiters and engine rotations affect real performance',()=>{
 const bp={name:'Fuel path',parts:[{id:'c',type:'capsule',parent:null,node:'root',stage:0},{id:'t1',type:'tank',parent:'c',node:'bottom',stage:0,fill:.5,priority:10},{id:'t2',type:'tank',parent:'t1',node:'bottom',stage:0},{id:'e',type:'engine',parent:'t2',node:'bottom',stage:0,thrustLimit:.5}]},v=new FlightVehicle(bp);assert.equal(v.fuel.t1,250);assert.equal(v.stats().thrust,15000);v.fire(10,1);assert(v.fuel.t1<250);assert.equal(v.fuel.t2,500);const full=blueprintStats({...bp,parts:bp.parts.map(p=>({...p,fill:1,thrustLimit:1}))});assert(full.mass>v.stats().mass);assert(full.thrust>v.stats().thrust);
 const cut=structuredClone(bp);cut.parts.find(p=>p.id==='e').crossfeed=false;assert.equal(new FlightVehicle(cut).stats().thrust,0);const tilted=structuredClone(bp);tilted.parts.find(p=>p.id==='e').rotation=[0,0,Math.PI/2];assert(Math.abs(new FlightVehicle(tilted).stats().thrustDirection[0])>.99);
});
test('staging supports empty stages, persistent ignitions and radial jettison; subassemblies survive saves',()=>{
 const e=new AssemblyEditor(core()),sep=e.place({type:'radialSeparator'},{parent:'core',node:'radial',angle:Math.PI/2}).selected;
 e.place({type:'booster'},{parent:sep,node:'radial',angle:0});e.addStage();assert.equal(e.design.stageCount,3);assert.equal(stageReport(e.design,5.4).length,3);const v=new FlightVehicle(e.design);assert(v.activateNext());assert(v.removed.has(sep));assert.equal(v.removed.size,2);
 const a=sanitizeSubassembly(e.payload(sep));assert(a);const c=new Campaign();c.subassemblies=[a];const saved=new Campaign(c.snapshot());assert.equal(saved.subassemblies[0].parts.length,2);assert.equal(saved.subassemblies[0].parts[0].type,'radialSeparator');assert.equal(new AssemblyEditor(core()).place({assembly:saved.subassemblies[0]},{parent:'core',node:'radial',angle:1}).added.length,2);
});
test('malformed transforms are bounded and incomplete vectors cannot produce invalid geometry',()=>{
 const raw=core();raw.parts.push({id:'t',type:'tank',parent:'core',node:'bottom',offset:[Infinity],rotation:[NaN],fill:-4,thrustLimit:8});const bp=sanitizeBlueprint(raw);assert.equal(bp.parts[1].fill,0);assert.equal(bp.parts[1].thrustLimit,1);assert(assemblyLayout(bp).every(p=>[p.x,p.y,p.z,...p.quaternion].every(Number.isFinite)));
});
test('attachment sockets exclude occupied incoming joints and surface-only hardware',()=>{
 const bp=starterBlueprint(),sockets=openSockets(bp);assert(sockets.some(s=>s.parent==='main'&&s.node==='bottom'));assert(!sockets.some(s=>s.parent==='main'&&s.node==='top'));assert(!sockets.some(s=>s.parent==='science'));
 const e=new AssemblyEditor(core()),pair=e.place({type:'booster'},{parent:'core',node:'radial',angle:Math.PI/2},{symmetry:2}),before=assemblyLayout(e.design);e.transform(pair.selected,'offset',[.4,.6,0]);const after=assemblyLayout(e.design),deltas=pair.added.map(id=>after.find(p=>p.id===id)).map(p=>{const a=before.find(q=>q.id===p.id);const root=after.find(q=>q.id==='core'),old=before.find(q=>q.id==='core');return [p.x-a.x-root.x+old.x,p.y-a.y-root.y+old.y,p.z-a.z-root.z+old.z];});close(deltas[0][0],-deltas[1][0]);close(deltas[0][1],.6);close(deltas[1][1],.6);
});
