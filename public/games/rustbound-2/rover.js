import {BUILDINGS,discoveriesFor} from './expedition.js';
import {basis,add,sub,mul,unit,length,dot,groundPoint,terrainHeight,OBSTACLES,BODIES,landingPoint} from './world.js';
export class Rover{
 constructor(id){this.body=id;this.normal=unit(sub(landingPoint(id,10,13),BODIES[id].position));this.position=groundPoint(id,this.normal);this.velocity=[0,0,0];this.heading=Math.PI;this.steering=0;this.odometer=0;this.speed=0;this.roll=0;}
 step(dt,input,ship,buildings=[]){const body=BODIES[this.body],{north,right}=basis(this.normal),forward=add(mul(north,Math.cos(this.heading)),mul(right,-Math.sin(this.heading))),side=add(mul(right,Math.cos(this.heading)),mul(north,Math.sin(this.heading)));let longitudinal=dot(this.velocity,forward),lateral=dot(this.velocity,side);const throttle=(input.battery===undefined||input.battery>0)?input.forward||0:0,steer=input.side||0,grip=input.brake?.65:7.5;
  this.steering+=(steer*.48-this.steering)*(1-Math.exp(-dt*8));this.heading-=this.steering*longitudinal*.22*dt;const propelled=add(this.velocity,mul(forward,throttle*17*dt/(1+(input.payload||0)*.003))),newBasis=basis(this.normal),f=add(mul(newBasis.north,Math.cos(this.heading)),mul(newBasis.right,-Math.sin(this.heading))),s=add(mul(newBasis.right,Math.cos(this.heading)),mul(newBasis.north,Math.sin(this.heading)));longitudinal=Math.max(-5,Math.min(14,dot(propelled,f)*Math.exp(-dt*(input.brake?.45:.17))));lateral=dot(propelled,s)*Math.exp(-dt*grip);
  // Tire grip pulls velocity toward the steering direction gradually; handbrake
  // releases lateral grip, preserving a controllable slide rather than a pivot.
  this.velocity=add(mul(f,longitudinal),mul(s,lateral));let candidate=groundPoint(this.body,unit(add(sub(this.position,body.position),mul(this.velocity,dt)))),blocked=length(sub(candidate,ship))<4.5;
  const local=sub(candidate,body.position);for(const r of OBSTACLES[this.body])if(Math.hypot(local[0]-r.x,local[2]-r.z)<r.radius+1.05)blocked=true;
  for(const b of buildings)if(length(sub(candidate,groundPoint(this.body,unit([b.x,body.radius,b.z]))))<BUILDINGS[b.type].radius+1.1)blocked=true;for(const site of discoveriesFor(this.body))if(site.type!=='cave'&&length(sub(candidate,site.position))<(site.type==='outpost'?6:3.5))blocked=true;
  if(blocked)this.velocity=mul(this.velocity,-.18);else{this.odometer+=length(sub(candidate,this.position));this.position=candidate;this.normal=unit(sub(candidate,body.position));}this.speed=length(this.velocity);this.roll+=(Math.max(-.14,Math.min(.14,-this.steering*this.speed*.018))-this.roll)*(1-Math.exp(-dt*6));
 }
}
