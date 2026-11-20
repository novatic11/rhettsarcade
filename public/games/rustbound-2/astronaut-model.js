import * as T from './vendor/three.module.js';
import {advanceGait} from './motion.js';
import {tailored,sweep,aperture,sampleProfile,sculpt,batchRig} from './astronaut-geometry.js';
const clamp=T.MathUtils.clamp;
function suitMaterials(){
 const make=(name,color,roughness,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=name;return m;};
 const m={cloth:make('woven-pressure-fabric','#cbd1ce',.87),ceramic:make('ceramic-shell','#d9dfd8',.49,.07),seam:make('stitched-piping','#9daaa7',.82),flex:make('graphite-flex-fabric','#2b373b',.96),rubber:make('molded-outsole','#172328',.93),metal:make('brushed-titanium','#8d9fa5',.28,.83),blue:make('mission-blue','#427482',.57,.22),red:make('safety-vermilion','#ad5544',.70),gold:make('visor-seal','#9c8058',.30,.74)};
 m.visor=new T.MeshPhysicalMaterial({color:'#08171c',metalness:.86,roughness:.085,clearcoat:1,clearcoatRoughness:.055,envMapIntensity:1.6});m.visor.name='curved-optical-visor';
 m.light=make('status-lights','#b9e0dd',.32,.12);m.light.emissive.set('#6caaa7');m.light.emissiveIntensity=.35;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),data=ctx.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const weave=((x+y)%4<2?8:-8)+(x%3===0?5:0),grain=Math.sin(x*131.3+y*47.7)*3,v=128+weave+grain;data.data.set([v,v,v,255],(y*128+x)*4);}ctx.putImageData(data,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(7,7);m.cloth.bumpMap=texture;m.cloth.bumpScale=.0018;m.flex.bumpMap=texture;m.flex.bumpScale=.0013;
 }
 return m;
}
function group(parent,name,position=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...position);parent.add(g);return g;}
function seam(parent,name,points,material,r=.0028){return sculpt(parent,name,sweep(points,r,{segments:28,sides:6}),material);}
function cuff(parent,y,rx,rz,material,{thickness=.012,depth=.030}={}){
 return sculpt(parent,'contoured-pressure-cuff',tailored([[y-depth,rx*.92,rz*.92],[y-depth*.5,rx+thickness,rz+thickness],[y,rx+thickness*.8,rz+thickness*.8],[y+depth*.45,rx*.95,rz*.95]],{rows:10,columns:28}),material);
}
function sculptedPatch(parent,name,x,y,z,rx,ry,material){
 const lens=(a,r)=>{const contour=1+.10*Math.sin(a)-.055*Math.cos(a*2);return [x+Math.cos(a)*r*rx*contour,y+Math.sin(a)*r*ry,z+.014*(1-r*r)];};return sculpt(parent,name,aperture(lens,{rows:7,columns:32}),material);
}
function glove(parent,side,m){
 const hand=group(parent,'articulated-glove',[0,-.265,.01]);
 sculpt(hand,'shaped-glove-palm',tailored([[-.145,.012,.015,0,.015],[-.118,.061,.031,0,.02],[-.058,.073,.041,0,.012],[.003,.059,.037],[.035,.050,.034]],{rows:20,columns:24,wrinkle:.0014}),m.cloth);
 sculptedPatch(hand,'knuckle-guard',0,-.068,.047,.060,.048,m.ceramic);
 const fingerCurl=group(hand,'glove-finger-curl',[0,-.12,.015]),fingers=[fingerCurl];for(let i=0;i<4;i++){
  const x=(i-1.5)*.031,length=[.084,.100,.094,.075][i],finger=group(fingerCurl,'glove-finger-'+i,[x,0,0]);
  sculpt(finger,'tailored-finger',sweep([[0,.015,0],[0,-length*.28,.008],[0,-length*.72,.021],[0,-length,.039]],t=>.0145*(1-.1*t)*Math.min(1,.08+Math.sin(Math.PI*t)*4),{segments:14,sides:8,flatten:.87}),m.cloth);
  seam(finger,'finger-stitch',[[.011,0,.005],[.012,-length*.35,.015],[.009,-length*.74,.034]],m.seam,.0016);
 }
 sculpt(hand,'shaped-opposable-thumb',sweep([[side*.051,-.052,.012],[side*.085,-.081,.027],[side*.088,-.115,.050],[side*.068,-.137,.064]],t=>.022*Math.min(1,.1+Math.sin(t*Math.PI)*3),{segments:18,sides:10,flatten:.8}),m.cloth);
 return {hand,fingers};
}
function boot(parent,m){
 const foot=group(parent,'molded-expedition-boot',[0,-.37,0]);
 const outline=[[-.119,.075,.135,0,.065],[-.106,.124,.207,0,.072],[-.065,.134,.215,0,.073],[-.018,.127,.206,0,.073]];
 sculpt(foot,'curved-boot-outsole',tailored(outline,{rows:14,columns:36,power:2.2}),m.rubber);
 sculpt(foot,'tailored-boot-upper',tailored([outline.at(-1),[.020,.120,.190,0,.065],[.078,.108,.145,0,.028],[.160,.087,.096,0,-.008],[.201,.077,.081,0,-.009]],{rows:24,columns:36,power:2.2,wrinkle:.0015}),m.cloth);
 // Rounded toe armor follows the boot's rise, rather than sitting on a box.
 sculpt(foot,'sculpted-toe-shield',tailored([[.0,.08,.045,0,.222],[.008,.105,.059,0,.222],[.043,.11,.055,0,.187],[.075,.074,.033,0,.155]],{rows:16,columns:28}),m.ceramic);
 for(const sign of [-1,1])seam(foot,'boot-side-welt',[[sign*.08,.15,-.02],[sign*.11,.03,.08],[sign*.12,-.012,.19],[sign*.075,-.013,.24]],m.flex,.0035);
 for(let i=0;i<7;i++){const z=-.098+i*.052,width=.105*Math.sin((i+1)/8*Math.PI)+.015;seam(foot,'curved-sole-tread',[[-width,-.108,z-.01],[-width*.35,-.122,z+.008],[width*.35,-.122,z+.008],[width,-.108,z-.01]],m.flex,.008);}
 cuff(foot,.145,.089,.096,m.blue,{thickness:.004,depth:.018});return foot;
}
function helmet(parent,m){
 const head=group(parent,'helmet-gimbal',[0,1.79,.005]);head.scale.set(.86,.90,.88);
 const profile=[[-.312,.027,.025,0,-.006],[-.280,.166,.164,0,.010],[-.21,.269,.249,0,.007],[-.06,.317,.301],[.11,.309,.285,0,-.012],[.255,.229,.217,0,-.027],[.324,.106,.110,0,-.035],[.342,.001,.001,0,-.036]];
 sculpt(head,'sculpted-pressure-helmet',tailored(profile,{rows:40,columns:56,power:2.05}),m.ceramic);
 const visor=(a,r,clearance=0)=>{
  const x=Math.cos(a)*r*.270*(1+.025*Math.sin(a)),y=Math.sin(a)*r*.213+.012,[,rx,rz,,cz=0]=sampleProfile(profile,y),z=cz+rz*Math.sqrt(Math.max(.015,1-(x/rx)**2))+.009+clearance;
  return [x,y,z];
 };
 sculpt(head,'inset-optical-visor',aperture((a,r)=>visor(a,r),{rows:18,columns:64}),m.visor);
 sculpt(head,'molded-visor-gasket',aperture((a,r)=>visor(a,r,.001),{inner:1,outer:1.075,rows:4,columns:64}),m.flex);
 sculpt(head,'titanium-visor-retainer',aperture((a,r)=>visor(a,r,.002),{inner:1.075,outer:1.102,rows:3,columns:64}),m.gold);
 const brow=[];for(let i=0;i<=18;i++)brow.push(visor(.10+Math.PI*.94*i/18,1.13,.004));seam(head,'raised-visor-brow',brow,m.ceramic,.012);
 for(const side of [-1,1]){
  const hinge=group(head,'helmet-side-latch',[side*.31,-.015,-.010]);hinge.rotation.z=-side*Math.PI/2;
  sculpt(hinge,'sculpted-helmet-latch',tailored([[-.012,.055,.063],[.000,.072,.079],[.028,.062,.068],[.038,.025,.033]],{rows:12,columns:24}),m.metal);
  seam(head,'helmet-shell-seam',[[side*.12,.302,-.08],[side*.23,.235,-.143],[side*.293,.090,-.119],[side*.29,-.10,-.082]],m.seam,.0029);
 }
 sculptedPatch(head,'crown-mission-inlay',0,.273,.167,.065,.012,m.blue);return head;
}
function lifeSupport(body,m){
 const pack=group(body,'conformal-life-support',[0,1.20,-.305]);
 sculpt(pack,'sculpted-life-support-shell',tailored([[-.36,.025,.025,0,.022],[-.315,.185,.108],[-.21,.246,.136],[.14,.247,.143],[.28,.208,.110],[.338,.08,.043],[.349,.005,.005]],{rows:32,columns:36,power:2.35}),m.ceramic);
 const spine=group(pack,'rear-heat-exchanger',[0,-.01,-.135]);spine.rotation.y=Math.PI;
 sculpt(spine,'curved-thermal-spine',tailored([[-.27,.060,.014],[-.20,.139,.030],[.15,.142,.029],[.24,.09,.016],[.27,.012,.005]],{rows:20,columns:28}),m.flex);
 for(let i=0;i<9;i++){const y=-.195+i*.047,width=.12-Math.abs(y)*.08;seam(spine,'swept-heat-exchanger-fin',[[-width,y,.019],[-width*.5,y+.005,.035],[width*.5,y+.005,.035],[width,y,.019]],m.metal,.0055);}
 for(const side of [-1,1]){
  sculpt(pack,'integrated-oxygen-lobe',tailored([[-.29,.018,.021,side*.198,0],[-.23,.075,.087,side*.203,-.006],[.14,.075,.086,side*.205,-.006],[.24,.036,.040,side*.198],[.25,.005,.005,side*.198]],{rows:24,columns:24}),m.metal);
  seam(pack,'pack-ceramic-rib',[[side*.13,-.28,-.095],[side*.23,-.18,-.106],[side*.23,.16,-.109],[side*.15,.28,-.088]],m.seam,.007);
 }
 for(const side of [-1,1])sculpt(body,'corrugated-life-support-hose',sweep([[side*.225,1.12,-.39],[side*.333,.97,-.25],[side*.368,.93,.03],[side*.292,1.03,.22],[side*.145,1.14,.311]],.021,{segments:100,sides:8,rib:.14}),side<0?m.seam:m.flex);
 seam(pack,'flexible-suit-antenna',[[.155,.24,-.025],[.20,.43,-.07],[.22,.61,-.07]],m.flex,.008);
 return pack;
}
function surveyTool(hand,m){
 const root=group(hand,'held-survey-tool',[0,-.08,.066]);root.rotation.x=Math.PI;
 sculpt(root,'contoured-survey-housing',tailored([[-.14,.028,.026],[-.11,.063,.061],[.025,.072,.068],[.090,.053,.05],[.135,.037,.035]],{rows:20,columns:28,power:2.2}),m.ceramic);
 cuff(root,.04,.070,.065,m.blue,{depth:.025,thickness:.004});
 const rotor=group(root,'survey-tool-rotor',[0,.133,0]);sculpt(rotor,'tapered-survey-bit',tailored([[0,.035,.035],[.035,.031,.031],[.145,.006,.006],[.155,.001,.001]],{rows:12,columns:20}),m.metal);
 const spiral=[];for(let i=0;i<=32;i++){const t=i/32,a=t*Math.PI*7,r=.031*(1-t)+.004;spiral.push([Math.cos(a)*r,t*.14,Math.sin(a)*r]);}seam(rotor,'helical-tool-flute',spiral,m.flex,.004);
 return {root,rotor};
}
export function astronautModel(){
 const m=suitMaterials(),root=new T.Group();root.name='tailored-expedition-astronaut';const body=group(root,'suit-body');
 sculpt(body,'anatomical-pressure-torso',tailored([[.73,.087,.080,0,-.005],[.78,.227,.146],[.84,.267,.179],[1.02,.267,.188],[1.22,.286,.216],[1.37,.300,.204],[1.46,.222,.160],[1.51,.137,.123]],{rows:44,columns:40,power:2.25,wrinkle:.0025}),m.cloth);
 sculpt(body,'shaped-chest-control-unit',tailored([[1.072,.024,.012,0,.234],[1.103,.117,.041,0,.242],[1.18,.194,.063,0,.245],[1.315,.181,.055,0,.235],[1.363,.116,.023,0,.221],[1.374,.025,.006,0,.213]],{rows:24,columns:32,power:2.15}),m.ceramic);
 sculptedPatch(body,'recessed-chest-instrument',0,1.275,.297,.097,.044,m.flex);
 for(const side of [-1,1]){
  seam(body,'contoured-harness',[[side*.13,.87,.146],[side*.23,1.09,.189],[side*.255,1.34,.143],[side*.19,1.445,.103]],m.blue,.013);
  seam(body,'double-stitched-side-panel',[[side*.24,.90,.012],[side*.27,1.08,.064],[side*.277,1.27,.084],[side*.235,1.40,.108]],m.seam,.003);
  sculptedPatch(body,'recessed-service-connection',side*.13,1.145,.307,.036,.039,m.metal);sculptedPatch(body,'colored-pressure-valve',side*.13,1.145,.325,.021,.024,side<0?m.red:m.blue);
 }
 seam(body,'instrument-status-trace',[[-.057,1.280,.314],[-.022,1.289,.317],[.009,1.273,.317],[.054,1.294,.313]],m.light,.0033);
 cuff(body,.955,.273,.194,m.blue,{thickness:.008,depth:.025});
 sculpt(body,'flexible-neck-seal',tailored([[1.45,.129,.119],[1.50,.162,.148],[1.57,.170,.156],[1.59,.138,.130]],{rows:14,columns:36,wrinkle:.0025}),m.flex);cuff(body,1.54,.174,.158,m.metal,{thickness:.005,depth:.021});
 const pack=lifeSupport(body,m),head=helmet(body,m),legs=[],arms=[];
 for(const side of [-1,1]){
  const hip=group(body,(side<0?'left':'right')+'-hip',[side*.169,.90,0]);
  sculpt(hip,'tailored-thigh',tailored([[-.426,.082,.084],[-.35,.115,.112],[-.20,.145,.140,side*.008,.001],[-.045,.143,.143,side*.010],[.050,.077,.087]],{rows:28,columns:28,wrinkle:.0037,phase:side}),m.cloth);
  seam(hip,'thigh-side-stitch',[[side*.132,-.05,.030],[side*.145,-.20,.036],[side*.112,-.34,.037]],m.seam,.003);
  const knee=group(hip,(side<0?'left':'right')+'-knee',[0,-.40,0]);
  sculpt(knee,'tailored-shin',tailored([[-.383,.072,.078],[-.30,.091,.090,0,-.01],[-.16,.110,.108,0,-.01],[-.025,.109,.117],[.055,.080,.082]],{rows:28,columns:28,wrinkle:.0033}),m.cloth);
  sculpt(knee,'shaped-knee-flexure',tailored([[-.083,.098,.099],[-.047,.120,.123],[.015,.119,.123],[.055,.092,.095]],{rows:18,columns:28,wrinkle:.003}),m.flex);
  const guard=group(hip,(side<0?'left':'right')+'-floating-knee-shield',[0,-.40,0]),kneeFace=(a,r)=>{const s=Math.sin(a),c=Math.cos(a),x=c*r*.092*(.86+.16*s),y=-.020+s*r*.080,z=.116+.029*(1-r*r)+.005*Math.abs(c)*r;return [x,y,z];};
  sculpt(guard,'sculpted-knee-shield',aperture(kneeFace,{outer:.9,rows:10,columns:36}),m.ceramic);sculpt(guard,'knee-shield-molded-rim',aperture(kneeFace,{inner:.9,outer:1,rows:3,columns:36}),m.seam);cuff(knee,-.235,.101,.102,m.seam,{depth:.017,thickness:.003});
  const foot=boot(knee,m);legs.push({hip,knee,guard,foot});
  const shoulder=group(body,(side<0?'left':'right')+'-shoulder',[side*.315,1.389,0]);
  sculpt(shoulder,'sculpted-shoulder-bell',tailored([[-.12,.104,.108],[-.04,.148,.145,side*.017],[.055,.145,.136,side*.015],[.105,.071,.074]],{rows:22,columns:28}),m.ceramic);
  sculpt(shoulder,'tailored-upper-sleeve',tailored([[-.327,.076,.078,side*.036],[-.245,.096,.103,side*.033],[-.13,.116,.115,side*.025],[-.045,.110,.112,side*.015]],{rows:25,columns:28,wrinkle:.0038,phase:side}),m.cloth);
  cuff(shoulder,-.13,.114,.115,side<0?m.red:m.blue,{depth:.023,thickness:.002});
  const elbow=group(shoulder,(side<0?'left':'right')+'-elbow',[side*.035,-.30,0]);
  sculpt(elbow,'sleeve-elbow-flexure',tailored([[-.086,.081,.084],[-.043,.101,.105],[.021,.099,.103],[.055,.072,.075]],{rows:18,columns:24,wrinkle:.003}),m.flex);
  sculpt(elbow,'tailored-forearm',tailored([[-.270,.064,.070],[-.20,.085,.089],[-.095,.096,.098],[.016,.088,.087]],{rows:26,columns:28,wrinkle:.003}),m.cloth);
  seam(elbow,'forearm-top-stitch',[[.060,-.23,.050],[.082,-.15,.064],[.082,-.065,.059]],m.seam,.0028);cuff(elbow,-.24,.075,.078,m.metal,{depth:.019,thickness:.002});
  const {hand,fingers}=glove(elbow,-side,m);arms.push({shoulder,elbow,hand,fingers});
 }
 const tool=surveyTool(arms[1].hand,m);tool.root.visible=false;
 for(const joint of [body,head,pack,tool.root,tool.rotor,...legs.flatMap(l=>[l.hip,l.knee,l.guard,l.foot]),...arms.flatMap(a=>[a.shoulder,a.elbow,a.hand,...a.fingers])])joint.userData.rigJoint=true;
 batchRig(root);let phase=0,blend=0,seatedBlend=0,airBlend=0,toolBlend=0,headTurn=0,released=false;const rest=body.position.y,contact=new T.Vector3(),soleSamples=[[0,-.119,.065],[0,-.106,.27],[0,-.106,-.135],[0,-.065,.288]];
 return {root,rig:{body,head,pack,legs,arms,tool},dispose(){if(released)return;released=true;const geometries=new Set(),materials=new Set(Object.values(m)),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});for(const material of materials)if(material.bumpMap)textures.add(material.bumpMap);geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(material=>material.dispose());root.removeFromParent();},update(dt,demo,heading=0,cameraYaw=heading+Math.PI){
  if(released)return false;
  dt=Number.isFinite(dt)?clamp(dt,0,.1):0;const speed=Math.max(0,Number(demo.walkSpeed)||0),time=Number(demo.time)||0,jump=Math.max(0,Number(demo.jumpHeight)||0),impact=Math.max(0,Number(demo.landingImpact)||0),moving=demo.mode==='foot'&&!!demo.walking&&jump<.02;
  const damp=rate=>1-Math.exp(-dt*rate);blend+=(Number(moving)-blend)*damp(9);seatedBlend+=(Number(demo.mode==='rover')-seatedBlend)*damp(10);airBlend+=(Number(jump>.03)-airBlend)*damp(12);const usingTool=!!demo.mining||demo.campaign?.job?.kind==='experiment'&&demo.mode==='foot';toolBlend+=(Number(usingTool)-toolBlend)*damp(9);tool.root.visible=toolBlend>.04;tool.rotor.rotation.y=demo.mining?time*40:0;
  const gait=advanceGait(phase,moving?speed*dt:0,moving);phase=gait.phase;const stride=(.40+Math.min(speed,7.8)*.035)*blend,run=clamp((speed-4)/3.8,0,1),breath=Math.sin(time*1.48)*.004*(1-blend);
  body.position.y=rest+(1-Math.cos(phase*2))*.016*blend-impact*.041+breath;body.rotation.set(blend*(.035+run*.055)-airBlend*.025,Math.sin(phase)*blend*.025,-Math.sin(phase)*blend*.027);
  for(let i=0;i<2;i++){
   const cycle=phase+i*Math.PI,c=Math.cos(cycle),s=Math.sin(cycle),swing=Math.max(0,-s),leg=legs[i],hip=-c*stride,knee=.065*blend+swing*blend*(.83+run*.27);
   leg.hip.rotation.x=T.MathUtils.lerp(hip-airBlend*.28,-1.29,seatedBlend);leg.hip.rotation.z=(i===0?1:-1)*airBlend*.045;
   leg.knee.rotation.x=T.MathUtils.lerp(knee+airBlend*.54,1.40,seatedBlend);leg.guard.rotation.x=leg.knee.rotation.x*.55;leg.guard.position.z=Math.sin(leg.knee.rotation.x*.5)*.025;leg.foot.rotation.x=T.MathUtils.lerp((-hip-knee)*.75+Math.max(0,s)*blend*.13-airBlend*.12,-.05,seatedBlend);
   const arm=arms[i],right=i===1,walking=c*blend*(.31+run*.16),working=right?toolBlend:toolBlend*.25;
   arm.shoulder.rotation.x=T.MathUtils.lerp(walking-airBlend*.25,-1.0,seatedBlend);arm.shoulder.rotation.x=T.MathUtils.lerp(arm.shoulder.rotation.x,-.75,working);
   arm.shoulder.rotation.z=(i===0?1:-1)*T.MathUtils.lerp(.075+airBlend*.13+blend*.02,.30,seatedBlend);arm.elbow.rotation.x=T.MathUtils.lerp(-.12-blend*(.13+run*.14),-.35,seatedBlend);arm.elbow.rotation.x=T.MathUtils.lerp(arm.elbow.rotation.x,-.83,working);
   arm.hand.rotation.x=T.MathUtils.lerp(.04,-.12,working);for(const finger of arm.fingers)finger.rotation.x=-working*.44;
  }
  // Keep the stance boot on the ground as its ankle rolls. A rigid two-bone
  // swing otherwise shortens the leg and makes both feet hover mid-stride.
  if(blend>.001&&seatedBlend<.99&&airBlend<.99){const leg=legs[Math.sin(phase)>=0?0:1];let lowest=Infinity;for(const p of soleSamples){contact.set(...p).applyEuler(leg.foot.rotation).add(leg.foot.position).applyEuler(leg.knee.rotation).add(leg.knee.position).applyEuler(leg.hip.rotation).add(leg.hip.position).applyEuler(body.rotation);lowest=Math.min(lowest,contact.y);}body.position.y=T.MathUtils.lerp(body.position.y,rest+.012-lowest,blend*(1-seatedBlend)*(1-airBlend));}
  const neckAngle=Math.atan2(Math.sin(cameraYaw-heading+Math.PI),Math.cos(cameraYaw-heading+Math.PI));headTurn+=(clamp(neckAngle,-.8,.8)*.42-headTurn)*damp(6);head.rotation.y=headTurn;head.rotation.x=Math.sin(time*1.15)*.006+airBlend*.035;head.rotation.z=-body.rotation.z*.55;
  return dt>0&&moving&&blend>.08&&gait.planted;
 }};
}
