import * as T from './vendor/three.module.js';
import {BODIES,landingPoint,groundPoint,unit,sub,basis,add,mul,dot} from './world.js';
const V=a=>new T.Vector3(...a),Y=new T.Vector3(0,1,0);
const FEET={wind:[2.4,2.4],geothermal:[2.1,2.1],solarfarm:[4.7,2.6],megabattery:[2.5,2.2],smelter:[2.6,2.5],electronicsfab:[2.3,2.3],chemicalplant:[2.5,2.5],waterextractor:[1.9,1.8],oreseparator:[2.2,2.2],machineworks:[2.5,2.5],greenhouse:[2.6,2.6],observatory:[2.6,2.6],antimatterlab:[2.6,2.6],tradehub:[2.6,2.4],fabricator:[2.25,2.05],cryoplant:[2.25,2.05],reactor:[2.25,2.05],solar:[1.3,.9],drill:[1.45,1.3],refinery:[2.25,1.6],warehouse:[1.95,1.6],science:[2.10,1.85],hangar:[4.1,4.1],outpost:[2.7,2.2],gaswell:[1.6,1.4],refueler:[1.8,1.55],battery:[1.6,1.6],reservoir:[1.7,1.7],exporter:[1.7,1.55]};
export function buildingFrame(body,x,z,yaw=0,type='science'){
 const center=V(BODIES[body].position),base=V(landingPoint(body,x,z)),up=base.clone().sub(center).normalize(),{north,right}=basis(up.toArray()),r=V(right),n=V(north),feet=FEET[type]||FEET.science,span=Math.max(...feet,1);
 const sample=(dx,dz)=>{const p=base.clone().addScaledVector(r,dx).addScaledVector(n,dz);return V(groundPoint(body,p.sub(center).normalize().toArray()));};
 const slopeR=sample(span,0).sub(sample(-span,0)).dot(up)/(span*2),slopeN=sample(0,span).sub(sample(0,-span)).dot(up)/(span*2),wanted=up.clone().addScaledVector(r,-slopeR).addScaledVector(n,-slopeN).normalize();
 const angle=up.angleTo(wanted),limit=16*Math.PI/180,normal=angle>limit?up.clone().applyQuaternion(new T.Quaternion().setFromUnitVectors(up,wanted).slerp(new T.Quaternion(),1-limit/angle)):wanted;
 const quaternion=new T.Quaternion().setFromUnitVectors(Y,normal).multiply(new T.Quaternion().setFromAxisAngle(Y,yaw)),inverse=quaternion.clone().invert();
 const anchors=[];for(const a of [-1,1])for(const b of [-1,1])anchors.push(new T.Vector3(a*feet[0],0,b*feet[1]));if(type==='hangar')for(let i=0;i<8;i++)anchors.push(new T.Vector3(Math.cos(i*Math.PI/4)*6.55,0,Math.sin(i*Math.PI/4)*6.55));
 let lift=.045;for(const anchor of anchors){const p=anchor.clone().applyQuaternion(quaternion).add(base),ground=V(groundPoint(body,p.clone().sub(center).normalize().toArray()));lift=Math.max(lift,ground.sub(p).dot(normal)+.045);}
 const position=base.clone().addScaledVector(normal,lift),supports=anchors.map(top=>{const p=top.clone().applyQuaternion(quaternion).add(position),normal=unit(sub(p.toArray(),BODIES[body].position)),ground=V(groundPoint(body,normal));return {top:top.clone().setY(.13),bottom:ground.sub(position).applyQuaternion(inverse),normal:V(normal).applyQuaternion(inverse)};});
 return {position,quaternion,normal,lift,supports};
}
export function foundationModel(frame){
 const root=new T.Group();root.name='adjustable-terrain-footings';const steel=new T.MeshStandardMaterial({color:'#859799',metalness:.7,roughness:.5}),dark=new T.MeshStandardMaterial({color:'#2b373c',metalness:.35,roughness:.78});
 for(const {top,bottom,normal} of frame.supports){const gap=top.distanceTo(bottom);if(gap<.25)continue;const midpoint=top.clone().add(bottom).multiplyScalar(.5),shaft=new T.Mesh(new T.CylinderGeometry(.085,.11,gap+.06,10),steel);shaft.position.copy(midpoint);shaft.quaternion.setFromUnitVectors(Y,top.clone().sub(bottom).normalize());shaft.castShadow=shaft.receiveShadow=true;root.add(shaft);const sleeve=new T.Mesh(new T.CylinderGeometry(.145,.145,Math.min(.28,gap*.45),12),dark);sleeve.position.copy(top).lerp(bottom,.2);sleeve.quaternion.copy(shaft.quaternion);root.add(sleeve);const pad=new T.Mesh(new T.CylinderGeometry(.28,.34,.09,12),steel);pad.position.copy(bottom).addScaledVector(normal,.04);pad.quaternion.setFromUnitVectors(Y,normal);pad.castShadow=pad.receiveShadow=true;root.add(pad);}
 return root;
}
