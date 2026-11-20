// Original stylized terrain, not a geographic elevation dataset. The same
// deterministic features drive the globe, close terrain, and contact physics.
const spec=(family,relief,scale,roughness,description,features=[])=>({family,relief,scale,roughness,description,features});
export const SOLAR_GEOLOGY={
 mercury:spec('crater',.025,7,.96,'Ancient impact basins, scarps and dusty rays',[[.42,.28,.48,-.024]]),
 venus:spec('volcanic',.028,8,.9,'Folded highlands and broad volcanic shields',[[.5,.1,.22,.042],[-1.1,-.25,.16,.03]]),
 earth:spec('coast',.021,5,.84,'Blue oceans, green uplands and pale mountain ridges'),
 moon:spec('crater',.022,8,.98,'Dark mare plains and bright crater ejecta',[[-.12,-.7,.17,-.02],[.8,.26,.26,-.017]]),
 mars:spec('canyon',.033,6,.96,'Layered red canyons, dunes and shield volcanoes',[[-1.05,.3,.18,.055]]),
 phobos:spec('grooves',.014,10,.99,'Grooved regolith around a deep impact basin',[[.12,.12,.4,-.027]]),
 deimos:spec('dust',.008,9,.99,'Soft dusty slopes and muted impact hollows'),
 ceres:spec('salt',.016,7,.87,'Salt-bright crater floors and gray uplands',[[.14,.18,.15,-.018]]),
 io:spec('volcanic',.025,9,.84,'Sulfur fields, dark calderas and fine lava channels',[[.45,.15,.12,.04],[-1.2,.3,.15,.025]]),
 europa:spec('fracture',.013,11,.49,'Overlapping ice plates, rust seams and glassy fractures'),
 ganymede:spec('grooves',.021,8,.77,'Grooved bright ice crossing dark ancient blocks'),
 callisto:spec('crater',.026,12,.94,'Dense old impacts, pale rims and ringed basins',[[.25,.2,.55,-.024]]),
 mimas:spec('crater',.021,9,.96,'A deep Herschel basin and sharp icy rim',[[.12,.05,.55,-.038]]),
 enceladus:spec('fracture',.014,12,.48,'Clean blue-white ice and long tiger-stripe fissures'),
 tethys:spec('canyon',.018,9,.8,'An icy chasm and broad impact walls',[[.5,.35,.43,-.025]]),
 dione:spec('fracture',.019,10,.79,'Bright wispy scarps through darker cratered ice'),
 rhea:spec('crater',.024,11,.91,'Old ice craters, bright ejecta and powdery plains'),
 titan:spec('dunes',.016,8,.92,'Amber sand, aligned dunes and dark polar lakebeds'),
 hyperion:spec('sponge',.026,13,.99,'Deep dark-floored pits and porous golden ridges'),
 iapetus:spec('ridge',.021,9,.93,'A tall equatorial ridge dividing two-tone ice'),
 miranda:spec('blocks',.029,7,.88,'Chevron bands, tall fault cliffs and broken blocks'),
 ariel:spec('canyon',.022,10,.78,'Branching ice canyons and smooth pale valley floors'),
 umbriel:spec('crater',.022,10,.98,'Dark ancient impacts and a pale polar ring',[[.18,.83,.16,-.02]]),
 titania:spec('fracture',.024,9,.89,'Long fault valleys across reddish cratered ice'),
 oberon:spec('crater',.027,11,.97,'Ancient crater chains with dark reddish floors'),
 proteus:spec('crater',.022,9,.99,'Angular terrain and a deep Pharos impact',[[ -.12,.04,.44,-.035]]),
 triton:spec('glacier',.017,9,.58,'Pink nitrogen frost, scalloped ice and dark plume trails'),
 nereid:spec('crater',.021,10,.96,'Battered gray ice with contrasting exposed rims'),
 pluto:spec('glacier',.024,7,.65,'Cellular nitrogen plains, a pale heart and rugged borders'),
 charon:spec('canyon',.023,8,.91,'A dark red polar hood and a long broken canyon'),
 styx:spec('dust',.012,11,.96,'Battered small ice with a fine dusty mantle'),
 nix:spec('crater',.017,9,.8,'Bright broken ice surrounding a rusty impact patch',[[.15,.2,.23,-.025]]),
 kerberos:spec('dust',.012,10,.88,'Two icy lobes, worn hollows and a darker joining saddle'),
 hydra:spec('blocks',.022,10,.76,'Knobbly bright ice with dark pits and sharp ledges'),
 haumea:spec('glacier',.013,9,.48,'Crystalline white-blue ice and a copper-red surface patch'),
 hiiaka:spec('fracture',.017,10,.58,'Blue crystalline ice with long exposed seams'),
 namaka:spec('blocks',.018,9,.84,'Cold fractured ice blocks with brown mineral streaks'),
 makemake:spec('dunes',.019,8,.7,'Red methane-frost terrain and pale frozen patches'),
 mk2:spec('dust',.011,11,.99,'Dark carbon-rich regolith and subtle bright chips'),
 eris:spec('salt',.014,9,.53,'Bright methane frost, wind-cut ridges and pink-gray seams'),
 dysnomia:spec('crater',.023,10,.97,'Dark crater uplands with pale exposed ice')
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},fract=v=>v-Math.floor(v);
const hash=(x,y,z)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453123);
export function solarNoise(x,y,z){const a=Math.floor(x),b=Math.floor(y),c=Math.floor(z),u=smooth(x-a),v=smooth(y-b),w=smooth(z-c),mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(hash(a,b,c),hash(a+1,b,c),u),mix(hash(a,b+1,c),hash(a+1,b+1,c),u),v),mix(mix(hash(a,b,c+1),hash(a+1,b,c+1),u),mix(hash(a,b+1,c+1),hash(a+1,b+1,c+1),u),v),w)*2-1;}
const seeds=new Map();function seedFor(id){if(!seeds.has(id))seeds.set(id,[...id].reduce((s,c)=>(s*31+c.charCodeAt(0))%997,11)*.031);return seeds.get(id);}
const craterCache=new Map();
export function solarCraters(id){if(!SOLAR_GEOLOGY[id])return [];if(!craterCache.has(id)){const p=SOLAR_GEOLOGY[id],seed=seedFor(id),generated=['crater','sponge','dust'].includes(p.family)?Array.from({length:8},(_,i)=>{const y=1-2*(i+.5)/8,angle=i*2.399963+seed,r=Math.sqrt(1-y*y);return {normal:[Math.sin(angle)*r,y,Math.cos(angle)*r],width:.08+(i%3)*.045,depth:(p.family==='sponge'?.026:.012)*(1+(i%3)*.3)};}):[];craterCache.set(id,[...p.features.map(([lon,lat,width,height])=>({normal:[Math.sin(lon)*Math.cos(lat),Math.sin(lat),Math.cos(lon)*Math.cos(lat)],width,depth:-height})),...generated]);}return craterCache.get(id);}
export function solarTerrainRelief(body,n){const p=body.realSolar&&SOLAR_GEOLOGY[body.id];if(!p||body.giant||body.star)return 0;const seed=seedFor(body.id),a=solarNoise(n[0]*p.scale+seed,n[1]*p.scale-seed,n[2]*p.scale),b=solarNoise(n[0]*p.scale*2.13-seed,n[1]*p.scale*2.13,n[2]*p.scale*2.13+seed),ridge=1-Math.abs(a);let h=a*.7+b*.15;
 if(p.family==='fracture')h=.22*a+.65*ridge**8-.27*Math.exp(-b*b*110);
 if(p.family==='grooves')h=a*.4+Math.sin(n[0]*45+n[2]*27+a*4)*.18+b*.15;
 if(p.family==='glacier')h=.65*ridge**5-.18+Math.sin(n[2]*33+a*2)*.09;
 if(p.family==='canyon')h=a*.4+.25-.9*Math.exp(-Math.pow(Math.sin(n[0]*13+n[2]*6+a*1.7),2)*38);
 if(p.family==='dunes')h=a*.22+Math.sin(n[0]*61+n[2]*9+a*4)*.28;
 if(p.family==='volcanic')h=Math.abs(a)**.7*.8-.25-Math.exp(-a*a*160)*.4;
 if(p.family==='salt')h=a*.15+b*.05;
 if(p.family==='blocks')h=(Math.floor((a+1)*5)/5-1)*.6+b*.1;
 if(p.family==='ridge')h=a*.35+Math.exp(-n[1]*n[1]*1800)*1.1;
 if(p.family==='coast')h=Math.max(-.12,a-.05)*.8+b*.12;
 let relief=h*body.radius*p.relief;
 for(const c of solarCraters(body.id)){const cosine=n.reduce((s,v,i)=>s+v*c.normal[i],0);if(cosine<Math.cos(c.width*2.7))continue;const q=Math.acos(clamp(cosine,-1,1))/c.width,bowl=Math.exp(-q*q*3.3),rim=Math.exp(-(((q-1)*9)**2));relief+=body.radius*c.depth*(-bowl+.18*rim);}
 // Keep the established starter pad, base/rover access and tutorial targets.
 const protectedPad=smooth((Math.hypot(n[0],n[2])*body.radius-38)/92);
 return clamp(relief,-body.radius*.08,body.radius*.08)*protectedPad;
}
