// Stylized silhouettes, using the longest semi-axis as the existing radius.
// NASA references and the scope of these approximations are in FRONTIER.md.
// Keeping the outer radius preserves orbit, station and transfer clearances.
export const SOLAR_SHAPES={
 haumea:{axes:[1,.51,.8],label:'Elongated, flattened ice dwarf'},
 phobos:{axes:[1,.7,.87],roughness:.07,seed:1,crater:{direction:[.97,.12,.21],width:.29,depth:.10},label:'Irregular potato-shaped moon'},
 deimos:{axes:[1,.64,.75],roughness:.035,seed:3,label:'Small elongated dusty moon'},
 hyperion:{axes:[1,.54,.634],roughness:.10,seed:5,label:'Lopsided, sponge-like moon'},
 proteus:{axes:[1,.91,.96],facets:.1,roughness:.025,seed:9,label:'Faceted, irregular moon'},
 styx:{axes:[1,.5,.56],roughness:.045,seed:11,label:'Elongated small moon'},
 nix:{axes:[1,.62,.7],roughness:.045,seed:13,label:'Oblong ice moon'},
 hydra:{axes:[1,.61,.75],roughness:.09,seed:17,label:'Uneven, knobbly ice moon'},
 kerberos:{lobes:[{center:[-.32,0,0],axes:[.67,.46,.47]},{center:[.51,.025,.015],axes:[.48,.34,.35]}],roughness:.025,seed:19,label:'Two joined icy lobes'},
 ceres:{axes:[1,.918,1],label:'Gently flattened dwarf planet'},
 mimas:{axes:[1,.92,.96],label:'Slightly elongated ice moon'},
 enceladus:{axes:[1,.966,.984],label:'Gently flattened ice moon'},
 iapetus:{axes:[1,.957,.96],label:'Slightly flattened ice moon'},
 jupiter:{axes:[1,.935,1],label:'Flattened gas giant'},
 saturn:{axes:[1,.902,1],label:'Flattened ringed gas giant'},
 uranus:{axes:[1,.977,1],label:'Gently flattened ice giant'},
 neptune:{axes:[1,.983,1],label:'Gently flattened ice giant'}
};

function rayEllipsoid(n,axes,center=[0,0,0]){
 let a=0,b=0,c=-1;for(let i=0;i<3;i++){const s=1/(axes[i]*axes[i]);a+=n[i]*n[i]*s;b-=2*n[i]*center[i]*s;c+=center[i]*center[i]*s;}
 const discriminant=b*b-4*a*c;return discriminant<0?0:Math.max(0,(-b+Math.sqrt(discriminant))/(2*a));
}
export function shapeRadius(body,direction){
 const shape=body.shape;if(!shape)return body.radius;
 const length=Math.hypot(...direction)||1,n=direction.map(v=>v/length);
 let r=shape.lobes?Math.max(...shape.lobes.map(l=>rayEllipsoid(n,l.axes,l.center))):rayEllipsoid(n,shape.axes);
 // Smooth, broad deformations are sampled identically by every mesh LOD,
 // walking, collision and construction. Nothing rotates independently of it.
 const seed=shape.seed||0;
 if(shape.roughness)r*=1-shape.roughness*(.5+.24*Math.sin(n[0]*5.1+seed)*Math.cos(n[1]*4.2-seed)+.26*Math.sin(n[2]*6.3+n[0]*2.4+seed));
 if(shape.facets)r*=1-shape.facets*(1-Math.max(Math.abs(n[0]),Math.abs(n[1]),Math.abs(n[2])));
 if(shape.crater){const c=shape.crater,l=Math.hypot(...c.direction),cos=n.reduce((sum,v,i)=>sum+v*c.direction[i]/l,0),q=(1-cos)/(c.width*c.width);r*=1-c.depth*Math.exp(-q*q*2);}
 return body.radius*Math.min(1,Math.max(.25,r));
}
