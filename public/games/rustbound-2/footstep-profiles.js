import {REAL_SOLAR} from './universe.js';
import {createRealSolarSystem} from './real-solar-system.js';
import {solarFootsteps} from './real-solar-footsteps.js';
// Original contact sounds: a boot heel, a sole scuff and small, damped fragments.
import {OUTER_FOOTSTEPS} from './outer-footsteps.js';
// Vacuum worlds are deliberately close and dry: these are vibrations through the suit,
// not sounds travelling through an atmosphere. Variations share a material character.
const worlds={
 cinder: ['Fine red dust',             .31,57,37,.79,.16,.30,15,480, .16, 910,135,.08],
 luma:   ['Loose lunar regolith',      .29,51,43,.83,.11,.22,19,330, .19, 710,175,.05],
 ferrum: ['Heavy iron grit',           .33,69,34,.85,.25,.22,22,1100,.25,1780,100,.18],
 shard:  ['Fractured metal flakes',    .35,75,40,.73,.34,.18,29,1920,.24,2650,110,.20],
 viridia:['Damp mineral soil',         .34,49,30,.77,.18,.41,13,270, .13, 640,150,.05],
 nix:    ['Powder snow over hard ice', .38,62,36,.76,.29,.35,23,1240,.18,2100, 85,.11],
 ember:  ['Dry volcanic cinders',      .32,65,40,.84,.38,.20,28,770, .25,1340,165,.10],
 zephyr: ['Deep amber sand',           .38,46,30,.76,.17,.50,17,410, .10, 820,190,.03],
 opal:   ['Small turquoise crystals',  .37,73,39,.70,.24,.24,22,2310,.17,3290, 90,.15],
 bastion:['Dense fractured basalt',    .30,60,46,.89,.28,.16,17,580, .23,1150,145,.10],
 plon:   ['Brittle ice crust',         .39,55,32,.80,.31,.31,26,1450,.20,2380, 80,.13],
 kiln:   ['Baked iron scales',         .31,80,45,.78,.37,.19,26,1530,.26,2240,130,.17],
 dusk:   ['Wet salt shoreline',        .36,44,28,.81,.22,.42,16,360, .11, 730,140,.04],
 rime:   ['Packed blue snow',          .41,52,31,.84,.33,.46,31,920, .16,1740,105,.09],
 saffron:['Coarse salt dunes',         .40,48,33,.79,.32,.48,34,1350,.13,2020,160,.06],
 moss:   ['Soft mineral growth',       .37,42,26,.86,.12,.39,11,240, .10, 530,185,.03],
 perle:  ['Smooth pearl terraces',     .32,77,43,.75,.15,.16,11,2760,.11,3610, 75,.12],
 vitria: ['Sharp violet glass grit',   .36,71,42,.73,.40,.27,32,2580,.21,3460,100,.16],
 cobalt: ['Coarse cobalt slabs',       .34,67,32,.88,.28,.22,20,980, .26,1650, 85,.19],
 silva:  ['Thin silver ice splinters', .40,64,35,.72,.30,.32,27,2120,.18,3020, 70,.13],
 relic:  ['Hollow weathered stone',    .39,54,24,.83,.23,.23,18,470, .20, 980, 65,.14],
 veil:   ['Blue crystal scree',        .38,81,37,.70,.28,.29,25,1840,.19,2870, 78,.17],
 hush:   ['Deep frost over old ice',   .42,45,29,.82,.22,.48,21,690, .14,1430,120,.07],
 arc:    ['Brittle charged ore',       .33,85,41,.76,.36,.23,30,1710,.24,2520,125,.18],
 surge:  ['Coarse obsidian fragments', .35,63,36,.85,.42,.25,31,1170,.26,1940,135,.14],
 still:  ['Dry crystalline snow',      .43,59,30,.78,.27,.49,28,1610,.16,2670,110,.10],
 vanta:  ['Black basalt and charcoal', .34,56,35,.87,.24,.28,23,620, .20,1260,150,.08],
 cauter: ['Hollow pumice and slag',    .33,72,42,.71,.40,.23,32,890, .21,1590,125,.11],
 rill:   ['Compact copper-salt crust',.35,61,36,.82,.29,.33,25,1480,.16,2190,145,.09],
 fervor: ['Dense iron-red clinker',   .32,68,43,.89,.35,.21,26,1060,.25,1820,155,.13],
 tessera:['Thin golden silica plates',.38,79,38,.72,.34,.25,29,2410,.18,3380, 82,.14],
 briar:  ['Rough mineral-seamed stone',.36,53,31,.86,.30,.26,21,540, .22,1080,105,.10],
 halcyon:['Jade terraces and chalk',  .33,74,40,.78,.20,.31,18,1530,.13,2470,115,.10],
 flint:  ['Pitted metal and oxide grit',.35,83,37,.85,.33,.27,28,1640,.25,2370, 93,.18],
 morrow: ['Broad powdery ice plates', .42,50,30,.84,.28,.45,24,1180,.17,2240, 88,.12],
 eidolon:['Angular red impact glass',.39,70,39,.74,.41,.28,33,2230,.22,3170, 95,.15],
 censer: ['Porous soot-black scoria', .36,58,33,.75,.36,.34,30,730, .17,1310,155,.07],
 gloam:  ['Ribbed frost and dry snow',.44,47,28,.81,.25,.50,27,1030,.14,1880,120,.08],
 fulcrum:['Scoured basalt and ore dust',.32,82,44,.88,.31,.19,24,1290,.23,2030,140,.15],
 skein:  ['Fine conductive crystals',.40,76,36,.73,.29,.30,31,2670,.18,3520, 77,.14],
 quench: ['Thick cracked gray ice',   .41,54,29,.88,.32,.40,25,1360,.21,2320, 81,.13]
};
// Each world is an authored contact sequence, not a transposed version of one sample.
// Layer: material mechanism, onset, length, level, friction colour, contact density.
// Impact: fracture mechanism, onset, length, level, body frequency, count, scatter.
// Toe: delay, pressure, length. Platform: panel, roll delay, pressure, ribs, damping,
// entrained surface material. Sparse impacts run only over their own short windows.
const signatures={
 cinder:{gesture:'Heel packs dust, toe brushes red grit',toe:[.039,.19,.046],layers:[['powder',.004,.120,.34,510,19],['scrape',.041,.110,.16,1260,24]],impacts:[['grain',.028,.018,.11,740,5,.071]],modes:[[171,.034,.026]],platform:[133,.035,.16,24,37,.18]},
 luma:{gesture:'A soft lunar compression with lazy settling grains',toe:[.057,.13,.065],layers:[['powder',.009,.185,.41,330,11],['grain',.076,.110,.13,720,17]],impacts:[['grain',.058,.024,.10,470,4,.117]],modes:[[112,.025,.027]],platform:[111,.055,.13,17,43,.22]},
 ferrum:{gesture:'Weighty iron crunch, followed by compact metallic chatter',toe:[.026,.30,.033],layers:[['crunch',.004,.082,.26,1450,49],['rattle',.047,.087,.23,1820,36]],impacts:[['clack',.014,.022,.17,415,3,.055]],modes:[[264,.071,.026],[591,.036,.019]],platform:[183,.023,.24,42,30,.14]},
 shard:{gesture:'Thin flakes snap, then skitter away in a staggered cascade',toe:[.022,.22,.029],layers:[['rattle',.010,.142,.29,2260,63],['scrape',.069,.069,.12,3100,21]],impacts:[['plate',.012,.016,.13,760,6,.128]],modes:[[406,.045,.021]],platform:[214,.019,.19,57,28,.17]},
 viridia:{gesture:'Damp soil compresses and releases under a slow sole roll',toe:[.063,.15,.072],layers:[['wet',.006,.147,.47,440,9],['fiber',.065,.136,.18,780,16]],impacts:[['grain',.086,.024,.065,260,3,.048]],modes:[[137,.019,.027]],platform:[124,.057,.14,20,48,.24]},
 nix:{gesture:'Hard ice taps underneath a short fresh-snow crush',toe:[.031,.22,.040],layers:[['crunch',.009,.084,.23,1900,42],['powder',.027,.145,.32,1140,27]],impacts:[['crack',.017,.019,.13,1380,2,.025]],modes:[[333,.041,.022]],platform:[177,.029,.19,35,36,.19]},
 ember:{gesture:'Dry cinders collapse in several gritty little snaps',toe:[.045,.24,.038],layers:[['crunch',.006,.126,.32,1480,38],['grain',.068,.101,.22,850,45]],impacts:[['chip',.028,.014,.14,680,7,.099]],modes:[[213,.027,.019]],platform:[152,.041,.21,47,40,.20]},
 zephyr:{gesture:'A deep sand whump with a long dragging release',toe:[.081,.10,.083],layers:[['powder',.007,.171,.44,260,13],['rub',.061,.202,.23,690,8]],impacts:[['grain',.136,.027,.07,510,5,.081]],modes:[[98,.033,.031]],platform:[102,.072,.11,13,53,.26]},
 opal:{gesture:'Small crystal beads crush and tumble under the toe',toe:[.033,.17,.034],layers:[['crunch',.010,.090,.23,2810,62],['rattle',.048,.123,.17,3260,49]],impacts:[['chip',.016,.014,.14,1810,8,.136]],modes:[[843,.024,.013]],platform:[229,.030,.15,58,39,.16]},
 bastion:{gesture:'A blunt basalt knock with one close fractured slab',toe:[.029,.34,.030],layers:[['scrape',.014,.072,.19,720,18],['grain',.050,.061,.14,1110,21]],impacts:[['clack',.009,.033,.24,237,1,0],['crack',.041,.021,.14,640,1,0]],modes:[[189,.071,.031],[387,.035,.019]],platform:[161,.027,.26,21,33,.12]},
 plon:{gesture:'A flexible ice skin gives way after the heel lands',toe:[.053,.19,.048],layers:[['creak',.007,.075,.21,850,10],['powder',.080,.139,.24,1360,24]],impacts:[['crack',.055,.030,.25,1030,1,0],['chip',.087,.017,.11,1740,4,.069]],modes:[[246,.049,.036]],platform:[141,.050,.17,29,42,.21]},
 kiln:{gesture:'Baked scales make a quick papery iron rattle',toe:[.021,.25,.029],layers:[['rattle',.005,.128,.33,2140,83],['rub',.059,.073,.13,1370,31]],impacts:[['plate',.018,.014,.13,970,6,.079]],modes:[[369,.047,.020]],platform:[205,.020,.23,69,31,.15]},
 dusk:{gesture:'Wet salt gives a low sticky step and a gritty peel',toe:[.071,.13,.077],layers:[['wet',.006,.159,.39,340,8],['crunch',.046,.073,.13,1460,26],['rub',.100,.119,.16,620,12]],impacts:[['grain',.084,.023,.08,890,3,.062]],modes:[[121,.027,.033]],platform:[116,.066,.12,18,51,.25]},
 rime:{gesture:'Packed snow compresses with a dense squeaking noise',toe:[.047,.25,.062],layers:[['ice',.008,.178,.33,1050,13],['powder',.052,.132,.27,780,32]],impacts:[['crack',.037,.020,.095,1160,2,.062]],modes:[[157,.033,.028]],platform:[137,.044,.22,32,45,.22]},
 saffron:{gesture:'Coarse salt crunches in three broad pressure pulses',toe:[.061,.16,.057],layers:[['crunch',.008,.158,.36,1850,19],['grain',.073,.150,.21,2270,37]],impacts:[['chip',.026,.021,.12,1280,5,.130]],modes:[[294,.025,.023]],platform:[165,.058,.15,27,44,.23]},
 moss:{gesture:'Spongy mineral growth folds and brushes around the boot',toe:[.084,.09,.090],layers:[['fiber',.010,.189,.40,410,10],['powder',.029,.131,.24,270,7]],impacts:[['grain',.112,.015,.06,620,2,.068]],modes:[[88,.024,.040]],platform:[96,.079,.10,11,56,.27]},
 perle:{gesture:'A clean terrace heel tap and a short chalky sole slip',toe:[.023,.21,.029],layers:[['rub',.027,.086,.27,2510,16],['powder',.061,.061,.10,1160,11]],impacts:[['clack',.008,.020,.18,613,1,0]],modes:[[481,.040,.017],[939,.020,.012]],platform:[223,.022,.18,19,34,.13]},
 vitria:{gesture:'Sharp glass fractures into a crisp trailing spray',toe:[.030,.20,.031],layers:[['crunch',.005,.083,.26,3090,72],['scrape',.052,.124,.16,3550,46]],impacts:[['crack',.014,.014,.17,1720,2,.031],['chip',.044,.012,.12,2470,9,.118]],modes:[[927,.027,.014]],platform:[242,.027,.17,65,35,.17]},
 cobalt:{gesture:'A dense slab thud with a rough metal heel roll',toe:[.040,.31,.046],layers:[['creak',.017,.084,.17,590,14],['scrape',.051,.086,.24,1260,34]],impacts:[['clack',.009,.027,.20,328,2,.041]],modes:[[233,.069,.031],[681,.029,.018]],platform:[189,.037,.27,33,29,.15]},
 silva:{gesture:'Thin silver ice scrapes, then scatters light splinters',toe:[.035,.17,.041],layers:[['ice',.009,.089,.23,2210,22],['scrape',.057,.129,.20,3020,39]],impacts:[['chip',.028,.014,.12,1940,7,.126]],modes:[[587,.035,.018]],platform:[197,.032,.15,51,40,.18]},
 relic:{gesture:'Weathered hollow stone gives a muted double cavity knock',toe:[.065,.25,.042],layers:[['powder',.015,.096,.18,600,14],['rub',.076,.083,.13,1010,18]],impacts:[['clack',.011,.045,.16,164,1,0],['clack',.073,.033,.12,278,1,0]],modes:[[151,.058,.050],[326,.037,.038]],platform:[119,.061,.23,16,26,.15]},
 veil:{gesture:'Dense crystal scree breaks, then clicks through three settles',toe:[.028,.22,.036],layers:[['crunch',.009,.105,.30,2180,34],['grain',.074,.134,.16,2730,29]],impacts:[['chip',.025,.016,.11,1510,3,.018],['chip',.109,.015,.10,2030,3,.052]],modes:[[712,.031,.018]],platform:[218,.026,.20,39,38,.19]},
 hush:{gesture:'Deep frost swallows the heel before an old-ice rub',toe:[.096,.10,.085],layers:[['powder',.009,.205,.46,290,9],['ice',.098,.151,.15,820,12]],impacts:[['grain',.131,.026,.065,550,3,.072]],modes:[[104,.034,.042]],platform:[108,.088,.11,15,58,.28]},
 arc:{gesture:'Brittle ore pops against a short dry stiction rasp',toe:[.024,.25,.035],layers:[['crunch',.007,.070,.24,2010,59],['rub',.039,.119,.25,1540,47]],impacts:[['crack',.019,.018,.18,1170,4,.065]],modes:[[438,.043,.021]],platform:[231,.022,.22,61,32,.16]},
 surge:{gesture:'Obsidian fractures close to the heel, then grinds sharply',toe:[.034,.28,.039],layers:[['crunch',.006,.079,.34,2370,78],['scrape',.059,.109,.24,1740,35]],impacts:[['crack',.011,.016,.20,1430,3,.041],['chip',.078,.012,.09,2220,4,.051]],modes:[[298,.035,.020]],platform:[179,.031,.25,53,36,.20]},
 still:{gesture:'Dry snow crystals crush slowly under each pressure ridge',toe:[.074,.15,.076],layers:[['ice',.017,.199,.29,1730,8],['crunch',.055,.158,.25,2280,17]],impacts:[['chip',.102,.019,.09,1490,4,.107]],modes:[[173,.024,.029]],platform:[149,.069,.14,23,49,.24]},
 vanta:{gesture:'Charcoal collapses with a dull porous crunch and dusty tail',toe:[.052,.19,.056],layers:[['crunch',.008,.119,.31,720,27],['powder',.065,.147,.27,430,20]],impacts:[['grain',.035,.025,.10,560,5,.105]],modes:[[146,.039,.031]],platform:[127,.048,.18,31,46,.23]},
 cauter:{gesture:'Hollow pumice tocks and porous slag crumbles beneath it',toe:[.030,.25,.039],layers:[['fiber',.011,.101,.24,890,29],['grain',.057,.124,.27,1380,42]],impacts:[['clack',.012,.029,.16,394,2,.040],['chip',.081,.015,.10,1010,4,.069]],modes:[[273,.055,.033]],platform:[173,.028,.23,45,35,.19]},
 rill:{gesture:'A copper-salt plate pops, followed by a sandy heel twist',toe:[.046,.20,.047],layers:[['crunch',.017,.096,.21,1700,23],['rub',.070,.122,.27,1130,19]],impacts:[['plate',.013,.026,.19,706,1,0],['grain',.096,.019,.09,1570,4,.057]],modes:[[356,.033,.026]],platform:[157,.043,.18,25,41,.21]},
 fervor:{gesture:'Heavy clinker clacks in a compact, descending rubble cluster',toe:[.025,.31,.036],layers:[['crunch',.005,.077,.27,1250,44],['grain',.046,.090,.20,920,31]],impacts:[['clack',.013,.027,.18,486,3,.053],['chip',.072,.016,.09,1120,3,.044]],modes:[[224,.057,.026]],platform:[169,.024,.28,38,32,.17]},
 tessera:{gesture:'Thin silica plates shear in separate papery slaps',toe:[.038,.18,.036],layers:[['rattle',.011,.154,.27,2840,28],['scrape',.087,.092,.19,3190,56]],impacts:[['plate',.019,.017,.13,1360,4,.119]],modes:[[669,.030,.016]],platform:[236,.034,.16,49,37,.18]},
 briar:{gesture:'Rough seamed stone bites the sole, then drags a coarse grind',toe:[.057,.24,.055],layers:[['scrape',.008,.119,.29,660,31],['rub',.089,.105,.22,960,23]],impacts:[['clack',.014,.028,.14,284,1,0],['grain',.064,.023,.10,810,3,.077]],modes:[[202,.043,.033]],platform:[131,.052,.21,28,40,.20]},
 halcyon:{gesture:'A smooth jade tap through a burst of fine chalk',toe:[.032,.19,.041],layers:[['powder',.008,.128,.28,1170,18],['rub',.050,.098,.17,2160,14]],impacts:[['clack',.009,.021,.14,521,1,0],['grain',.065,.018,.08,1690,3,.059]],modes:[[397,.031,.020]],platform:[193,.030,.17,22,39,.20]},
 flint:{gesture:'Pitted alloy gives two dry knocks and a granular rasp',toe:[.027,.27,.034],layers:[['rattle',.009,.097,.24,1960,53],['scrape',.041,.121,.24,2460,43]],impacts:[['clack',.008,.025,.17,583,1,0],['clack',.041,.019,.13,737,1,0]],modes:[[317,.051,.026]],platform:[211,.025,.24,55,30,.16]},
 morrow:{gesture:'A broad ice plate flexes slowly, then sheds loose powder',toe:[.080,.18,.067],layers:[['creak',.011,.119,.26,610,7],['powder',.108,.153,.28,920,21]],impacts:[['crack',.099,.031,.21,873,1,0],['chip',.128,.017,.085,1560,3,.063]],modes:[[182,.052,.043]],platform:[122,.074,.16,14,47,.25]},
 eidolon:{gesture:'Angular impact glass gives a dry split and uneven sharp debris',toe:[.042,.20,.040],layers:[['crunch',.005,.065,.25,2760,69],['rattle',.063,.147,.23,2270,34]],impacts:[['crack',.016,.017,.22,1950,1,0],['chip',.041,.012,.12,2740,7,.142]],modes:[[763,.026,.015]],platform:[247,.039,.18,59,33,.18]},
 censer:{gesture:'Sooty scoria crinkles softly, with small porous chips',toe:[.062,.15,.067],layers:[['fiber',.013,.156,.32,570,37],['powder',.054,.153,.23,380,17]],impacts:[['chip',.048,.021,.085,720,5,.119]],modes:[[128,.035,.036]],platform:[113,.056,.14,36,50,.26]},
 gloam:{gesture:'Ribbed frost brushes across the sole in grouped crunchy ridges',toe:[.087,.13,.078],layers:[['ice',.011,.154,.24,1260,15],['rub',.064,.208,.29,1690,25]],impacts:[['chip',.091,.021,.08,1020,4,.123]],modes:[[139,.029,.036]],platform:[135,.081,.12,26,55,.25]},
 fulcrum:{gesture:'Scoured basalt knocks hard, with a very short ore-dust drag',toe:[.020,.32,.030],layers:[['scrape',.018,.065,.27,1530,41],['powder',.055,.073,.13,760,22]],impacts:[['clack',.007,.031,.21,362,1,0],['grain',.037,.015,.09,1280,3,.043]],modes:[[279,.060,.027]],platform:[201,.019,.29,44,31,.14]},
 skein:{gesture:'Fine crystal threads snap over a close sand-like fizz',toe:[.048,.15,.048],layers:[['fiber',.008,.126,.25,2930,71],['grain',.047,.166,.23,3490,66]],impacts:[['chip',.024,.010,.10,2420,10,.162]],modes:[[1061,.020,.011]],platform:[254,.044,.14,72,41,.20]},
 quench:{gesture:'Thick gray ice gives a deep creak and one delayed blunt crack',toe:[.066,.23,.059],layers:[['creak',.010,.141,.29,420,6],['ice',.104,.132,.21,1430,18]],impacts:[['crack',.084,.038,.24,634,1,0],['chip',.135,.021,.095,1330,3,.066]],modes:[[132,.064,.047],[289,.029,.033]],platform:[117,.061,.21,12,44,.23]}
};
function freezeTree(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeTree);Object.freeze(value);}return value;}
const fields=['material','duration','heelHz','heelDecay','weight','grit','scuff','fragments','fragmentHz','fragmentGain','ringHz','ringDecay','ringGain'];
export const FOOTSTEP_PROFILES=freezeTree(REAL_SOLAR?solarFootsteps(createRealSolarSystem().bodies):{...Object.fromEntries(Object.entries(worlds).map(([id,values])=>[id,{...Object.fromEntries(fields.map((key,i)=>[key,values[i]])),signature:signatures[id]}])),...OUTER_FOOTSTEPS});
const platforms=Object.fromEntries(Object.entries(FOOTSTEP_PROFILES).map(([id,p])=>[id,freezeTree({material:'Ribbed metal platform',duration:Math.min(.38,p.duration),heelHz:66,heelDecay:39,weight:.82,grit:.16,scuff:.16,fragments:9,fragmentHz:1760,fragmentGain:.12,ringHz:497,ringDecay:25,ringGain:.27,signature:p.signature})]));
export function footstepProfile(body='cinder',surface='gravel'){
 const id=Object.hasOwn(FOOTSTEP_PROFILES,body)?body:'cinder';return surface==='metal'?platforms[id]:FOOTSTEP_PROFILES[id];
}
function hash(text){let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return value>>>0;}
const TAU=Math.PI*2;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

