import {SOLAR_GEOLOGY,solarCraters} from './solar-geology.js';
// Each finish keeps its world's authored global albedo, then adds geological
// layers and a different close-range material. No downloaded texture seams.
const FEATURES={
 mercury:'float ejecta=pow(.5+.5*sin(solarUV.x*61.0+solarUV.y*13.0),20.0);base+=vec3(.09,.08,.065)*ejecta*solarRim;',
 venus:'float folded=pow(1.0-abs(sin(solarField*19.0+solarN.x*24.0)),5.0);base=mix(base,vec3(.27,.16,.075),folded*.3);base+=vec3(.08,.045,.012)*solarStrata;',
 earth:'float water=smoothstep(.015,.09,base.b-base.r);float uplands=smoothstep(.55,.8,solarFine)*(1.0-water);base=mix(base,vec3(.45,.43,.31),uplands*.3);base=mix(base,vec3(.82,.84,.77),uplands*smoothstep(.78,.93,solarFine)*.6);surfaceRoughness=mix(.91,.19,water);surfaceBump*=1.0-water*.95;',
 moon:'float mare=1.0-smoothstep(.38,.56,solarField);base*=1.0-mare*.14;base+=vec3(.065,.063,.056)*solarRim;',
 mars:'float wind=.5+.5*sin(solarN.x*167.0+solarN.z*35.0+solarField*8.0);base*=1.0-pow(wind,9.0)*.13;base+=vec3(.07,.026,.009)*solarStrata;',
 phobos:'float grooves=pow(.5+.5*sin(solarN.x*91.0+solarN.y*25.0+solarField*2.0),17.0);base*=1.0-grooves*.2;surfaceBump-=grooves*.026;',
 deimos:'base=mix(base,vec3(.46,.39,.30),solarDust*.19);surfaceBump*=.45;',
 ceres:'float salts=exp(-pow(length((solarUV-vec2(.14,.18))*vec2(30.0,38.0)),2.0));base=mix(base,vec3(.94,.91,.79),salts*.93);surfaceRoughness=mix(.91,.56,salts);',
 io:'float flow=(1.0-smoothstep(.008,.025,abs(solarFine-.58)))*smoothstep(.57,.7,solarField);base=mix(base,vec3(.42,.045,.006),flow*.75);glow+=vec3(.65,.08,.004)*flow*.45;surfaceBump-=flow*.023;',
 europa:'float veins=1.0-smoothstep(.012,.033,abs(sin(solarN.x*76.0+solarField*5.0)+sin(solarN.z*57.0)));base=mix(base,vec3(.37,.18,.10),veins*.7);surfaceBump-=veins*.035;',
 ganymede:'float strips=pow(.5+.5*sin(solarN.x*142.0+solarN.z*73.0+solarField*12.0),14.0);base=mix(base,vec3(.77,.78,.67),strips*(1.0-smoothstep(.48,.64,solarField))*.28);',
 callisto:'base+=vec3(.16,.17,.15)*solarRim;base*=.86+solarFine*.2;',
 mimas:'base+=vec3(.14,.15,.14)*solarRim;surfaceBump+=solarRim*.035;',
 enceladus:'float fissures=1.0-smoothstep(.008,.035,abs(sin(solarN.x*123.0+solarN.z*43.0+solarField*4.0)));base=mix(base,vec3(.23,.47,.53),fissures*.3);surfaceBump-=fissures*.026;',
 tethys:'float chasm=1.0-smoothstep(.008,.022,abs(solarN.x*.77+solarN.y*.43+sin(solarN.z*4.0)*.08));base=mix(base,vec3(.19,.3,.34),chasm*.5);surfaceBump-=chasm*.03;',
 dione:'float wisps=pow(1.0-abs(sin(solarFine*35.0+solarN.y*12.0)),11.0);base+=vec3(.16,.19,.17)*wisps*.55;',
 rhea:'base+=vec3(.13,.14,.11)*solarRim;base=mix(base,vec3(.76,.78,.7),solarDust*.13);',
 titan:'float dune=.5+.5*sin(solarN.x*175.0+solarN.z*18.0+solarField*9.0);base*=1.0-pow(dune,9.0)*.23;float lake=smoothstep(.61,.72,solarFine)*smoothstep(.55,1.1,solarUV.y);surfaceRoughness=mix(.98,.23,lake);surfaceBump*=1.0-lake*.95;',
 hyperion:'float holes=smoothstep(.59,.77,solarFine);base=mix(base,vec3(.045,.035,.023),holes*.55);base+=vec3(.12,.085,.043)*solarRim;surfaceBump-=holes*.045;',
 iapetus:'float ridge=exp(-solarN.y*solarN.y*1700.0);base=mix(base,vec3(.39,.31,.22),ridge*.6);surfaceBump+=ridge*.038;',
 miranda:'float terrace=floor((solarFine+solarField)*7.0)/7.0;base*=.8+terrace*.25;float fault=1.0-smoothstep(.009,.025,abs(solarFine-.5));base=mix(base,vec3(.21,.28,.30),fault*.45);',
 ariel:'float valleys=1.0-smoothstep(.012,.041,abs(sin(solarFine*23.0+solarN.z*9.0)));base=mix(base,vec3(.19,.32,.36),valleys*.36);',
 umbriel:'base*=.87+solarFine*.17;base+=vec3(.08,.09,.085)*solarRim;',
 titania:'float fissure=1.0-smoothstep(.007,.023,abs(solarFine-.46));base=mix(base,vec3(.13,.12,.105),fissure*.6);base+=vec3(.048,.018,.007)*solarStrata;',
 oberon:'float floors=smoothstep(.69,.81,solarFine);base=mix(base,vec3(.24,.115,.06),floors*.2);base+=vec3(.08,.077,.06)*solarRim;',
 proteus:'base*=.81+solarStrata*.15+solarFine*.1;base+=vec3(.07,.08,.07)*solarRim;',
 triton:'float cells=pow(1.0-abs(sin(solarField*29.0+solarFine*8.0)),7.0);base=mix(base,vec3(.36,.43,.40),cells*.25);surfaceBump+=cells*.022;',
 nereid:'base+=vec3(.1,.11,.085)*solarRim;surfaceBump+=solarDust*.01;',
 pluto:'float cells=pow(1.0-abs(sin(solarField*33.0+solarFine*11.0)),8.0);float pale=smoothstep(.5,.74,base.r);base*=1.0-cells*pale*.16;surfaceBump-=cells*.022;',
 charon:'float faults=1.0-smoothstep(.008,.027,abs(solarUV.y+.16+sin(solarUV.x*2.0)*.08));base=mix(base,vec3(.085,.12,.13),faults*.65);surfaceBump-=faults*.04;',
 styx:'base*=.91+solarDust*.17;base+=vec3(.08,.085,.07)*solarRim;',
 nix:'float nixPatch=1.0-smoothstep(.14,.25,length(solarUV-vec2(.15,.2)));base=mix(base,vec3(.48,.20,.115),nixPatch*.4);base+=vec3(.08,.085,.07)*solarRim;',
 kerberos:'float saddle=1.0-smoothstep(.08,.26,abs(solarN.x));base*=1.0-saddle*.2;base=mix(base,vec3(.67,.7,.62),solarDust*.12);',
 hydra:'float blocks=step(.64,solarFine);base*=1.0-blocks*.14;surfaceBump+=blocks*.025;',
 haumea:'float crystals=pow(solarDust,8.0);base+=vec3(.08,.11,.12)*crystals;surfaceRoughness=mix(.56,.34,solarDust);',
 hiiaka:'float seams=1.0-smoothstep(.009,.025,abs(solarFine-.48));base=mix(base,vec3(.19,.35,.43),seams*.37);surfaceBump-=seams*.025;',
 namaka:'float seams=1.0-smoothstep(.015,.04,abs(sin(solarField*23.0+solarN.z*7.0)));base=mix(base,vec3(.40,.29,.20),seams*.26);',
 makemake:'float frost=smoothstep(.64,.82,solarFine);base=mix(base,vec3(.9,.81,.65),frost*.22);surfaceRoughness=mix(.92,.54,frost);',
 mk2:'base*=.86+solarFine*.22;base+=vec3(.035,.027,.016)*pow(solarDust,7.0);surfaceBump*=.6;',
 eris:'float sastrugi=pow(.5+.5*sin(solarN.x*117.0+solarField*8.0),14.0);base=mix(base,vec3(.63,.69,.70),sastrugi*.15);surfaceBump+=sastrugi*.017;',
 dysnomia:'base+=vec3(.07,.085,.08)*solarRim;base*=.87+solarDust*.16;'
};
export function solarFinishGLSL(body,id,{detailed=true}={}){
 const profile=SOLAR_GEOLOGY[id];if(!profile)return '';
 const seed=[...id].reduce((s,c)=>s+c.charCodeAt(0),0)%79;
 const craters=solarCraters(id).slice(0,4).map(c=>`{float q=acos(clamp(dot(solarN,vec3(${c.normal.map(v=>v.toFixed(7)).join(',')})),-1.0,1.0))/${c.width.toFixed(5)};float rim=exp(-pow((q-1.0)*9.0,2.0));solarRim=max(solarRim,rim);base*=1.0-${c.depth>0?'.2':'.04'}*exp(-q*q*3.3);base+=vec3(.075,.074,.068)*rim;}`).join('\n');
 return `
 // solar-finish:${id} / ${profile.family}
 float solarStrata=.5+.5*sin(solarField*24.0+solarN.y*37.0+${seed.toFixed(1)});
 float solarDust=${detailed?`groundNoise(p*.57+${(seed*.13).toFixed(3)})`:'solarFine'};
 float solarRim=0.0;
 ${craters}
 surfaceRoughness=${profile.roughness.toFixed(3)};
 float mineralGrain=solarDust-.5;
 base*=.93+solarStrata*.045+solarDust*.075;
 surfaceBump=${detailed?'mineralGrain*.025':'0.0'};
 ${FEATURES[id]||''}
 surfaceRoughness=clamp(surfaceRoughness+mineralGrain*.07,.15,1.0);
 `;
}
export const SOLAR_FINISH_IDS=Object.freeze(Object.keys(FEATURES));
