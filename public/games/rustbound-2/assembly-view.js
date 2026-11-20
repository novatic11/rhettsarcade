import * as T from './vendor/three.module.js';
import {partModel} from './ship-models.js';
export function assemblyHangar(scene){
 const metal=new T.MeshStandardMaterial({color:'#35414b',roughness:.84,metalness:.24}),dark=new T.MeshStandardMaterial({color:'#14212d',roughness:.9}),light=new T.MeshBasicMaterial({color:'#a7cfdf'});
 const box=(size,p,material)=>{const m=new T.Mesh(new T.BoxGeometry(...size),material);m.position.set(...p);scene.add(m);return m;};
 box([65,.15,65],[0,-.12,0],dark);box([65,38,.2],[0,18,-23],metal);
 for(let x=-28;x<=28;x+=7){box([.3,38,.8],[x,18,-22.5],dark);box([.14,23,.08],[x+.7,13,-22.2],light);}
 for(let y=0;y<38;y+=6)box([65,.16,.4],[0,y,-22.5],dark);
 box([16,.12,16],[0,-.01,0],new T.MeshStandardMaterial({color:'#273a49',roughness:.65,metalness:.4}));
 const grid=new T.GridHelper(56,56,'#566d7a','#263c4b');grid.position.y=.065;scene.add(grid);
 for(let x=-15;x<=15;x+=10){box([.07,.025,32],[x,.07,0],light);}
 box([38,.6,1.2],[0,29,-5],metal);box([5,1.2,2.5],[7,28.4,-5],dark);
 const cable=new T.Mesh(new T.CylinderGeometry(.035,.035,15,8),metal);cable.position.set(7,20,-5);scene.add(cable);
}
export function partThumbnail(renderer,type){
 const scene=new T.Scene(),model=partModel(type);scene.add(model,new T.HemisphereLight('#eef8ff','#3c5360',2.4));const light=new T.DirectionalLight('#ffffff',3);light.position.set(4,6,5);scene.add(light);
 const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z)*1.4;
 const camera=new T.PerspectiveCamera(35,1.35,.03,100);camera.position.copy(center).add(new T.Vector3(.9,.5,1.5).normalize().multiplyScalar(Math.max(1.8,span*1.7)));camera.lookAt(center);
 const old=renderer.getSize(new T.Vector2()),color=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();renderer.setSize(135,100,false);renderer.setClearColor('#142534',1);renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');renderer.setClearColor(color,alpha);renderer.setSize(old.x,old.y,false);
 const materials=new Set();model.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});materials.forEach(m=>m.dispose());return url;
}