export function synthesizeFootstep(sampleRate,surface='gravel',variant=0,body='cinder'){
 const rate=clamp(Number(sampleRate)||48000,8000,192000),number=Number(variant),v=((Math.floor(Number.isFinite(number)?number:0)%6)+6)%6;
 const id=Object.hasOwn(FOOTSTEP_PROFILES,body)?body:'cinder',material=['metal','regolith','gravel'].includes(surface)?surface:'gravel';
 const ground=FOOTSTEP_PROFILES[id],p=footstepProfile(id,material),s=ground.signature,platform=material==='metal',dust=material==='regolith';
 let seed=hash(`${id}:${material}:${v}`);
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 const jitter=.967+random()*.066,stance=v%2?1.025:.975,timeScale=.967+random()*.066,duration=p.duration+(v%3)*.006;
 const output=new Float32Array(Math.ceil(duration*rate));

 // Broad, damped heel/toe contact is felt through a suit even in a vacuum. The
 // softer toe pressure lands at a different time on every material. None of the
 // following modal components is sustained or reverberated like a musical note.
 function impact(kind,onset,length,gain,hz){
  const start=Math.max(0,Math.floor(onset*rate)),end=Math.min(output.length,Math.ceil((onset+length)*rate));
  const f=clamp(hz*jitter,38,rate*.30),alpha=1-Math.exp(-TAU*Math.min(rate*.32,f*(kind==='chip'?3.8:2.2))/rate);
  let low=0,phase=0;
  const noisy=kind==='crack'?.87:kind==='grain'?.91:kind==='chip'?.72:kind==='plate'?.64:kind==='thud'?.22:.47;
  for(let i=start;i<end;i++){
   const age=(i-start)/rate,u=age/length,white=random()*2-1;
   low+=(white-low)*alpha;
   phase+=TAU*(f+f*.20*Math.exp(-age*170))/rate;
   const body=(Math.sin(phase)+Math.sin(phase*1.471)*.35+Math.sin(phase*2.183)*.18)/1.53;
   const texture=kind==='thud'?low:kind==='grain'?low*.68+(white-low)*.32:kind==='crack'?white-low*.40:white-low*.76;
   const attack=Math.min(1,age/(kind==='thud'?.0028:.0009));
   const envelope=attack*Math.exp(-u*(kind==='thud'?5.5:6.8))*(1-u)*(1-u);
   output[i]+=(body*(1-noisy)+texture*noisy)*gain*envelope;
  }
 }
 function layer(kind,onset,length,gain,colour,density){
  const start=Math.max(0,Math.floor(onset*rate)),end=Math.min(output.length,Math.ceil((onset+length)*rate));
  const cutoff=clamp(colour*(dust?.84:1),100,rate*.33),alpha=1-Math.exp(-TAU*cutoff/rate),bassAlpha=1-Math.exp(-TAU*Math.max(75,cutoff*.17)/rate),pressureDecay=Math.exp(-1/(rate*.0038)),frictionAlpha=1-Math.exp(-TAU*33/rate);
  let low=0,bass=0,pressure=0,friction=0,phase=random()*TAU;
  for(let i=start;i<end;i++){
   const age=(i-start)/rate,u=age/length,white=random()*2-1;
   low+=(white-low)*alpha;bass+=(white-bass)*bassAlpha;
   const band=low-bass,edge=white-low;
   // Contact pressure and stick/slip noise, not a repeating tone. Pressure
   // decays between stochastic grain contacts; grouped friction has a variable
   // speed so snow ridges and metal ribs never make a clean pitched buzz.
   pressure*=pressureDecay;
   if(random()<density/rate)pressure+=.4+random()*.6;
   friction+=(Math.abs(white)-friction)*frictionAlpha;
   phase+=TAU*density*(.72+friction*.65)/rate;
   let sample,attack=.12,tail=2.4;
   if(kind==='powder'){sample=low*.95+edge*.055;attack=.18;tail=2.0;}
   else if(kind==='wet'){sample=bass*1.9+band*.40*(.55+.45*Math.sin(u*Math.PI));attack=.16;tail=2.4;}
   else if(kind==='crunch'){sample=band*(.55+pressure*2.6)+edge*pressure*.55;attack=.055;tail=3.1;}
   else if(kind==='rattle'){sample=band*(.22+pressure*2.8)+edge*pressure*.34;attack=.035;tail=2.1;}
   else if(kind==='grain'){sample=low*(.25+pressure*2.3)+edge*pressure*.23;attack=.12;tail=2.2;}
   else if(kind==='fiber'){sample=band*(.40+Math.abs(Math.sin(phase*.46))*.45)+edge*pressure*.24;attack=.22;tail=2.6;}
   else if(kind==='ice'){sample=band*(.45+Math.abs(Math.sin(phase))*.60)+edge*pressure*.18;attack=.17;tail=2.4;}
   else if(kind==='creak'){sample=(band*1.6+bass*.55)*(.35+Math.abs(Math.sin(phase*.63))*.65);attack=.24;tail=2.3;}
   else if(kind==='rub'){sample=band*(.40+Math.max(0,Math.sin(phase))*.75)+edge*.075;attack=.16;tail=2.3;}
   else{sample=band*.9+edge*.13;attack=.08;tail=2.1;}
   const envelope=Math.min(1,u/attack)*Math.exp(-u*tail)*(1-u)*(1-u)*4.3;
   output[i]+=sample*gain*envelope;
  }
 }
 function cluster(event,level=1){
  const [kind,onset,length,gain,hz,count=1,scatter=0]=event;
  for(let i=0;i<count;i++){
   // Explicitly authored clusters retain their order; a few milliseconds of
   // heel/toe variation avoid machine-gun repetition over six cached takes.
   const offset=count===1?0:scatter*(i+.18+random()*.64)/count;
   impact(kind,(onset+offset)*timeScale,length*(.87+random()*.26),gain*level*(.77+random()*.38),hz*(.81+random()*.38));
  }
 }

 const heel=platform?65:ground.heelHz;
 impact('thud',0,platform?.090:.100,platform?.70:ground.weight*.72,heel);
 if(platform){
  const [panel,roll,pressure,ribs,damping,trace]=s.platform;
  impact('clack',.003,.031,.31,490);
  impact('thud',roll*stance,.060,pressure,panel);
  layer('rattle',.012,.074,.17,2110,ribs);
  layer('rub',roll,.104,.21,1510,ribs);
  // The same ribbed metal deck remains recognisable. Its short structural
  // response and the material carried on the boot give each world's deck a
  // separately authored contact, rather than 41 identical metal buffers.
  impact('clack',roll+.009,1/damping,.12,panel*2.37);
  const [kind,start,length,gain,colour,density]=s.layers[0];
  layer(kind,.025+start,length*.76,gain*trace,colour,density);
  cluster(s.impacts[0],trace*.60);
 }else{
  const [delay,pressure,length]=s.toe;
  impact('thud',delay*timeScale,length,pressure*stance,ground.heelHz*1.13);
  for(const [kind,start,length,gain,colour,density]of s.layers)layer(kind,start*timeScale,length*(dust?1.05:1),gain*(dust&&kind==='powder'?1.12:1),colour,density);
  for(const event of s.impacts)cluster(event);
  for(const [hz,gain,length]of s.modes)impact('clack',.006,length,gain,hz);
 }
 // Gentle saturation, short edge fades and a bounded mix keep even brittle
 // glass pleasant at walking cadence. No compressor pumping or long tails.
 let peak=0,power=0;
 for(let i=0;i<output.length;i++){
  const t=i/rate,fade=Math.min(1,t/.0018)*Math.min(1,(output.length-1-i)/(rate*.025));
  const value=Math.tanh(output[i]*1.65)*.77*fade*fade;
  output[i]=value;peak=Math.max(peak,Math.abs(value));power+=value*value;
 }
 const rms=Math.sqrt(power/output.length),mix=Math.min(peak>0?.74/peak:1,rms>0?clamp(.066/rms,.72,1.65):1);
 for(let i=0;i<output.length;i++)output[i]*=mix;
 return output;
}
