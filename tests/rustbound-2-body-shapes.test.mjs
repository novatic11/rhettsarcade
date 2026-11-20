import test from 'node:test';import assert from 'node:assert/strict';
globalThis.location={search:'?universe=solar'};
const {BODIES,terrainHeight,landingPoint,groundPoint,nearestBody,Demo,unit,sub,length}=await import('../public/games/rustbound-2/world.js');
const {shapeRadius,SOLAR_SHAPES}=await import('../public/games/rustbound-2/body-shapes.js');
const {planetModel}=await import('../public/games/rustbound-2/terrain.js');
const {gasGiantModel}=await import('../public/games/rustbound-2/giant-model.js');
const {passTrial}=await import('./rb2-landing-helpers.mjs');
test('known elongated, lumpy, double-lobed and oblate Solar bodies have distinct bounded surfaces',()=>{
 const h=BODIES.haumea;assert.equal(shapeRadius(h,[1,0,0]),h.radius);assert.equal(shapeRadius(h,[0,1,0]),h.radius*.51);assert(Math.abs(shapeRadius(h,[0,0,1])-h.radius*.8)<1e-9);
 const silhouettes=new Set();for(const id of Object.keys(SOLAR_SHAPES)){const body=BODIES[id],profile=[];for(let i=0;i<240;i++){const y=1-2*(i+.5)/240,a=i*2.399963,r=Math.sqrt(1-y*y),n=[r*Math.cos(a),y,r*Math.sin(a)],height=shapeRadius(body,n);assert(height>body.radius*.25&&height<=body.radius,id);assert.equal(height,shapeRadius(body,n));profile.push((height/body.radius).toFixed(5));}silhouettes.add(profile.join(','));}assert.equal(silhouettes.size,Object.keys(SOLAR_SHAPES).length);
 assert(shapeRadius(BODIES.kerberos,[-1,0,0])>shapeRadius(BODIES.kerberos,[0,1,0])*1.8);assert.equal(shapeRadius(BODIES.earth,[0,1,0]),BODIES.earth.radius);
});
test('both planet mesh LODs share the same physical surface, accurate altitude and finite normals',()=>{
 for(const id of ['haumea','phobos','deimos','hyperion','proteus','kerberos','hydra'])for(const detailed of [false,true]){const b=BODIES[id],model=planetModel(b,null,{detailed,segments:32,rows:24});assert.equal(model.userData.terrainBody,id);for(const mesh of model.children){const p=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;for(let i=0;i<p.count;i++){const v=[p.getX(i),p.getY(i),p.getZ(i)],n=unit(v);assert(Math.abs(length(v)-terrainHeight(id,n))<.001,id+' visible/collision surface');assert([normals.getX(i),normals.getY(i),normals.getZ(i)].every(Number.isFinite));}mesh.geometry.dispose();mesh.material.dispose();}const n=unit([1,1,.5]),p=groundPoint(id,n,3),near=nearestBody(p);assert.equal(near.body.id,id);assert(Math.abs(near.altitude-3)<1e-6);}
 const model=gasGiantModel(BODIES.saturn);assert.equal(model.getObjectByName('giant-clouds').scale.y,.902);assert.equal(model.getObjectByName('giant-limb').scale.y,.902);
});
test('landed legacy saves re-seat the ship and astronaut on corrected terrain, leaving flight positions untouched',()=>{
 for(const mode of ['foot','cockpit','rover','flight']){const d=new Demo(),body=BODIES.haumea,n=unit([6,740,13]),old=body.position.map((v,i)=>v+n[i]*(body.radius+.08));d.body='haumea';d.mode=mode;d.normal=n;d.ship=old;d.position=old;const raw=d.checkpoint(),restored=Demo.restore(raw);if(mode==='flight')assert.deepEqual(restored.ship,old);else{assert(length(sub(restored.ship,groundPoint('haumea',n,.08)))<1e-6);assert(restored.position.every(Number.isFinite));}assert.equal(restored.campaign.money,d.campaign.money);}
 const d=new Demo();d.body='phobos';d.mode='foot';d.normal=unit([.2,1,.1]);d.position=groundPoint('phobos',d.normal);d.ship=landingPoint('phobos');for(let i=0;i<50;i++)d.step(.02,{forward:1});assert(Math.abs(length(sub(d.position,BODIES.phobos.position))-terrainHeight('phobos',d.normal))<1e-6);
});
test('autopilot lands on flattened poles, elongated ends and the neck of a double-lobed moon',()=>{
 for(const [id,normal]of [['haumea',[0,1,0]],['haumea',[1,0,0]],['kerberos',[0,1,0]],['hyperion',[0,1,0]]]){const d=new Demo(),b=BODIES[id];d.body=id;d.mode='flight';d.ship=b.position.map((v,i)=>v+normal[i]*(b.radius+900));d.position=[...d.ship];d.direction=d.aim=normal;assert(d.travelTo(id,normal));for(let i=0;i<8000&&d.mode==='flight';i++){d.step(.25);if(d.landing){passTrial(d.landing.trial);assert(d.resolveLanding(true));}}assert.equal(d.mode,'cockpit',id+' landed');assert.equal(d.body,id);assert(Math.abs(nearestBody(d.ship).altitude-.08)<.02);assert.equal(d.power.integrity,100);assert(d.fuel>0);}
});
