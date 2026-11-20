export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,n)=>a.map(v=>v*n);
export const magnitude=a=>Math.hypot(...a),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
export const qIdentity=()=>[0,0,0,1];
export function qMul(a,b){const[x,y,z,w]=a,[X,Y,Z,W]=b;return [w*X+x*W+y*Z-z*Y,w*Y-x*Z+y*W+z*X,w*Z+x*Y-y*X+z*W,w*W-x*X-y*Y-z*Z];}
export const qInverse=q=>[-q[0],-q[1],-q[2],q[3]];
export function qEuler([x=0,y=0,z=0]=[]){const a=Math.cos(x/2),b=Math.cos(y/2),c=Math.cos(z/2),d=Math.sin(x/2),e=Math.sin(y/2),f=Math.sin(z/2);return [d*b*c+a*e*f,a*e*c-d*b*f,a*b*f+d*e*c,a*b*c-d*e*f];}
export function qVector(q,v){const r=qMul(qMul(q,[...v,0]),qInverse(q));return r.slice(0,3);}
export function qAngles(q){const[x,y,z,w]=q,m13=2*(x*z+w*y),m23=2*(y*z-w*x),m33=1-2*(x*x+y*y),m12=2*(x*y-w*z),m11=1-2*(y*y+z*z);const Y=Math.asin(Math.max(-1,Math.min(1,m13)));return Math.abs(m13)<.9999999?[Math.atan2(-m23,m33),Y,Math.atan2(-m12,m11)]:[Math.atan2(2*(x*y+w*z),1-2*(x*x+z*z)),Y,0];}
export const position=p=>[p.x,p.y,p.z];
export function attachmentCenter(parent,def,node,angle=0,offset=[0,0,0],rotate=[0,0,0]){
 const pq=parent.quaternion||qEuler([0,parent.rotation||0,0]),q=qMul(qMul(pq,qEuler([0,angle,0])),qEuler(rotate));
 const pd=parent.dimensions,sign=node==='top'?1:-1;
 const relative=node==='radial'?[Math.sin(angle)*(pd.radius+def.radius+.075),0,Math.cos(angle)*(pd.radius+def.radius+.075)]:[0,sign*(pd.height/2+.0175),0];
 let center=add(position(parent),qVector(pq,add(relative,offset)));
 if(node!=='radial')center=add(center,qVector(q,[0,sign*(def.height/2+.0175),0]));
 return {center,quaternion:q};
}
