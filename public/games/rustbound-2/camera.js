import * as T from './vendor/three.module.js';
const V=a=>new T.Vector3(...a),Y=new T.Vector3(0,1,0),smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
// The camera follows the flight path, independently of engine attitude. In particular,
// a retrograde burn must not swing the viewer underneath the rocket.
export class CinematicRig{
 constructor(){this.ready=false;this.up=Y.clone();this.tangent=new T.Vector3(0,0,-1);this.back=new T.Vector3(0,.4,1).normalize();this.range=30;}
 reset(position,up){this.ready=false;this.seed=position.clone();this.up.copy(up);}
 sample(dt,{ship,velocity,body,target,altitude,zoom=11,kind='travel'}){
  const p=V(ship),radial=p.clone().sub(V(body.position)).normalize(),blend=1-Math.exp(-dt*.85);
  this.up.lerp(radial,blend).normalize();
  let along=V(velocity).addScaledVector(radial,-V(velocity).dot(radial));
  if(along.length()<6){along=V(target.position).sub(p);along.addScaledVector(radial,-along.dot(radial));if(along.length()<1)along.copy(this.tangent);}
  along.normalize();
  if(!this.ready){this.tangent.copy(along);const initial=this.seed?.clone().sub(p);if(initial?.length()>1)this.back.copy(initial.normalize());this.ready=true;}
  const turn=new T.Quaternion().setFromUnitVectors(this.tangent,along),limited=new T.Quaternion().rotateTowards(turn,dt*.32);this.tangent.applyQuaternion(limited).normalize();
  let side=new T.Vector3().crossVectors(this.tangent,this.up);if(side.length()<.05)side.set(1,0,0);side.normalize();
  const wide=smooth((altitude-70)/1800),wanted=this.tangent.clone().multiplyScalar(-.72-wide*.2).addScaledVector(side,.62-wide*.45).addScaledVector(this.up,kind==='orbit'?.9:.48-wide*.36).normalize();
  const rotation=new T.Quaternion().setFromUnitVectors(this.back,wanted);this.back.applyQuaternion(new T.Quaternion().rotateTowards(rotation,dt*.42)).normalize();
  const range=(29+wide*36)*T.MathUtils.clamp(zoom/11,.8,1.8);this.range+=(range-this.range)*(1-Math.exp(-dt*.75));
  const lead=V(velocity);if(lead.length()>1)lead.normalize().multiplyScalar(Math.min(4,V(velocity).length()*.012));else lead.set(0,0,0);
  return {position:p.clone().addScaledVector(this.back,this.range),look:p.clone().addScaledVector(this.up,3).add(lead),up:this.up.clone(),fov:52+wide*9};
 }
}
