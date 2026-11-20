import {PARTS,BlueprintEditor,assemblyLayout,sanitizeBlueprint,blueprintStats,FlightVehicle} from './blueprints.js';
import {qEuler,qMul,qInverse,qVector,qAngles,position,sub} from './craft-math.js';
const clone=x=>JSON.parse(JSON.stringify(x)),TAU=Math.PI*2;
export function branchIds(design,id,group=false){const p=design.parts.find(p=>p.id===id),ids=new Set(design.parts.filter(q=>q.id===id||group&&p?.group&&q.group===p.group).map(q=>q.id));let changed=true;while(changed){changed=false;for(const q of design.parts)if(ids.has(q.parent)&&!ids.has(q.id)){ids.add(q.id);changed=true;}}return ids;}
export function openSockets(design,exclude=new Set()){
 const layout=assemblyLayout(design),list=[];
 for(const p of layout){if(exclude.has(p.id)||PARTS[p.type].radial&&p.type!=='booster')continue;const d=PARTS[p.type];for(const node of ['top','bottom'])if(!(p.parent&&(p.node==='bottom'&&node==='top'||p.node==='top'&&node==='bottom'))&&!design.parts.some(c=>!exclude.has(c.id)&&c.parent===p.id&&c.node===node))list.push({parent:p.id,node,point:position(p).map((v,i)=>v+qVector(p.quaternion,[0,(node==='top'?1:-1)*(d.height/2+.035),0])[i])});}
 return list;
}
export function sanitizeSubassembly(raw){if(!raw||!Array.isArray(raw.parts)||!raw.parts.length||raw.parts.length>59)return null;const root=raw.parts.find(p=>p.parent===null);if(!root)return null;const id='subassembly-validation-core';if(raw.parts.some(p=>p.id===id))return null;const bp=sanitizeBlueprint({name:raw.name,parts:[{id,type:'probe',parent:null,node:'root',stage:0},...raw.parts.map(p=>({...p,parent:p.id===root.id?id:p.parent}))]});if(bp.parts.length!==raw.parts.length+1||bp.parts[0].id!==id)return null;return {name:bp.name,parts:bp.parts.filter(p=>p.id!==id).map(p=>({...p,parent:p.parent===id?null:p.parent}))};}
export class AssemblyEditor extends BlueprintEditor{
 roots(id){const p=this.design.parts.find(p=>p.id===id);return this.design.parts.filter(q=>q.id===id||p?.group&&q.group===p.group);}
 payload(id){const ids=branchIds(this.design,id),parts=this.design.parts.filter(p=>ids.has(p.id)).map(p=>({...clone(p),parent:p.id===id?null:p.parent}));if(parts[0]?.id!==id)parts.sort((a,b)=>a.id===id?-1:b.id===id?1:0);return {name:PARTS[parts[0].type].name+' assembly',parts};}
 preview(held,target,{symmetry=1,mirror=false}={}){
  if(!target||!this.design.parts.some(p=>p.id===target.parent))throw Error('Move over a stack node or a surface to attach.');
  const bp=clone(this.design),original=held.id&&this.design.parts.find(p=>p.id===held.id);
  if(original?.parent===null&&!held.copy)throw Error('The root anchors the craft. Choose another part or use Re-root.');
  const moving=original&&!held.copy?branchIds(bp,held.id,true):new Set();if(moving.has(target.parent))throw Error('A branch cannot attach to itself.');
  let payload=held.assembly|| (original?this.payload(held.id):{parts:[{id:'held',type:held.type,parent:null,node:'root',stage:PARTS[held.type]?.separates?1:0,fill:1,...(PARTS[held.type]?.separates?{crossfeed:false}:{})}]});
  if(!payload.parts?.length)throw Error('Choose a part first.');const root=payload.parts.find(p=>p.parent===null)||payload.parts[0];
  const count=target.node==='radial'?Math.max(1,Math.min(8,Math.floor(symmetry))):1;
  if(bp.parts.length-moving.size+payload.parts.length*count>60)throw Error('Craft limit: 60 parts. Reduce symmetry or remove a branch.');
  bp.parts=bp.parts.filter(p=>!moving.has(p.id));const added=[],group='g'+this.serial;
  for(let i=0;i<count;i++){
   const ids=new Map(payload.parts.map((p,j)=>[p.id,original&&!held.copy&&i===0?p.id:'p'+(this.serial+i*payload.parts.length+j+1)]));
   for(const p of payload.parts){const q=clone(p);q.id=ids.get(p.id);q.parent=p.id===root.id?target.parent:ids.get(p.parent);if(p.id===root.id){q.node=target.node;const base=mirror&&Math.abs(Math.sin(target.angle||0))<.15?Math.PI/2:(target.angle||0);q.angle=target.node==='radial'&&mirror&&i%2?-base:base+i*TAU/count;q.offset=[...(target.offset||[0,0,0])];q.rotation=[...(held.rotation||q.rotation||[0,0,0])];if(count>1){q.group=group;q.mirror=mirror;}else delete q.group;}else if(q.group)q.group=group+'-'+i+'-'+q.group;bp.parts.push(q);added.push(q.id);}
  }
  if(target.node!=='radial'){const existing=bp.parts.find(p=>p.parent===target.parent&&p.node===target.node&&!added.includes(p.id));if(existing){let endpoint=bp.parts.find(p=>p.id===added[0]),child;while((child=bp.parts.find(p=>added.includes(p.id)&&p.parent===endpoint.id&&p.node===target.node)))endpoint=child;existing.parent=endpoint.id;}}
  const checked=sanitizeBlueprint(bp);if(checked.parts.length!==bp.parts.length||checked.parts.some((p,i)=>p.id!==bp.parts[i].id))throw Error('This attachment would break the craft tree.');
  return {design:checked,added,selected:added[0]};
 }
 place(held,target,options){const result=this.preview(held,target,options);this.change(bp=>Object.assign(bp,result.design));this.serial+=result.added.length+2;return result;}
 transform(id,field,value,group=true){const p=this.design.parts.find(p=>p.id===id);if(!p)return;const origin=[...(p.offset||[0,0,0])];this.change(bp=>{for(const q of bp.parts.filter(q=>q.id===id||group&&p.group&&q.group===p.group)){if(field==='offset'){const delta=value.map((v,i)=>v-origin[i]),rot=qVector(qEuler([0,(q.angle||0)-(p.angle||0),0]),delta);q.offset=(q.offset||[0,0,0]).map((v,i)=>v+rot[i]);}else if(field==='rotation')q.rotation=[...value];else q[field]=value;}Object.assign(bp,sanitizeBlueprint(bp));});}
 reroot(id){const layout=assemblyLayout(this.design),points=new Map(layout.map(p=>[p.id,p])),root=this.design.parts.find(p=>p.id===id);if(!root||root.parent===null)return false;const path=[];let p=root;while(p){path.push(p.id);p=this.design.parts.find(q=>q.id===p.parent);}this.change(bp=>{for(let i=0;i<path.length;i++){const p=bp.parts.find(q=>q.id===path[i]),old=points.get(p.id);delete p.group;if(i===0){p.parent=null;p.node='root';p.angle=0;p.offset=[0,0,0];p.rotation=qAngles(old.quaternion);}else{const parent=points.get(path[i-1]),delta=qVector(qInverse(parent.quaternion),sub(position(old),position(parent)));p.parent=parent.id;p.node='radial';p.angle=0;p.offset=[delta[0],delta[1],delta[2]-PARTS[parent.type].radius-PARTS[p.type].radius-.075];p.rotation=qAngles(qMul(qInverse(parent.quaternion),old.quaternion));}}});return true;}
 addStage(){const count=Math.max(this.design.stageCount||1,1+Math.max(...this.design.parts.map(p=>p.stage)));if(count>=9)throw Error('Maximum: 9 stages.');this.change(bp=>bp.stageCount=count+1);}
 removeStage(index){const count=Math.max(this.design.stageCount||1,1+Math.max(...this.design.parts.map(p=>p.stage)));if(count<=1)return;this.change(bp=>{for(const p of bp.parts)if(p.stage>=index)p.stage=Math.max(0,p.stage-1);bp.stageCount=count-1;});}
 remove(id){const ids=branchIds(this.design,id,true);if(!this.design.parts.some(p=>!ids.has(p.id)&&PARTS[p.type].command))throw Error('Keep at least one command module.');return super.remove(id);}
 shiftStage(index,delta){if(index+delta<0||index+delta>8)return;this.change(bp=>{for(const p of bp.parts){if(p.stage===index)p.stage=index+delta;else if(p.stage===index+delta)p.stage=index;}});}
}
export function stageReport(design,gravity){const flight=new FlightVehicle(design),result=[];for(let stage=0;stage<Math.max(design.stageCount||1,1+Math.max(...design.parts.map(p=>p.stage)));stage++){const stats=flight.stats(gravity);result.push({stage,...stats});if(!flight.activateNext())break;}return result;}
