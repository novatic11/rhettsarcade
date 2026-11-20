import {solarFinishGLSL} from './solar-surface-finish.js';
// Real Solar System surface signatures. These are stylized, deterministic
// geology, rather than downloaded maps. Every mark lives on the existing mesh.
// The caller provides p, broad, detail, height, base, glow and groundNoise().
const SURFACES={
 earth:`
 // Recognizable continental silhouettes: the Americas, Eurasia, Africa,
 // Australia and Greenland, softened by a small continuous shoreline field.
 vec2 continentUV=solarUV;
 float landField=length((continentUV-vec2(-1.85,.68))/vec2(.67,.57));
 landField=min(landField,length((continentUV-vec2(-2.04,.97))/vec2(.63,.3)));
 landField=min(landField,length((continentUV-vec2(-1.37,.18))/vec2(.22,.35)));
 vec2 southAmerica=continentUV-vec2(-1.15,-.5);southAmerica.x+=southAmerica.y*.22;
 landField=min(landField,length(southAmerica/vec2(.33,.65)));
 landField=min(landField,length((continentUV-vec2(.16,.79))/vec2(.48,.27)));
 landField=min(landField,length((continentUV-vec2(1.02,.7))/vec2(1.01,.49)));
 landField=min(landField,length((continentUV-vec2(.3,.01))/vec2(.43,.62)));
 landField=min(landField,length((continentUV-vec2(1.23,.14))/vec2(.26,.4)));
 landField=min(landField,length((continentUV-vec2(2.38,-.48))/vec2(.4,.27)));
 landField=min(landField,length((continentUV-vec2(-1.05,1.15))/vec2(.2,.23)));
 float coastline=landField+(solarField-.5)*.27;
 float continents=1.0-smoothstep(.94,1.055,coastline);
 float coastalShelf=1.0-smoothstep(1.04,1.2,coastline);
 vec3 ocean=mix(vec3(.012,.041,.11),vec3(.025,.17,.23),coastalShelf);
 float dryBelt=exp(-pow((abs(solarUV.y)-.39)*6.0,2.0));
 vec3 earthLand=mix(vec3(.075,.22,.072),vec3(.37,.3,.15),dryBelt*solarField);
 earthLand=mix(earthLand,vec3(.27,.31,.21),smoothstep(.7,.88,solarFine)*.7);
 base=mix(ocean,earthLand,continents);
 float polarIce=smoothstep(1.18,1.43,abs(solarUV.y));
 base=mix(base,vec3(.72,.83,.86),polarIce);
 float cloudFlecks=smoothstep(.72,.87,solarFine)*(.45+.55*solarField);
 base=mix(base,vec3(.79,.84,.85),cloudFlecks*.42);
 // The north-pole base pad is a deliberately dry, ~300 m grass/rock cap.
 // It is part of this surface, so no water shell can hide the starter base.
 float starterDryCap=(1.0-smoothstep(285.0,330.0,length(p.xz)))*step(0.0,solarN.y);
 vec3 starterGrass=mix(vec3(.12,.23,.095),vec3(.34,.33,.23),detail*.6+broad*.4);
 base=mix(base,starterGrass,starterDryCap);`,
 mercury:`
 base=mix(vec3(.16,.145,.13),vec3(.43,.4,.35),solarField);
 float caloris=length((solarUV-vec2(.42,.28))/vec2(.55,.51));
 base=mix(base,vec3(.39,.35,.26),(1.0-smoothstep(.8,1.0,caloris))*.65);
 float impactRays=pow(.5+.5*sin(atan(solarUV.y-.28,solarUV.x-.42)*37.0),14.0);
 base+=vec3(.075,.068,.052)*impactRays*exp(-caloris*1.7);
 base*=.82+.3*detail;`,
 venus:`
 float corona=abs(solarFine-.5);
 base=mix(vec3(.28,.155,.065),vec3(.63,.41,.17),solarField);
 base=mix(base,vec3(.75,.56,.27),(1.0-smoothstep(.018,.05,corona))*.65);
 base*=.9+.12*sin(height*.7+solarField*7.0);`,
 moon:`
 float lunarMaria=1.0-smoothstep(.38,.56,solarField);
 base=mix(vec3(.46,.46,.43),vec3(.135,.15,.17),lunarMaria*.86);
 vec2 tycho=solarUV-vec2(-.12,-.7);float tychoR=length(tycho);
 float tychoRays=pow(.5+.5*sin(atan(tycho.y,tycho.x+.00001)*33.0),18.0)*exp(-tychoR*3.7);
 base+=vec3(.2,.19,.17)*tychoRays;
 base=mix(base,vec3(.7,.69,.64),(1.0-smoothstep(.035,.075,tychoR))*.65);`,
 mars:`
 base=mix(vec3(.22,.075,.038),vec3(.61,.27,.115),solarField);
 float marineris=abs(solarUV.y+.13+sin(solarUV.x*3.3)*.045+(solarFine-.5)*.05);
 float canyon=(1.0-smoothstep(.008,.035,marineris))*(1.0-smoothstep(.65,1.1,abs(solarUV.x+.2)));
 base=mix(base,vec3(.09,.047,.036),canyon*.8);
 float olympus=length((solarUV-vec2(-1.05,.3))/vec2(.18,.16));
 base=mix(base,vec3(.34,.16,.088),(1.0-smoothstep(.65,1.05,olympus))*.7);
 base=mix(base,vec3(.76,.77,.68),smoothstep(1.27,1.45,abs(solarUV.y)));`,
 phobos:`
 base=mix(vec3(.115,.1,.09),vec3(.29,.245,.19),solarFine);
 float stickney=length((solarUV-vec2(.12,.12))/vec2(.5,.43));
 base*=mix(.48,1.0,smoothstep(.6,1.02,stickney));
 base+=vec3(.065,.055,.042)*exp(-pow((stickney-.95)*13.0,2.0));
 float phobosGrooves=pow(.5+.5*sin(solarN.x*91.0+solarN.y*25.0+solarField*2.0),12.0);
 base*=1.0-phobosGrooves*.23;`,
 deimos:`
 base=mix(vec3(.18,.16,.13),vec3(.39,.33,.25),solarField);
 base+=vec3(.1,.085,.06)*smoothstep(.77,.88,solarFine);
 base*=.94+.12*detail;`,
 io:`
 // Sulfur plains, red volcanic halos and dark paterae; mostly solid crust.
 float paterae=smoothstep(.74,.84,solarFine);
 float sulfurHalo=smoothstep(.63,.7,solarFine)*(1.0-smoothstep(.74,.79,solarFine));
 base=mix(vec3(.64,.49,.12),vec3(.91,.79,.36),solarField);
 base=mix(base,vec3(.65,.19,.045),sulfurHalo*.85);
 base=mix(base,vec3(.065,.044,.025),paterae);
 glow=vec3(.34,.043,.004)*paterae*.16;`,
 europa:`
 // Rust-colored ice fractures cut across pale water-ice plates.
 float europaCracks=1.0-smoothstep(.012,.043,abs(solarFine-.5));
 float europaBranches=1.0-smoothstep(.008,.027,abs(solarField-.46));
 base=mix(vec3(.51,.62,.63),vec3(.86,.85,.75),solarField);
 base=mix(base,vec3(.42,.18,.08),max(europaCracks,europaBranches*.55)*.85);`,
 ganymede:`
 float ganymedeGrooves=pow(.5+.5*sin(solarN.x*76.0+solarN.z*39.0+solarField*8.0),9.0);
 float oldTerrain=smoothstep(.5,.62,solarField);
 base=mix(vec3(.32,.3,.25),vec3(.65,.63,.51),solarFine);
 base*=1.0-oldTerrain*.34;
 base=mix(base,vec3(.73,.7,.59),ganymedeGrooves*(1.0-oldTerrain)*.37);`,
 callisto:`
 base=mix(vec3(.115,.13,.13),vec3(.29,.3,.27),solarField);
 float valhalla=length((solarUV-vec2(.25,.2))/vec2(.7,.62));
 float valhallaRings=pow(.5+.5*cos(valhalla*57.0),12.0)*exp(-valhalla*1.8);
 base+=vec3(.16,.17,.15)*valhallaRings;
 base+=vec3(.25,.25,.21)*smoothstep(.76,.85,solarFine);`,
 titan:`
 base=mix(vec3(.22,.115,.045),vec3(.56,.32,.105),solarField);
 float titanDunes=pow(.5+.5*sin(solarN.x*123.0+solarField*6.0),9.0);
 base*=1.0-titanDunes*.2;
 float methaneLakes=smoothstep(.61,.72,solarFine)*smoothstep(.55,1.1,solarUV.y);
 base=mix(base,vec3(.055,.047,.035),methaneLakes*.9);`,
 enceladus:`
 base=mix(vec3(.63,.72,.74),vec3(.92,.94,.88),solarField);
 float tigerStripes=(1.0-smoothstep(.02,.08,abs(sin(solarN.x*43.0+solarN.z*17.0+solarField*1.4))))*smoothstep(.65,1.15,-solarUV.y);
 base=mix(base,vec3(.16,.36,.43),tigerStripes*.75);`,
 mimas:`
 base=mix(vec3(.31,.34,.34),vec3(.63,.66,.63),solarField);
 float herschel=length((solarUV-vec2(.12,.05))/vec2(.58,.55));
 base*=mix(.48,1.0,smoothstep(.6,.94,herschel));
 base+=vec3(.2,.21,.2)*exp(-pow((herschel-.98)*12.0,2.0));
 base+=vec3(.12)*exp(-herschel*herschel*115.0);`,
 tethys:`
 base=mix(vec3(.52,.59,.6),vec3(.82,.85,.8),solarField);
 float ithaca=abs(solarN.x*.77+solarN.y*.43+sin(solarN.z*4.0)*.08);
 base=mix(base,vec3(.29,.39,.4),(1.0-smoothstep(.009,.038,ithaca))*.75);`,
 dione:`
 base=mix(vec3(.3,.33,.32),vec3(.58,.63,.59),solarField);
 float dioneWisps=1.0-smoothstep(.014,.048,abs(solarFine-.48));
 base=mix(base,vec3(.79,.85,.82),dioneWisps*.8);`,
 rhea:`
 base=mix(vec3(.4,.43,.41),vec3(.71,.74,.68),solarField);
 base=mix(base,vec3(.84,.86,.79),smoothstep(.73,.85,solarFine)*.65);
 base*=.9+.19*detail;`,
 hyperion:`
 float spongePits=smoothstep(.54,.7,solarFine);
 base=mix(vec3(.39,.29,.18),vec3(.65,.5,.31),solarField);
 base=mix(base,vec3(.055,.047,.036),spongePits*.95);`,
 iapetus:`
 float cassiniDark=1.0-smoothstep(-.16,.16,solarN.x+(solarField-.5)*.16);
 base=mix(vec3(.78,.8,.72),vec3(.065,.045,.03),cassiniDark);
 float equatorialRidge=1.0-smoothstep(.012,.042,abs(solarUV.y));
 base=mix(base,vec3(.39,.34,.25),equatorialRidge*.55);`,
 miranda:`
 base=mix(vec3(.3,.36,.37),vec3(.62,.69,.67),solarField);
 float coronaChevron=abs(abs(solarN.x*.9+solarN.z*.3)-solarN.y*.64-.22);
 base=mix(base,vec3(.79,.81,.72),(1.0-smoothstep(.012,.05,coronaChevron))*.8);
 base*=.82+.18*step(.46,solarFine);`,
 ariel:`
 base=mix(vec3(.42,.5,.52),vec3(.76,.81,.77),solarField);
 float arielCanyons=1.0-smoothstep(.012,.042,abs(solarFine-.51));
 base=mix(base,vec3(.17,.25,.28),arielCanyons*.65);`,
 umbriel:`
 base=mix(vec3(.13,.16,.17),vec3(.29,.32,.31),solarField);
 float wunda=length((solarUV-vec2(.18,.83))/vec2(.17,.16));
 base=mix(base,vec3(.67,.7,.61),exp(-pow((wunda-.8)*9.0,2.0))*.9);`,
 titania:`
 base=mix(vec3(.31,.27,.25),vec3(.59,.55,.47),solarField);
 float titaniaFaults=1.0-smoothstep(.015,.04,abs(solarFine-.46));
 base=mix(base,vec3(.17,.15,.15),titaniaFaults*.75);
 base+=vec3(.095,.055,.04)*smoothstep(.69,.8,solarField);`,
 oberon:`
 base=mix(vec3(.22,.21,.2),vec3(.49,.47,.42),solarField);
 float oberonFloors=smoothstep(.72,.82,solarFine);
 base=mix(base,vec3(.32,.15,.09),oberonFloors*.8);
 base+=vec3(.14,.14,.12)*smoothstep(.83,.91,solarFine);`,
 triton:`
 // Nitrogen frost has a pink cast, with dark wind-stretched plume deposits.
 base=mix(vec3(.47,.48,.46),vec3(.83,.65,.62),solarField);
 float nitrogenCap=smoothstep(.33,1.0,-solarUV.y);
 base=mix(base,vec3(.86,.77,.74),nitrogenCap*.72);
 float plumeDeposit=pow(smoothstep(.63,.79,solarFine),2.0)*(1.0-smoothstep(.6,1.0,solarUV.y));
 base=mix(base,vec3(.15,.19,.19),plumeDeposit*.78);`,
 nereid:`
 base=mix(vec3(.2,.25,.27),vec3(.49,.54,.51),solarField);
 base=mix(base,vec3(.65,.66,.57),smoothstep(.74,.86,solarFine)*.6);`,
 proteus:`
 base=mix(vec3(.105,.13,.14),vec3(.27,.3,.29),solarField);
 float pharos=length((solarUV-vec2(-.12,.04))/vec2(.49,.46));
 base*=mix(.45,1.0,smoothstep(.65,1.0,pharos));
 base+=vec3(.11,.12,.11)*exp(-pow((pharos-.95)*12.0,2.0));`,
 ceres:`
 base=mix(vec3(.13,.15,.15),vec3(.32,.34,.31),solarField);
 vec2 occator=solarUV-vec2(.14,.18);
 float saltSpots=exp(-dot(occator*vec2(29.0,37.0),occator*vec2(29.0,37.0)));
 vec2 cerealia=occator-vec2(.063,-.022);
 saltSpots+=exp(-dot(cerealia*vec2(38.0,47.0),cerealia*vec2(38.0,47.0)))*.8;
 base=mix(base,vec3(.88,.87,.73),clamp(saltSpots,0.0,1.0));`,
 pluto:`
 base=mix(vec3(.32,.17,.105),vec3(.65,.45,.28),solarField);
 // Tombaugh Regio's iconic heart-like nitrogen basin, not a random patch.
 vec2 heartPoint=(solarUV-vec2(.12,-.12))/vec2(.62,.57);
 float heartCircle=dot(heartPoint,heartPoint)-1.0;
 float heartShape=heartCircle*heartCircle*heartCircle-heartPoint.x*heartPoint.x*heartPoint.y*heartPoint.y*heartPoint.y;
 float heartBasin=1.0-smoothstep(-.065,.065,heartShape);
 base=mix(base,vec3(.81,.74,.58),heartBasin*.95);
 base=mix(base,vec3(.74,.65,.52),smoothstep(1.13,1.4,solarUV.y)*.65);`,
 charon:`
 base=mix(vec3(.27,.29,.29),vec3(.58,.59,.53),solarField);
 float mordorCap=smoothstep(.72,1.25,solarUV.y);
 base=mix(base,vec3(.31,.13,.085),mordorCap*.85);
 float charonChasm=abs(solarUV.y+.16+sin(solarUV.x*2.0)*.08);
 base=mix(base,vec3(.13,.16,.17),(1.0-smoothstep(.012,.045,charonChasm))*.7);`,
 nix:`
 base=mix(vec3(.49,.54,.53),vec3(.8,.81,.73),solarField);
 float nixRedSpot=1.0-smoothstep(.17,.29,length(solarUV-vec2(.15,.2)));
 base=mix(base,vec3(.49,.23,.14),nixRedSpot*.8);`,
 hydra:`
 base=mix(vec3(.6,.66,.64),vec3(.88,.9,.8),solarField);
 base*=1.0-smoothstep(.69,.83,solarFine)*.23;`,
 kerberos:`
 base=mix(vec3(.27,.29,.28),vec3(.52,.54,.48),solarField);
 base*=.88+.16*detail;
 base=mix(base,vec3(.7,.7,.61),smoothstep(.76,.87,solarFine)*.4);`,
 styx:`
 base=mix(vec3(.34,.37,.37),vec3(.67,.7,.64),solarField);
 base*=.9+.2*detail;`,
 haumea:`
 base=mix(vec3(.63,.73,.77),vec3(.91,.93,.87),solarField);
 float haumeaRedSpot=1.0-smoothstep(.25,.48,length((solarUV-vec2(.13,-.06))*vec2(1.0,1.6)));
 base=mix(base,vec3(.47,.27,.21),haumeaRedSpot*.72);`,
 hiiaka:`
 base=mix(vec3(.47,.63,.7),vec3(.81,.87,.85),solarField);
 base=mix(base,vec3(.26,.43,.5),(1.0-smoothstep(.016,.045,abs(solarFine-.48)))*.4);`,
 namaka:`
 base=mix(vec3(.43,.44,.42),vec3(.73,.74,.65),solarField);
 base=mix(base,vec3(.47,.31,.22),smoothstep(.65,.8,solarFine)*.26);`,
 makemake:`
 base=mix(vec3(.38,.16,.08),vec3(.73,.43,.21),solarField);
 float methaneFrost=smoothstep(.72,.86,solarFine)*(.4+.6*smoothstep(.3,1.3,abs(solarUV.y)));
 base=mix(base,vec3(.87,.77,.58),methaneFrost*.8);`,
 mk2:`
 base=mix(vec3(.043,.035,.03),vec3(.14,.105,.075),solarField);
 base+=vec3(.045,.027,.013)*smoothstep(.71,.85,solarFine);`,
 eris:`
 base=mix(vec3(.72,.76,.76),vec3(.95,.94,.86),solarField);
 base=mix(base,vec3(.75,.64,.62),(1.0-smoothstep(.012,.039,abs(solarFine-.48)))*.22);`,
 dysnomia:`
 base=mix(vec3(.09,.12,.14),vec3(.27,.31,.32),solarField);
 base=mix(base,vec3(.46,.49,.45),smoothstep(.77,.88,solarFine)*.5);`
};

/** A scoped fragment-main snippet; existing non-Solar worlds remain unchanged. */
export function solarSurfaceGLSL(body,options={}){
 if(!body?.realSolar)return '';
 const rawId=body.solarId||body.realSolarId||(typeof body.realSolar==='string'?body.realSolar:body.id);
 const id=String(rawId||'').toLowerCase().replace(/^(?:sol|solar|real)[-_:]/,'');
 const source=SURFACES[id];if(!source)return '';
 // Different worlds cannot accidentally share the same noise phase. Keep the
 // constants bounded for mobile/Chromebook fragment precision, and avoid RNG.
 const seed=[...id].reduce((n,c)=>n+c.charCodeAt(0),0)%97;
 return `\n{ // real-solar-surface:${id}
 vec3 solarN=normalize(p);
 vec2 solarUV=vec2(atan(solarN.x,solarN.z+.000001),asin(clamp(solarN.y,-1.0,1.0)));
 float solarField=groundNoise(solarN*8.0+${(seed*.137).toFixed(4)});
 float solarFine=groundNoise(solarN*31.0+${(seed*.223+3.7).toFixed(4)});
 glow=vec3(0.0);
 ${source}
 ${solarFinishGLSL(body,id,options)}
}\n`;
}
