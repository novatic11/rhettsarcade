// Material contact scores: mechanism, heel/toe spacing, friction and break-up.
// These change the physical sequence, rather than transposing one boot sample.
const scores=[
 ['cera','Dry sulfur-salt fans','crunch','rub','chip',51,.083,1740,.039,5,'Salt crust collapses in broad pulses, then the sole twists through fine powder'],
 ['tor','Dense oxide canyon rubble','scrape','grain','clack',82,.019,920,.012,2,'Heavy oxide knocks arrive immediately before a compact gritty heel roll'],
 ['marl','Green-gray ice mosaics','ice','rattle','plate',57,.046,2390,.062,4,'Thin mosaic plates flex, pop and settle into several light clicks'],
 ['pall','Blue pressure-ice curtains','creak','powder','crack',44,.112,680,.096,1,'The heel sinks through snow before a deep pressure-ice fracture releases'],
 ['sleet','Fine needle snow','powder','ice','grain',47,.135,1130,.119,8,'A long soft snow pack gives way to a fine delayed crystalline squeak'],
 ['cairn','Ancient crater terrace gravel','grain','rub','clack',66,.052,590,.023,3,'Rounded old gravel settles in two hollow knocks followed by a dry drag'],
 ['loam','Chalky mineral reef crust','fiber','powder','chip',42,.093,390,.072,6,'Porous mineral reef compresses slowly with brittle chalk flecks around the toe'],
 ['spindle','Silica needle plates','rattle','scrape','plate',78,.027,3140,.018,7,'Thin silica needles split quickly and skitter in a sharp trailing cascade'],
 ['thaw','Turquoise meltglass ice','ice','rub','crack',60,.071,1960,.083,2,'Smooth meltglass grips the sole before two staggered blunt ice snaps'],
 ['brume','Damp fogbank dune sand','wet','powder','grain',43,.121,310,.108,4,'A deep damp sand thump leaves a long soft brushing release'],
 ['sinter','Copper-sinter canyon scales','crunch','rattle','clack',84,.032,1430,.014,4,'Hard sinter scales clack under the heel and scatter in a short descending rattle'],
 ['farrow','Ivory nitrogen salt crust','rub','powder','plate',53,.098,890,.058,1,'An ivory salt skin bends with one papery pop and a broad powder scrape'],
 ['citrine','Golden crystal mirror flakes','crunch','grain','chip',75,.035,3320,.026,10,'Mirror flakes crush brightly and then bounce through a short granular spray'],
 ['karst','Jade sinkhole limestone','rub','fiber','clack',62,.061,780,.009,1,'Smooth dense limestone gives a muted heel tap and a long chalky toe peel'],
 ['ravel','Cobalt ribbon splinters','rattle','rub','plate',81,.022,2160,.048,5,'Flexible cobalt ribbons chatter after the heel, then rasp against the sole'],
 ['wane','Silver glacier palisade snow','ice','scrape','chip',49,.089,2530,.114,6,'Silver ice rubs slowly before a late flutter of small hard splinters'],
 ['drift','Outer plate-ice chessboard','creak','rub','crack',54,.074,520,.066,2,'Broad plates creak under weight and answer with two low offset fractures'],
 ['mote','Lilac impact glass splinters','scrape','grain','chip',69,.043,2870,.017,9,'Lilac glass scrapes sharply into a dense, quickly settling shower of fragments'],
 ['ossuary','Pale hollow arch stone','powder','rub','clack',46,.107,450,.038,2,'Pale porous stone makes two resonant cavity knocks under a soft powdered roll'],
 ['scoria','Rust-cinder volcanic pans','crunch','fiber','chip',71,.047,1320,.028,7,'Porous rust cinders crumble unevenly in several dry, close little snaps'],
 ['wraith','Violet pressure-ice skins','creak','ice','plate',58,.116,1570,.103,3,'A thin violet ice skin shifts with a slow creak and three delayed flat pops'],
 ['vigil','Black-mirror glacier shelves','rub','ice','crack',65,.038,1070,.024,1,'A hard black-ice heel knock is followed by a brief smooth slip and one deep crack'],
 ['knell','Red glass amphitheater shale','rattle','crunch','plate',73,.063,2630,.081,4,'Ruby shale slaps in flat shards, then grinds through a coarse toe crunch'],
 ['cairnsend','Silver frost over salt','powder','rub','grain',40,.142,730,.124,6,'Thick silent frost swallows the heel and releases a wide late salt brush'],
 ['ferrite','Magnetic iron fault plates','scrape','creak','clack',85,.017,1780,.006,2,'Heavy iron plates answer with a fast double heel knock and a short loaded creak'],
 ['lattice','Conductive filament clusters','fiber','rattle','chip',77,.057,3490,.034,12,'Fine conductive filaments tear and fizz before many tiny crystal clicks settle'],
 ['radian','Ion-glazed pressure cliffs','ice','powder','crack',56,.095,2140,.078,3,'An ion-glazed ice shell cracks in three grouped pulses over fine drifting frost'],
 ['circuit','Copper-lined canyon stone','rub','scrape','clack',67,.079,980,.016,1,'A blunt copper-lined stone heel contact stretches into a coarse winding scrape'],
 ['needle','Sapphire needle grit','crunch','scrape','chip',79,.025,3010,.052,8,'Sapphire needles snap early and trail off through a thin bright granular rasp'],
 ['pale','Blue-white frost saltpans','powder','crunch','plate',45,.128,1270,.111,2,'Deep frost compresses first, then two soft salt plates break under the toe']
];
export const OUTER_FOOTSTEPS=Object.fromEntries(scores.map(([id,material,a,b,hit,heel,toe,hz,onset,count,gesture],i)=>[id,{
 material,duration:.31+toe*.8,heelHz:heel,heelDecay:29+i%16,weight:.73+(i%5)*.035,grit:.16+(i%7)*.035,scuff:.21+toe,fragments:9+(i*7)%26,fragmentHz:hz,fragmentGain:.12+(i%6)*.018,ringHz:hz*1.37,ringDecay:80+i*3,ringGain:.045+(i%5)*.015,
 signature:{gesture,toe:[toe,.11+(i%6)*.035,.028+toe*.45],layers:[[a,.005+(i%4)*.004,.07+toe*.8,.26+(i%4)*.045,hz,10+(i*11)%71],[b,toe*.7,.075+toe,.16+(i%5)*.025,hz*.72,9+(i*7)%47]],impacts:[[hit,onset,.013+(i%5)*.006,.11+(i%5)*.026,heel*6.5,count,.026+(i%7)*.017]],modes:[[heel*3.1,.027+(i%4)*.011,.018+(i%5)*.005]],platform:[105+i*4,toe*.75,.12+(i%6)*.025,17+i%49,31+i%24,.14+(i%6)*.017]}
}]));
