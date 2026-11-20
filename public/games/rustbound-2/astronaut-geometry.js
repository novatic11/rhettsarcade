import * as T from './vendor/three.module.js';
const TAU=Math.PI*2,clamp=T.MathUtils.clamp;
function finish(position,uv,index,rows,columns){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
 // The duplicated UV edge shares normals, so cloth has no vertical seam.
 if(rows&&columns){const n=g.attributes.normal;for(let y=0;y<=rows;y++){const a=y*(columns+1),b=a+columns,v=new T.Vector3().fromBufferAttribute(n,a).add(new T.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}}
 g.computeBoundingSphere();return g;
}
function triangles(rows,columns){const out=[];for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;out.push(a,b,c,b,d,c);}return out;}
export function sampleProfile(profile,y){let i=0;while(i<profile.length-2&&y>profile[i+1][0])i++;const a=profile[i],b=profile[i+1],t=clamp((y-a[0])/(b[0]-a[0]),0,1),p=profile[Math.max(0,i-1)],q=profile[Math.min(profile.length-1,i+2)];return a.map((v,k)=>{if(!k)return y;const av=a[k]||0,bv=b[k]||0,m0=(bv-(p[k]||0))*(b[0]-a[0])/(b[0]-p[0]),m1=((q[k]||0)-av)*(b[0]-a[0])/(q[0]-a[0]);return (2*t*t*t-3*t*t+1)*av+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*bv+(t*t*t-t*t)*m1;});}
/** Tailored sections: [height, half-width, half-depth, center-x, center-z]. */
export function tailored(profile,{rows=32,columns=32,wrinkle=0,power=2,phase=0}={}){
 const position=[],uv=[],bottom=profile[0][0],height=profile.at(-1)[0]-bottom;
 for(let y=0;y<=rows;y++){const t=y/rows,[h,rx,rz,cx=0,cz=0]=sampleProfile(profile,bottom+t*height),fade=Math.sin(t*Math.PI)**2;for(let x=0;x<=columns;x++){const a=x/columns*TAU,ca=Math.cos(a),sa=Math.sin(a),fold=wrinkle*fade*(Math.sin(t*28+Math.sin(a*2+phase)*1.2)*.60+Math.sin(t*47-a*2+phase*.5)*.28),sx=Math.sign(sa)*Math.abs(sa)**(2/power),sz=Math.sign(ca)*Math.abs(ca)**(2/power);position.push(cx+sx*(Math.max(.0002,rx)+fold),h,cz+sz*(Math.max(.0002,rz)+fold*.8));uv.push(x/columns,t);}}
 return finish(position,uv,triangles(rows,columns),rows,columns);
}
/** A custom swept surface, including tapered fingertips and ribbed hoses. */
export function sweep(points,radius,{segments=32,sides=8,flatten=1,rib=0,closed=false}={}){
 const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal'),frames=path.computeFrenetFrames(segments,closed),position=[],uv=[];
 for(let i=0;i<=segments;i++){const t=i/segments,p=path.getPointAt(t),r=typeof radius==='function'?radius(t):radius,rr=r*(1+rib*Math.sin(t*TAU*28));for(let j=0;j<=sides;j++){const a=j/sides*TAU,v=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*rr).addScaledVector(frames.binormals[i],Math.sin(a)*rr*flatten);position.push(v.x,v.y,v.z);uv.push(j/sides,t);}}
 return finish(position,uv,triangles(segments,sides),segments,sides);
}
/** One curved lens/armor face; radial topology follows a sculpted outline. */
export function aperture(point,{inner=0,outer=1,rows=16,columns=64}={}){
 const position=[],uv=[],index=[];for(let y=0;y<=rows;y++){const r=inner+(outer-inner)*y/rows;for(let x=0;x<=columns;x++){const a=x/columns*TAU,p=point(a,r);position.push(...p);uv.push(.5+Math.cos(a)*r*.5,.5+Math.sin(a)*r*.5);}}
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+columns+1,c=a+1,d=b+1;index.push(a,b,c,b,d,c);}return finish(position,uv,index,rows,columns);
}
export function sculpt(parent,name,geometry,material,position=[0,0,0]){const o=new T.Mesh(geometry,material);o.name=name;o.position.set(...position);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
/** Merge only rigid siblings, retaining every animation joint. */
export function batchRig(root){
 for(const child of [...root.children])if(child.isGroup){batchRig(child);if(!child.userData.rigJoint){child.updateMatrix();for(const part of [...child.children]){part.applyMatrix4(child.matrix);root.add(part);}child.removeFromParent();}}
 const buckets=new Map();for(const child of root.children)if(child.isMesh){const list=buckets.get(child.material)||[];list.push(child);buckets.set(child.material,list);}
 for(const [material,list]of buckets){if(list.length<2)continue;let size=0;const copies=list.map(o=>{o.updateMatrix();const clone=o.geometry.clone().applyMatrix4(o.matrix),g=clone.index?clone.toNonIndexed():clone;if(g!==clone)clone.dispose();size+=g.attributes.position.count;return g;});const position=new Float32Array(size*3),normal=new Float32Array(size*3),uv=new Float32Array(size*2);let offset=0;for(const g of copies){const n=g.attributes.position.count;position.set(g.attributes.position.array,offset*3);normal.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uv.set(g.attributes.uv.array,offset*2);offset+=n;g.dispose();}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingSphere();const names=list.flatMap(o=>o.userData.parts||[o.name]);for(const o of list){o.removeFromParent();o.geometry.dispose();}const combined=sculpt(root,'tailored-'+material.name,geometry,material);combined.userData.parts=names;}
}
