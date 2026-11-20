(()=>{
'use strict';
const KEY='neon-slip-collection-v1',$=id=>document.getElementById(id),rarities=['Common','Uncommon','Epic','Legendary','Mythic','Godly'],rarityColors=['#c3c9df','#8ddc9b','#b79aff','#ffd481','#ff90cc','#8ef8ff'];
const boxes=[{price:100,odds:[77.99,18,3,.9,.1,.01]},{price:250,odds:[0,79.97,17,2.7,.3,.03]},{price:600,odds:[0,0,86.9,12,1,.1]},{price:1400,odds:[0,0,0,94.5,5,.5]},{price:3000,odds:[0,0,0,0,95,5]},{price:7500,odds:[0,0,0,0,0,100]}];
const skinNames=[
 ['Ice','Coral','Lime','Bolt','Sparrow','Rook','Needle','Beetle','Comet'],
 ['Lagoon','Rose','Amber','Stingray','Orchid','Kestrel','Nautilus','Scorpion','Circuit'],
 ['Amethyst','Plasma','Solar','Obsidian','Tesla','Eclipse','Specter','Lotus','Helix'],
 ['Goldrush','Supernova','Glacier','Monarch','Leviathan','Seraph','Thunderbolt','Avalanche','Inferno'],
 ['Prism','Aurora','Void','Zenith','Nebula','Ouroboros','Astral','Chronos','Singularity']
];
const skinColors=[
 ['#b9e7ff','#ff987e','#d0f18f','#ffe779','#b5caff','#c1c6dc','#e0f7ff','#b4e59f','#ffa875'],
 ['#44dbca','#f987bf','#ffb94f','#6ce0ff','#df9eff','#d6d687','#b6e2ed','#c7d06b','#74f2b0'],
 ['#b89aff','#75a0ff','#fff28a','#aa88c8','#88c8ff','#e6b5fa','#acd0e2','#f5a8df','#91e2ce'],
 ['#ffd371','#ff80af','#e4ffff','#ffc16e','#72e8d1','#fff1c6','#b5c7ff','#d4efff','#ff9165'],
 ['#fca5ff','#8affe0','#c18aff','#fff5ab','#c7adff','#9ef1bc','#b7edff','#ffd9a0','#f29ee7']
];
const extraSkinNames=[
 ['Pebble','Finch','Tern','Cricket','Minnow','Gull','Cobalt','Copper','Slate','Sprout','Firefly','Paperwing','Nomad','Anchor','Kite','Gecko','Compass','Relay'],
 ['Jade','Kingfisher','Mantis','Barracuda','Dragonfly','Sundial','Tangerine','Sabre','Bastion','Surveyor','Moonbat','Violet','Harpoon','Seahorse','Origami','Weaver','Scarab','Starling'],
 ['Runestone','Nightjar','Viper','Corsair','Mirage','Quasar','Cryostorm','Nightblade','Citadel','Parallax','Wraith','Eventide','Poseidon','Wisp','Dreamcatcher','Widow','Anubis','Meteor'],
 ['Diamondback','Sunhawk','Paladin','Dreadnought','Firecrest','Solstice','Maelstrom','Excalibur','Aegis','Pathfinder','Valkyrie','Celestia','Neptune','Tempest','Daybreak','Arachne','Pharaoh','Stardancer'],
 ['Infinity','Polaris','Nemesis','Hyperion','Fae','Equinox','Cosmic Tide','Riftblade','Empyrean','Odyssey','Nightfall','Andromeda','Trinity','Dreamweaver','Serenity','Fate','Osiris','Apotheosis']
];
for(let tier=0;tier<skinNames.length;tier++){
 skinNames[tier].push(...extraSkinNames[tier]);
 skinColors[tier].push(...extraSkinNames[tier].map((_,i)=>'hsl('+((205+tier*41+i*137.508)%360).toFixed(2)+', '+(tier===0?64:82)+'%, '+(tier===3?72:77)+'%)'));
}

skinNames.push(["Genesis","Celestial Clock","Heavenfall","Godstar","Sovereign","Worldgate","Cosmic Hydra","Archangel","Sacred Geometry","Divinity","Eternal Horizon","Sky Cathedral","Big Bang","Imperator","Gatekeeper","Infinity Coil","Soul Reaper","Metatron","Ascension","Firmament","Crystal Deity","Creation","God Emperor","Omniverse","Star Devourer","Final Judgement","The Absolute"]);
skinColors.push(skinNames[5].map((_,i)=>'hsl('+((180+i*19)%360)+',95%,80%)'));
const skins=[{id:'default',name:'Original',tier:-1,color:null},...skinNames.flatMap((names,tier)=>names.map((name,i)=>({id:'skin-'+tier+'-'+i,name,tier,color:skinColors[tier][i]})))];
const collectibleCount=skins.length-1;
const ids=new Set(skins.map(s=>s.id));let data={coins:0,owned:['default'],equipped:'default',runs:0},lastFocus=null,opening=null,reelFrame=null;
function clean(value){const d=value&&typeof value==='object'?value:{};const owned=[...new Set(['default',...(Array.isArray(d.owned)?d.owned.filter(id=>ids.has(id)):[])])];return {coins:Number.isFinite(d.coins)?Math.max(0,Math.min(1e9,Math.floor(d.coins))):0,owned,equipped:owned.includes(d.equipped)?d.equipped:'default',runs:Number.isFinite(d.runs)?Math.max(0,Math.floor(d.runs)):0}}
function read(){try{const saved=localStorage.getItem(KEY);if(saved)data=clean(JSON.parse(saved))}catch(e){}return data}
function save(){data=clean(data);try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}refreshWallet()}
function refreshWallet(){for(const id of ['menu-coins','shop-coins'])if($(id))$(id).textContent=data.coins.toLocaleString()}
function selected(){return skins.find(s=>s.id===data.equipped)||skins[0]}
function color(fallback,phase=0){const s=selected();if(s.tier>=4)return 'hsl('+((phase*45+Number(s.id.split('-')[2])*43)%360)+',90%,76%)';return s.color||fallback}
// Classic keeps run rewards, without initializing the shop or cosmetic renderer.
if(document.body.classList.contains('classic-mode')){read();window.NeonEconomy={awardRun};return}
const polygon=(points,fill='hull',stroke=null,width=.8)=>({kind:'poly',points,fill,stroke,width}),circle=(x,y,r,fill='light',stroke=null,width=.8)=>({kind:'circle',x,y,r,fill,stroke,width}),line=(points,stroke='light',width=1)=>({kind:'line',points,stroke,width});
const designs=[
 {description:'Faceted ice shard',trail:'shards',engines:[0],parts:[polygon([[0,-15],[8,-1],[5,12],[0,8],[-5,12],[-8,-1]]),polygon([[0,-15],[0,8],[-8,-1]],'shade'),polygon([[0,-8],[3,0],[0,4],[-3,0]],'light'),line([[-5,5],[0,2],[5,5]],'accent')]},
 {description:'Split coral fins',trail:'petals',engines:[-4,4],parts:[polygon([[0,-11],[5,-5],[10,-7],[8,8],[4,6],[0,13],[-4,6],[-8,8],[-10,-7],[-5,-5]]),polygon([[0,-8],[3,-3],[0,2],[-3,-3]],'light'),line([[-7,0],[-5,6]],'shade',2),line([[7,0],[5,6]],'shade',2)]},
 {description:'Armored cargo frame',trail:'bars',engines:[-4,4],parts:[polygon([[-5,-12],[5,-12],[8,-6],[8,10],[4,13],[-4,13],[-8,10],[-8,-6]]),polygon([[-4,-7],[4,-7],[4,-1],[-4,-1]],'ink'),line([[-7,4],[7,4]],'light',2),polygon([[-3,7],[3,7],[3,10],[-3,10]],'shade')]},
 {description:'Wide manta wings',trail:'ribbon',engines:[0],parts:[polygon([[0,-14],[5,-3],[12,7],[5,5],[0,13],[-5,5],[-12,7],[-5,-3]]),polygon([[0,-9],[3,-2],[0,2],[-3,-2]],'light'),line([[-9,5],[-3,2],[0,10],[3,2],[9,5]],'shade')]},
 {description:'Petal-wing glider',trail:'petals',engines:[-3,3],parts:[polygon([[0,-13],[6,-8],[9,-1],[5,3],[10,9],[4,11],[0,7],[-4,11],[-10,9],[-5,3],[-9,-1],[-6,-8]]),polygon([[0,-8],[3,-1],[0,5],[-3,-1]],'light'),line([[-6,-4],[-4,2],[-7,8]],'shade'),line([[6,-4],[4,2],[7,8]],'shade')]},
 {description:'Twin-engine hornet',trail:'twin',engines:[-6,6],parts:[polygon([[0,-13],[4,-5],[4,10],[-4,10],[-4,-5]]),polygon([[-6,-6],[-10,0],[-9,12],[-5,9]],'shade'),polygon([[6,-6],[10,0],[9,12],[5,9]],'shade'),polygon([[0,-9],[2,-3],[-2,-3]],'light'),line([[-3,1],[3,1]],'ink',2),line([[-3,6],[3,6]],'ink',2)]},
 {description:'Crystal core + shards',trail:'shards',engines:[0],effect:'shards',parts:[polygon([[0,-14],[7,0],[0,12],[-7,0]]),polygon([[0,-14],[0,12],[-7,0]],'shade'),line([[0,-14],[3,0],[0,12]],'light'),polygon([[-9,-5],[-12,1],[-9,8],[-7,1]],'accent'),polygon([[9,-5],[12,1],[9,8],[7,1]],'accent')]},
 {description:'Twin hulls + reactor',trail:'arcs',engines:[-6,6],effect:'reactor',parts:[polygon([[-6,-13],[-3,-6],[-4,11],[-9,8],[-10,-1]],'hull'),polygon([[6,-13],[3,-6],[4,11],[9,8],[10,-1]],'hull'),line([[-6,1],[6,1]],'accent',3),circle(0,0,3,'light','accent'),polygon([[-7,-8],[-5,-4],[-7,-1]],'shade'),polygon([[7,-8],[5,-4],[7,-1]],'shade')]},
 {description:'Sunburst frame',trail:'rings',engines:[0],effect:'sun',parts:[polygon([[0,-14],[3,-7],[9,-10],[7,-3],[12,1],[6,4],[8,11],[2,8],[0,14],[-2,8],[-8,11],[-6,4],[-12,1],[-7,-3],[-9,-10],[-3,-7]]),circle(0,0,5,'shade'),circle(0,0,2.5,'light')]},
 {description:'Crowned golden racer',trail:'braid',engines:[-5,5],effect:'crown',parts:[polygon([[0,-15],[3,-6],[8,-12],[8,2],[11,7],[5,11],[0,6],[-5,11],[-11,7],[-8,2],[-8,-12],[-3,-6]]),polygon([[0,-8],[3,0],[0,4],[-3,0]],'ink'),line([[-6,4],[0,1],[6,4]],'light'),line([[-7,8],[0,5],[7,8]],'shade')]},
 {description:'Phoenix wings + fire',trail:'flame',engines:[0],effect:'flame',parts:[polygon([[0,-14],[4,-6],[10,-9],[8,-1],[12,2],[8,5],[10,10],[3,7],[0,14],[-3,7],[-10,10],[-8,5],[-12,2],[-8,-1],[-10,-9],[-4,-6]]),polygon([[0,-9],[3,-2],[0,8],[-3,-2]],'light'),line([[-8,-3],[-5,2],[-8,5]],'shade'),line([[8,-3],[5,2],[8,5]],'shade')]},
 {description:'Ice spear + satellites',trail:'spikes',engines:[-3,3],effect:'ice',parts:[polygon([[0,-16],[4,-5],[9,-1],[6,3],[10,9],[3,7],[0,13],[-3,7],[-10,9],[-6,3],[-9,-1],[-4,-5]]),polygon([[0,-16],[0,13],[-4,-5]],'shade'),line([[0,-12],[2,0],[0,9]],'light'),polygon([[-10,-9],[-12,-3],[-8,-5]],'accent'),polygon([[10,-9],[12,-3],[8,-5]],'accent')]},
 {description:'Orbiting prisms + sparks',trail:'prism',engines:[0],effect:'prism',parts:[polygon([[0,-13],[8,0],[0,12],[-8,0]],'hull','light'),polygon([[0,-13],[0,12],[-8,0]],'shade'),polygon([[0,-5],[3,0],[0,5],[-3,0]],'light')]},
 {description:'Aurora wings + ribbons',trail:'aurora',engines:[-4,4],effect:'aurora',parts:[polygon([[0,-12],[4,-4],[10,-11],[12,-3],[7,7],[3,10],[0,6],[-3,10],[-7,7],[-12,-3],[-10,-11],[-4,-4]]),polygon([[0,-12],[2,-2],[0,11],[-2,-2]],'light'),line([[-9,-5],[-6,0],[-7,5]],'accent',1.5),line([[9,-5],[6,0],[7,5]],'accent',1.5)]},
 {description:'Black-hole core + orbit',trail:'void',engines:[],effect:'void',parts:[circle(0,0,8,'ink','hull',1.5),circle(0,0,4,'ink'),polygon([[0,-14],[3,-10],[-3,-10]],'accent'),polygon([[0,14],[3,10],[-3,10]],'accent'),line([[-7,-4],[0,-6],[7,-4]],'light',1.3)]}
];
const radial=(x,y,outer,inner,tips,rotation=-Math.PI/2,fill='hull')=>polygon(Array.from({length:tips*2},(_,i)=>{const a=rotation+i*Math.PI/tips,r=i%2?inner:outer;return [x+Math.cos(a)*r,y+Math.sin(a)*r]}),fill);
const expandedDesigns=[
 [
  {description:'Lightning-cut dart',trail:'arcs',engines:[0],parts:[polygon([[1,-15],[7,-4],[2,-3],[8,8],[-2,13],[-1,3],[-7,4],[-3,-7]]),line([[1,-10],[-1,-1],[3,0],[0,7]],'light',1.4)]},
  {description:'Swept sparrow wings',trail:'twin',engines:[-2,2],parts:[polygon([[0,-13],[3,-3],[11,1],[9,6],[3,4],[2,11],[0,8],[-2,11],[-3,4],[-9,6],[-11,1],[-3,-3]]),polygon([[0,-8],[2,-2],[-2,-2]],'ink'),line([[-8,3],[-3,2]],'light'),line([[8,3],[3,2]],'light')]},
  {description:'Castled armor plates',trail:'bars',engines:[-5,5],parts:[polygon([[-7,-12],[-3,-12],[-3,-8],[3,-8],[3,-12],[7,-12],[9,-4],[9,9],[5,12],[-5,12],[-9,9],[-9,-4]]),polygon([[-4,-3],[4,-3],[4,1],[-4,1]],'ink'),line([[-7,6],[7,6]],'light',2),line([[0,3],[0,9]],'shade',1.5)]},
  {description:'Long needle racer',trail:'spikes',engines:[0],parts:[polygon([[0,-17],[3,-5],[5,10],[0,7],[-5,10],[-3,-5]]),polygon([[0,-10],[1.5,-3],[0,1],[-1.5,-3]],'light'),polygon([[-8,6],[-3,2],[-3,9]],'shade'),polygon([[8,6],[3,2],[3,9]],'shade')]},
  {description:'Segmented beetle shell',trail:'petals',engines:[-3,3],parts:[polygon([[0,-12],[7,-8],[10,-1],[8,9],[0,13],[-8,9],[-10,-1],[-7,-8]]),line([[0,-10],[0,10]],'ink',1.5),line([[-7,-2],[7,-2]],'light'),line([[-7,4],[7,4]],'shade'),circle(0,-7,2,'light')]},
  {description:'Comet pod + tail fins',trail:'flame',engines:[0],parts:[circle(0,-3,7,'hull'),polygon([[-5,0],[5,0],[7,12],[0,7],[-7,12]]),circle(0,-4,3,'ink'),polygon([[-7,3],[-11,8],[-6,7]],'shade'),polygon([[7,3],[11,8],[6,7]],'shade')]}
 ],
 [
  {description:'Forked stingray wings',trail:'ribbon',engines:[0],parts:[polygon([[0,-15],[5,-5],[13,5],[7,8],[3,3],[0,14],[-3,3],[-7,8],[-13,5],[-5,-5]]),line([[-10,5],[-4,0],[0,8],[4,0],[10,5]],'light'),circle(0,-4,2,'ink')]},
  {description:'Four-petal orchid',trail:'petals',engines:[-2,2],parts:[polygon([[0,-14],[4,-7],[9,-10],[10,-3],[4,1],[9,7],[6,12],[0,6],[-6,12],[-9,7],[-4,1],[-10,-3],[-9,-10],[-4,-7]]),circle(0,-1,3,'light'),line([[0,3],[0,9]],'shade',2)]},
  {description:'Predator nose + talons',trail:'braid',engines:[-4,4],parts:[polygon([[0,-15],[4,-7],[2,-2],[11,-5],[9,8],[5,6],[4,12],[0,8],[-4,12],[-5,6],[-9,8],[-11,-5],[-2,-2],[-4,-7]]),polygon([[0,-10],[2,-5],[0,-2],[-2,-5]],'ink'),line([[-7,1],[-6,7]],'light'),line([[7,1],[6,7]],'light')]},
  {description:'Spiral-shell cruiser',trail:'rings',engines:[-4,4],parts:[circle(0,-2,9,'hull'),polygon([[-5,3],[5,3],[7,12],[0,8],[-7,12]],'shade'),circle(1,-3,5,null,'light',1.2),line([[6,-3],[1,2],[-3,-1],[0,-5],[3,-3]],'ink',1.2)]},
  {description:'Claws + hooked stinger',trail:'spikes',engines:[-5,5],parts:[polygon([[0,-8],[4,-3],[3,8],[0,12],[-3,8],[-4,-3]]),polygon([[-3,-3],[-10,-11],[-11,-4],[-7,2]],'shade'),polygon([[3,-3],[10,-11],[11,-4],[7,2]],'shade'),polygon([[0,-7],[-2,-13],[3,-16],[5,-11],[2,-10]],'accent'),circle(0,-1,2,'light')]},
  {description:'Circuit board + nodes',trail:'bars',engines:[-4,4],effect:'reactor',parts:[polygon([[-6,-12],[6,-12],[6,-6],[10,-6],[10,4],[6,4],[6,11],[-6,11],[-6,4],[-10,4],[-10,-6],[-6,-6]]),polygon([[-3,-5],[3,-5],[3,2],[-3,2]],'ink'),line([[-8,-1],[-4,-1],[-4,7],[4,7],[4,4]],'accent'),circle(-4,7,1.3,'light'),circle(4,4,1.3,'light')]}
 ],
 [
  {description:'Volcanic blade facets',trail:'shards',engines:[-3,3],effect:'shards',parts:[polygon([[0,-16],[9,-1],[4,3],[8,10],[0,7],[-8,10],[-4,3],[-9,-1]]),polygon([[0,-16],[0,7],[-9,-1]],'ink'),line([[0,-9],[4,-1],[0,3],[-3,0]],'light'),polygon([[5,-5],[8,-2],[5,0]],'shade')]},
  {description:'Tesla coils + arc jumps',trail:'arcs',engines:[0],effect:'tesla',parts:[polygon([[0,-13],[4,-5],[4,9],[0,12],[-4,9],[-4,-5]]),circle(-9,1,3,'shade','hull',1.5),circle(9,1,3,'shade','hull',1.5),line([[-9,1],[9,1]],'accent'),circle(0,-3,2.5,'light')]},
  {description:'Eclipse disc + crescent',trail:'void',engines:[0],effect:'eclipse',parts:[circle(0,0,9,'hull'),circle(3,-2,7,'ink'),polygon([[0,-15],[3,-10],[-3,-10]],'light'),polygon([[-6,5],[-9,12],[-3,8]],'shade'),polygon([[6,5],[9,12],[3,8]],'shade')]},
  {description:'Ghost veil + spectral fins',trail:'aurora',engines:[-3,3],effect:'aurora',parts:[polygon([[0,-14],[7,-8],[7,1],[11,7],[6,5],[4,12],[0,7],[-4,12],[-6,5],[-11,7],[-7,1],[-7,-8]]),polygon([[-4,-6],[-1,-6],[-1,-3],[-4,-3]],'ink'),polygon([[1,-6],[4,-6],[4,-3],[1,-3]],'ink'),line([[-3,2],[0,4],[3,2]],'light')]},
  {description:'Lotus petals + light core',trail:'petals',engines:[0],effect:'petals',parts:[polygon([[0,-15],[4,-5],[9,-9],[10,-2],[5,4],[8,10],[0,6],[-8,10],[-5,4],[-10,-2],[-9,-9],[-4,-5]]),polygon([[0,-10],[3,0],[0,7],[-3,0]],'light'),line([[-7,-4],[-4,3]],'shade'),line([[7,-4],[4,3]],'shade')]},
  {description:'Helical twin spines',trail:'braid',engines:[-4,4],effect:'helix',parts:[polygon([[-3,-14],[-7,-7],[-2,0],[-7,7],[-3,12],[0,6],[-3,0],[0,-7]],'hull'),polygon([[3,-14],[7,-7],[2,0],[7,7],[3,12],[0,6],[3,0],[0,-7]],'accent'),line([[-5,-7],[5,-7]],'light'),line([[-3,0],[3,0]],'light'),line([[-5,7],[5,7]],'light')]}
 ],
 [
  {description:'Royal butterfly + crest',trail:'petals',engines:[-2,2],effect:'wings',parts:[polygon([[0,-14],[3,-6],[11,-12],[12,-3],[6,2],[10,8],[5,12],[0,7],[-5,12],[-10,8],[-6,2],[-12,-3],[-11,-12],[-3,-6]]),polygon([[0,-8],[2,0],[0,10],[-2,0]],'ink'),circle(0,-11,1.5,'light'),line([[-9,-7],[-6,-2]],'light'),line([[9,-7],[6,-2]],'light')]},
  {description:'Sea-dragon armored fins',trail:'ribbon',engines:[-4,4],effect:'helix',parts:[polygon([[0,-16],[4,-8],[2,-3],[11,-8],[8,-1],[12,4],[7,6],[9,11],[3,8],[0,14],[-3,8],[-9,11],[-7,6],[-12,4],[-8,-1],[-11,-8],[-2,-3],[-4,-8]]),line([[0,-9],[0,9]],'light',1.5),line([[-6,1],[0,-2],[6,1]],'shade',1.7)]},
  {description:'Six angel wings + halo',trail:'aurora',engines:[0],effect:'wings',parts:[polygon([[0,-14],[4,-3],[3,11],[0,7],[-3,11],[-4,-3]]),polygon([[-3,-5],[-12,-13],[-9,-3],[-13,0],[-8,3],[-12,7],[-4,8]],'accent'),polygon([[3,-5],[12,-13],[9,-3],[13,0],[8,3],[12,7],[4,8]],'accent'),circle(0,-12,5,null,'light'),polygon([[0,-8],[2,-2],[-2,-2]],'light')]},
  {description:'Storm forks + lightning',trail:'arcs',engines:[-5,5],effect:'storm',parts:[polygon([[0,-16],[6,-6],[2,-5],[7,4],[2,3],[0,13],[-2,3],[-7,4],[-2,-5],[-6,-6]]),polygon([[-6,-6],[-11,1],[-6,9],[-4,2]],'shade'),polygon([[6,-6],[11,1],[6,9],[4,2]],'shade'),line([[0,-10],[-2,-2],[2,0],[0,6]],'light',1.5)]},
  {description:'Heavy snowplow + ice jets',trail:'spikes',engines:[-5,5],effect:'ice',parts:[polygon([[0,-14],[10,-8],[12,0],[6,-2],[7,10],[0,7],[-7,10],[-6,-2],[-12,0],[-10,-8]]),polygon([[-5,-5],[5,-5],[3,0],[-3,0]],'shade'),line([[-6,4],[6,4]],'light',2),polygon([[-3,7],[0,12],[3,7]],'accent')]},
  {description:'Flame crown + furnace',trail:'flame',engines:[-4,4],effect:'nova',parts:[polygon([[0,-15],[3,-6],[8,-12],[7,-1],[12,-4],[9,6],[4,11],[0,7],[-4,11],[-9,6],[-12,-4],[-7,-1],[-8,-12],[-3,-6]]),circle(0,1,4,'ink'),radial(0,1,3,1.5,5,0,'light'),line([[-6,4],[-4,8]],'accent'),line([[6,4],[4,8]],'accent')]}
 ],
 [
  {description:'Celestial compass + stars',trail:'prism',engines:[0],effect:'constellation',parts:[radial(0,0,13,5,4),radial(0,0,7,3,4,0,'accent'),circle(0,0,2.5,'light'),line([[0,-10],[0,10]],'ink'),line([[-10,0],[10,0]],'ink')]},
  {description:'Nebula petals + stardust',trail:'aurora',engines:[-3,3],effect:'nebula',parts:[radial(0,-1,12,7,6),circle(0,-1,6,'shade'),radial(0,-1,4,2,3,-Math.PI/2,'light'),polygon([[-3,7],[0,14],[3,7]],'accent')]},
  {description:'Serpent ring + orbit scales',trail:'rings',engines:[],effect:'serpent',parts:[circle(0,0,10,null,'hull',3),polygon([[2,-11],[8,-9],[10,-4],[5,-6],[1,-6]],'accent'),polygon([[-8,5],[-10,11],[-4,8]],'shade'),circle(6,-7,1,'ink'),circle(0,0,3,'light')]},
  {description:'Astral spear + star map',trail:'prism',engines:[0],effect:'constellation',parts:[polygon([[0,-17],[3,-5],[10,-8],[7,0],[12,4],[4,6],[0,13],[-4,6],[-12,4],[-7,0],[-10,-8],[-3,-5]]),polygon([[0,-10],[2,0],[0,8],[-2,0]],'light'),line([[-8,2],[-3,3]],'shade'),line([[8,2],[3,3]],'shade')]},
  {description:'Clockwork dial + moving hands',trail:'bars',engines:[-4,4],effect:'clock',parts:[radial(0,0,12,9,10),circle(0,0,7,'shade','light',.7),circle(0,0,1.6,'light'),polygon([[0,-17],[3,-12],[-3,-12]],'accent'),polygon([[0,16],[3,11],[-3,11]],'accent')]},
  {description:'Gravity cage + spinning core',trail:'void',engines:[],effect:'singularity',parts:[radial(0,0,13,8,3),circle(0,0,6,'ink','light',1),polygon([[0,-10],[3,-5],[-3,-5]],'shade'),polygon([[-8,5],[-3,4],[-5,8]],'shade'),polygon([[8,5],[3,4],[5,8]],'shade')]}
 ]
];

// Eighteen hull families, with a distinct silhouette and fittings at each rarity.
// Keep the original 45 IDs and designs unchanged for existing collections.
function extraDesign(tier,index){
 const w=1+tier*.035,shift=tier*.55,tip=-14-tier*.5;
 const hull=points=>polygon(points.map(([x,y])=>[x*w,y]));
 const families=[
  {description:'Pebble pod + radial fins',trail:'shards',engines:[-3,3],parts:[circle(0,-2,7+shift),hull([[-5,2],[-10,8],[-6,11],[0,7],[6,11],[10,8],[5,2]]),circle(0,-3,3,'ink')]},
  {description:'Swept fighter + feather tips',trail:'twin',engines:[-3,3],parts:[hull([[0,tip],[3,-5],[12,-2],[9,5],[5,3],[3,11],[0,8],[-3,11],[-5,3],[-9,5],[-12,-2],[-3,-5]]),polygon([[0,-9],[2,-3],[0,0],[-2,-3]],'light')]},
  {description:'Forked lance + outriggers',trail:'spikes',engines:[-6,6],parts:[hull([[-2,tip],[-1,-2],[1,-2],[2,tip],[5,-5],[3,8],[-3,8],[-5,-5]]),hull([[-5,-3],[-10,2],[-8,12],[-4,7]]),hull([[5,-3],[10,2],[8,12],[4,7]]),circle(0,3,2,'light')]},
  {description:'Split cruiser + bridge',trail:'bars',engines:[-7,7],parts:[hull([[-7,tip],[-4,-8],[-4,9],[-8,12],[-11,4],[-10,-8]]),hull([[7,tip],[4,-8],[4,9],[8,12],[11,4],[10,-8]]),polygon([[-7,-2],[7,-2],[7,3],[-7,3]],'shade'),circle(0,0,2.8,'light')]},
  {description:'Dragonfly nacelles + four wings',trail:'petals',engines:[0],parts:[hull([[0,tip],[3,-4],[3,8],[0,12],[-3,8],[-3,-4]]),hull([[-2,-6],[-12,-10],[-10,-1],[-2,2]]),hull([[2,-6],[12,-10],[10,-1],[2,2]]),hull([[-2,3],[-10,5],[-7,12],[-2,8]]),hull([[2,3],[10,5],[7,12],[2,8]]),line([[0,-8],[0,5]],'light',1.3)]},
  {description:'Halo skimmer + radial vanes',trail:'rings',engines:[-4,4],parts:[circle(0,0,10+shift,'shade','hull',2),circle(0,0,6,'ink','light',.6),hull([[0,tip],[3,-8],[-3,-8]]),hull([[-9,3],[-12,10],[-5,9]]),hull([[9,3],[12,10],[5,9]]),circle(0,0,2,'light')]},
  {description:'Broad hammerhead + keel',trail:'arcs',engines:[0],parts:[hull([[-12,-8],[-7,tip],[7,tip],[12,-8],[10,-3],[4,-5],[3,9],[0,12],[-3,9],[-4,-5],[-10,-3]]),line([[-8,-8],[8,-8]],'light',1.5),polygon([[0,-4],[2,3],[0,6],[-2,3]],'ink')]},
  {description:'Curved saber + offset engine',trail:'braid',engines:[-4],parts:[hull([[4,tip],[10,-9],[6,-7],[2,0],[0,9],[-5,12],[-9,6],[-6,-3],[-4,-8],[-2,1],[0,2],[3,-6]]),line([[4,-10],[1,-2],[-3,7]],'light',1.2),circle(-4,7,2,'accent')]},
  {description:'Hexagonal shield + armor teeth',trail:'bars',engines:[-4,4],parts:[hull([[0,tip],[9,-7],[11,4],[5,11],[-5,11],[-11,4],[-9,-7]]),polygon([[0,-8],[5,-4],[5,3],[0,7],[-5,3],[-5,-4]],'shade'),line([[-6,-3],[0,-6],[6,-3]],'light'),circle(0,0,2,'accent')]},
  {description:'Survey drone + sensor array',trail:'rings',engines:[-6,6],parts:[hull([[-6,-7],[6,-7],[8,7],[4,11],[-4,11],[-8,7]]),polygon([[-3,-3],[3,-3],[3,3],[-3,3]],'ink'),line([[0,-7],[0,tip]],'accent',1.5),circle(0,tip,2,'light'),circle(-11,0,2,'hull'),circle(11,0,2,'hull'),line([[-11,0],[11,0]],'light',.7)]},
  {description:'Batwing glider + twin tips',trail:'aurora',engines:[-3,3],parts:[hull([[0,-10],[3,-3],[10,tip],[13,-5],[10,4],[7,0],[5,8],[2,6],[0,12],[-2,6],[-5,8],[-7,0],[-10,4],[-13,-5],[-10,tip],[-3,-3]]),polygon([[0,-6],[2,-1],[0,4],[-2,-1]],'light')]},
  {description:'Saucer disc + stacked reactor',trail:'void',engines:[-5,5],parts:[hull([[0,-11],[8,-7],[13,-1],[9,5],[4,7],[0,11],[-4,7],[-9,5],[-13,-1],[-8,-7]]),circle(0,-2,5,'shade','light',.7),line([[-9,0],[9,0]],'accent',1.3),circle(0,-3,2,'light')]},
  {description:'Trident prow + three engines',trail:'spikes',engines:[-7,0,7],parts:[hull([[-8,tip],[-4,-5],[-2,-5],[0,tip-2],[2,-5],[4,-5],[8,tip],[10,7],[5,11],[0,8],[-5,11],[-10,7]]),polygon([[0,-6],[2,1],[0,5],[-2,1]],'light'),line([[-7,3],[-4,6],[4,6],[7,3]],'shade',1.5)]},
  {description:'Curled seahorse + dorsal sail',trail:'ribbon',engines:[-3],parts:[hull([[0,tip],[6,-11],[6,-6],[2,-3],[7,2],[6,8],[1,12],[-5,10],[-7,6],[-4,1],[-1,3],[-3,6],[0,8],[3,5],[2,2],[-4,-2],[-5,-8]]),hull([[-4,-6],[-12,-2],[-8,5],[-5,3]]),circle(2,-9,1.8,'light')]},
  {description:'Folded paper plane + split tail',trail:'shards',engines:[0],parts:[hull([[0,tip-1],[13,10],[3,5],[0,12],[-3,5],[-13,10]]),polygon([[0,tip-1],[0,12],[-3,5],[-13,10]],'shade'),line([[0,tip],[3,5],[0,10]],'light',.8)]},
  {description:'Spider frame + eight struts',trail:'arcs',engines:[-3,3],parts:[hull([[0,-10],[5,-5],[5,6],[0,11],[-5,6],[-5,-5]]),...[-1,1].flatMap(side=>[-8,-3,3,8].map((y,i)=>line([[side*4,y*.7],[side*(9+i%2*2),y],[side*13,y-4]],'hull',1.7))),circle(0,-3,2.5,'light')]},
  {description:'Pyramid prow + stepped wings',trail:'bars',engines:[-5,5],parts:[hull([[0,tip-2],[4,-5],[7,-5],[7,0],[10,0],[10,5],[13,5],[13,11],[0,7],[-13,11],[-13,5],[-10,5],[-10,0],[-7,0],[-7,-5],[-4,-5]]),polygon([[0,-10],[3,0],[0,4],[-3,0]],'ink'),line([[-8,6],[0,3],[8,6]],'light')]},
  {description:'Meteor star + armored heart',trail:'flame',engines:[0],parts:[radial(0,0,12+shift,6,6),circle(0,0,5,'shade','light',.6),polygon([[0,-4],[2.5,0],[0,4],[-2.5,0]],'light')]}
 ];
 const d=families[index];
 if(tier>0){
  // Fittings change the hull outline as well as its color.
  for(const side of [-1,1])d.parts.push(polygon([[side*(7+shift),-6],[side*(10+shift),-9-tier],[side*(12+shift),-1],[side*(8+shift),2]],tier>2?'accent':'shade'));
  d.parts.push(line([[-5,-1-tier],[0,-4-tier],[5,-1-tier]],'accent',.65+tier*.2));
 }
 if(tier>=2){d.parts.push(circle(0,2,2+tier*.3,null,'light',.7));d.description+=' + luminous core'}
 const effects=[null,'reactor','shards','tesla','helix','petals','eclipse','aurora','nova','clock','constellation','nebula','serpent','prism','singularity','void','wings','ice'];
 if(tier>=2)d.effect=effects[(index+tier*3)%effects.length]||'reactor';
 d.description=['Utility','Tuned','Charged','Radiant','Celestial'][tier]+' '+d.description;
 return d;
}
const extraDesigns=extraSkinNames.map((names,tier)=>names.map((_,index)=>extraDesign(tier,index)));

function godlyDesign(index){
 const variant=Math.floor(index/9),shape=index%9,r=variant*.6;
 const forms=[
  {description:'Six-wing seraph + radiant spear',parts:[polygon([[0,-17],[3,-7],[3,9],[0,13],[-3,9],[-3,-7]]),...[-1,1].flatMap(side=>[-8,-1,6].map((y,n)=>polygon([[side*2,y],[side*(13+r),y-7+n],[side*(10+r),y+3],[side*3,y+5]],n%2?'accent':'hull')))]},
  {description:'Celestial orrery + nested stars',parts:[circle(0,0,10+r,'ink','hull',1.5),circle(0,0,7,'shade','accent',.8),radial(0,0,5,2.3,5),...[-1,1].map(side=>polygon([[side*8,-6],[side*14,-11],[side*14,8],[side*9,5]],'hull'))]},
  {description:'Crystal cathedral + floating spires',parts:[polygon([[0,-17],[6,-3],[3,10],[0,6],[-3,10],[-6,-3]],'hull','light',.6),polygon([[0,-17],[0,6],[-6,-3]],'shade'),...[-1,1].map(side=>polygon([[side*10,-13],[side*(14+r),1],[side*10,11],[side*7,1]],'accent','light',.5))]},
  {description:'Living nova + stellar crown',parts:[radial(0,0,13+r,6,7+variant),radial(0,0,9,4,7+variant,-Math.PI/2+.2,'shade'),circle(0,0,5,'ink','light',.7),polygon([[0,-18],[3,-13],[-3,-13]],'light')]},
  {description:'Divine throne + orbiting seals',parts:[polygon([[0,-15],[3,-8],[7,-13],[10,-8],[10,5],[5,11],[0,7],[-5,11],[-10,5],[-10,-8],[-7,-13],[-3,-8]]),polygon([[-6,-3],[6,-3],[6,4],[0,8],[-6,4]],'shade'),line([[-7,0],[0,-3],[7,0]],'light',1.2),...[-1,1].map(side=>circle(side*(13+r),5,2,'accent','light',.6))]},
  {description:'Rift portal + phase blades',parts:[circle(0,0,9+r,'ink','hull',2),circle(0,0,5,'shade','accent',.7),...[-1,1].map(side=>polygon([[side*5,-11],[side*13,-8],[side*15,2],[side*8,10],[side*6,5],[side*11,-1],[side*9,-6]],'hull','light',.5))]},
  {description:'Star serpent + segmented crown',parts:[...Array.from({length:7},(_,n)=>{const a=n*Math.PI*2/7;return polygon([[Math.cos(a)*11,Math.sin(a)*11],[Math.cos(a+.25)*(15+r),Math.sin(a+.25)*(15+r)],[Math.cos(a+.5)*10,Math.sin(a+.5)*10]],n%2?'accent':'hull')}),radial(0,0,6,3,3,-Math.PI/2,'shade')]},
  {description:'Cosmic reaper + crescent wings',parts:[polygon([[0,-17],[4,-5],[2,10],[0,6],[-2,10],[-4,-5]]),...[-1,1].map(side=>polygon([[side*2,-5],[side*11,-13],[side*(15+r),-3],[side*12,9],[side*7,12],[side*10,3],[side*9,-5],[side*4,1]],'hull','accent',.5)),line([[0,-11],[0,5]],'light',1.1)]},
  {description:'Astral mandala + twelve rays',parts:[radial(0,0,13+r,9,12),radial(0,0,10,7,6,-Math.PI/2+.15,'shade'),circle(0,0,6,'ink','accent',.8),radial(0,0,4,1.6,6,-Math.PI/2,'light')]}
 ];
 const d=forms[shape];
 // Three distinct constellations for each hull; every skin has its own fittings.
 for(const side of [-1,1])d.parts.push(polygon([[side*(4+variant),-9],[side*(6+variant),-12-variant],[side*(8+variant),-9],[side*(6+variant),-6]],'light'));
 d.parts.push(circle(0,variant?5:-5,1.2+variant*.4,'accent'));
 d.description+=[' · dawn sigils',' · eclipsed sigils',' · eternal sigils'][variant];
 d.engines=variant===0?[-4,4]:variant===1?[-6,0,6]:[-8,-3,3,8];
 d.trail='divine';d.effect=['constellation','prism','shards','nova','clock','singularity','serpent','aurora','nebula'][shape];
 d.godPattern=index;return d;
}
const godlyDesigns=skinNames[5].map((_,index)=>godlyDesign(index));

for(const s of skins)if(s.tier>=0){const index=Number(s.id.split('-')[2]);s.design=s.tier===5?godlyDesigns[index]:index<3?designs[s.tier*3+index]:index<9?expandedDesigns[s.tier][index-3]:extraDesigns[s.tier][index-9];s.description=s.design.description}
function palette(s,phase=0,boost=false){return {hull:boost?'#8edcff':s.tier===5?'hsl('+((phase*25+Number(s.id.split('-')[2])*19+180)%360)+',95%,80%)':s.color||'#8edcff',shade:s.tier===5?'#173c65':s.tier===4?'#582c91':'#25385d',ink:'#10182c',light:'#f8fcff',accent:s.tier===5?'hsl('+((phase*40+Number(s.id.split('-')[2])*19+270)%360)+',100%,88%)':s.tier===4?'hsl('+((phase*65+170)%360)+',90%,74%)':s.tier===3?'#fff2b3':s.tier===2?'#f5b1ff':'#cafff5',engine:s.tier===5?'#efffff':s.tier===3?'#ffb45a':s.tier===4?'#95eaff':'#a2efff'}}
function primitives(s,phase=0,boost=false){const d=s.design;if(!d)return [polygon([[0,-14],[10,9],[4,6],[4,12],[0,9],[-4,12],[-4,6],[-10,9]]),polygon([[0,-6],[3,1],[-3,1]],'light')];const p=d.parts.slice(),length=(boost?20:10)+Math.sin(phase*22)*2;for(const x of d.engines)p.unshift(polygon([[x-1.7,10],[x,12+length],[x+1.7,10]],'engine'));
 if(d.effect==='shards'||d.effect==='ice'){for(const side of [-1,1]){const y=Math.sin(phase*3+side)*2;p.push(polygon([[side*14,-4+y],[side*16,1+y],[side*14,6+y],[side*12,1+y]],'accent'))}}
 if(d.effect==='reactor')p.push(circle(0,0,5+Math.sin(phase*7)*.7,null,'accent',.8));
 if(d.effect==='sun'||d.effect==='crown')p.push(circle(0,0,15,null,'accent',.6));
 if(d.effect==='prism'||d.effect==='void'){p.push(circle(0,0,15,null,'accent',.65));for(let i=0;i<3;i++){const a=phase*1.8+i*Math.PI*2/3,x=Math.cos(a)*15,y=Math.sin(a)*15;p.push(d.effect==='void'?circle(x,y,1.6,'accent'):polygon([[x,y-3],[x+2,y],[x,y+3],[x-2,y]],'accent'))}}
 if(d.effect==='aurora'){for(const side of [-1,1])p.push(line([[side*13,-8],[side*(15+Math.sin(phase*3)),0],[side*11,10],[side*(5+Math.sin(phase*3)),19]],'accent',1.1))}

 if(d.effect==='tesla'||d.effect==='storm'){for(const side of [-1,1]){const wobble=Math.sin(phase*15+side)*2;p.push(line([[side*8,-8],[side*(14+wobble),-3],[side*10,1],[side*(15-wobble),6],[side*7,11]],'accent',.9))}}
 if(d.effect==='eclipse')p.push(circle(Math.sin(phase*2)*2,0,14,null,'accent',.6));
 if(d.effect==='helix'){for(let i=0;i<5;i++)p.push(circle(Math.sin(phase*3+i)*10,-9+i*4,1.1,'accent'))}
 if(d.effect==='petals'||d.effect==='wings'){for(const side of [-1,1]){const flutter=Math.sin(phase*4)*1.5;p.push(polygon([[side*11,-9],[side*(15+flutter),-5],[side*12,0]],'accent'))}}
 if(d.effect==='nova'){for(let i=0;i<4;i++){const a=i*Math.PI/2+phase*.5;p.push(line([[Math.cos(a)*11,Math.sin(a)*11],[Math.cos(a)*16,Math.sin(a)*16]],'engine',1.1))}}
 if(d.effect==='constellation'||d.effect==='nebula'){const stars=Array.from({length:d.effect==='nebula'?6:4},(_,i)=>{const a=phase*.8+i*Math.PI*2/(d.effect==='nebula'?6:4);return [Math.cos(a)*15,Math.sin(a)*15]});p.push(line([...stars,stars[0]],'accent',.4));for(const [x,y] of stars)p.push(radial(x,y,2.5,1,4,phase,'light'))}
 if(d.effect==='serpent'){for(let i=0;i<7;i++){const a=phase*1.1+i*Math.PI*2/7;p.push(polygon([[Math.cos(a)*14,Math.sin(a)*14],[Math.cos(a+.13)*17,Math.sin(a+.13)*17],[Math.cos(a+.26)*14,Math.sin(a+.26)*14]],'accent'))}}
 if(d.effect==='clock'){for(let i=0;i<2;i++){const a=phase*(i?1.5:.25)-Math.PI/2;p.push(line([[0,0],[Math.cos(a)*(i?6:4),Math.sin(a)*(i?6:4)]],i?'light':'accent',1.1))}p.push(circle(0,0,15,null,'accent',.5))}
 if(d.effect==='singularity'){for(let i=0;i<3;i++){const a=phase*1.8+i*Math.PI*2/3;p.push(polygon([[Math.cos(a)*15,Math.sin(a)*15],[Math.cos(a+.5)*11,Math.sin(a+.5)*11],[Math.cos(a+.9)*15,Math.sin(a+.9)*15]],'accent'))}p.push(circle(0,0,3+Math.sin(phase*4)*.8,'hull'))}
 if(s.tier===5){
  const n=3+Math.floor(d.godPattern/9),spin=phase*(.55+d.godPattern%3*.15),radius=14+Math.sin(phase*1.5)*.8;
  p.push(circle(0,0,radius,null,'accent',.5));
  for(let i=0;i<n;i++){const a=spin+i*Math.PI*2/n,x=Math.cos(a)*radius,y=Math.sin(a)*radius;p.push(radial(x,y,2.5,1,4,-a,'light'));}
  p.push(circle(0,0,2+Math.sin(phase*5)*.5,'light'),circle(0,0,4+Math.sin(phase*3)*.4,null,'accent',.7));
 }
 return p}
function drawPrimitives(ctx,parts,colors){for(const p of parts){ctx.beginPath();if(p.kind==='circle')ctx.arc(p.x,p.y,p.r,0,Math.PI*2);else{p.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(p.kind==='poly')ctx.closePath()}if(p.fill){ctx.fillStyle=colors[p.fill]||p.fill;ctx.fill()}if(p.stroke){ctx.strokeStyle=colors[p.stroke]||p.stroke;ctx.lineWidth=p.width;ctx.stroke()}}}
function ship(s,size=54){const colors=palette(s),art=primitives(s,0).map(p=>{const fill=p.fill?(colors[p.fill]||p.fill):'none',stroke=p.stroke?(colors[p.stroke]||p.stroke):'none',attrs=' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+p.width+'" stroke-linejoin="round"';return p.kind==='circle'?'<circle cx="'+p.x+'" cy="'+p.y+'" r="'+p.r+'"'+attrs+'/>':'<'+(p.kind==='poly'?'polygon':'polyline')+' points="'+p.points.map(v=>v.join(',')).join(' ')+'"'+attrs+'/>'}).join('');return '<svg class="skin-ship" data-design="'+s.id+'" viewBox="-18 -19 36 46" width="'+size+'" height="'+size+'" aria-hidden="true">'+art+'</svg>'}
function drawSkin(ctx,phase=0,boost=false){const s=selected();if(!s.design)return false;ctx.save();ctx.shadowBlur=8+s.tier*2;ctx.shadowColor=s.color;drawPrimitives(ctx,primitives(s,phase,boost),palette(s,phase,boost));ctx.restore();return true}
function drawTrail(ctx,tr,phase=0){const s=selected();if(!s.design)return false;const style=s.design.trail,c=palette(s,phase);ctx.save();ctx.translate(tr.x,tr.y);ctx.shadowBlur=0;let p=[];const wave=Math.sin(phase*5+tr.y*.07)*3;
 if(style==='divine'){p=[line([[-5,0],[wave-4,5],[-wave-4,11],[-3,17]],'hull',1.7),line([[5,0],[wave+4,5],[-wave+4,11],[3,17]],'accent',1.7),radial(wave,7,3,1,4,phase,'light'),circle(0,12,4,null,'accent',.7)];}
 else if(style==='shards'||style==='spikes'||style==='prism')p=[polygon([[wave,0],[wave+3,style==='spikes'?15:7],[wave,12],[wave-3,7]],'accent'),polygon([[-5,7],[-3,10],[-5,13],[-7,10]],'hull')];
 else if(style==='petals')p=[polygon([[-4,1],[-1,5],[-4,10],[-7,5]],'hull'),polygon([[4,6],[7,10],[4,15],[1,10]],'accent')];
 else if(style==='bars')p=[line([[-4,3],[4,3]],'hull',3),line([[-3,10],[3,10]],'accent',2)];
 else if(style==='rings'||style==='void')p=[circle(0,7,4+(tr.y%9)/3,null,style==='void'?'accent':'hull',1.5),...(style==='void'?[circle(0,7,3,'ink')]:[])];
 else if(style==='twin'||style==='braid')p=[line([[-5,0],[-5+wave*.5,12]],'hull',2),line([[5,0],[5-wave*.5,12]],'accent',2)];
 else if(style==='arcs')p=[line([[-4,0],[wave,4],[-wave,9],[4,14]],'accent',1.6)];
 else if(style==='flame')p=[polygon([[-5,0],[0,17+wave],[5,0],[1,4]],'engine'),polygon([[-2,0],[0,9],[2,0]],'light')];
 else p=[line([[-4,0],[wave-3,5],[-wave-3,10],[-3,15]],'hull',2),line([[4,0],[wave+3,5],[-wave+3,10],[3,15]],'accent',1.3)];
 drawPrimitives(ctx,p,c);ctx.restore();return true}

function render(){refreshWallet();$('shop-boxes').innerHTML=boxes.map((b,i)=>'<article class="loot-box" data-tier="'+i+'" style="--rarity:'+rarityColors[i]+'"><div class="crate-mark" aria-hidden="true">'+['◇','◈','✦','✧','✺','✵'][i]+'</div><div class="loot-copy"><h3>'+rarities[i]+'</h3><p>'+skinNames[i].length+' skins · '+rarities[i]+(i===rarities.length-1?' guaranteed':' or better')+'</p><details><summary>Drop chances</summary><p>'+b.odds.map((n,j)=>n?rarities[j]+' '+n+'%':'').filter(Boolean).join(' · ')+'</p></details></div><button class="buy-box" data-buy="'+i+'" '+(opening||data.coins<b.price?'disabled':'')+' aria-label="Buy '+rarities[i]+' lootbox for '+b.price+' coins">'+b.price.toLocaleString()+' <span>COINS</span></button></article>').join('');
 $('collection-count').textContent=(data.owned.length-1)+' / '+collectibleCount+' SKINS';$('shop-collection').innerHTML=skins.map(s=>{const owned=data.owned.includes(s.id),equipped=data.equipped===s.id;const heading=s.tier>=0&&s.id.endsWith('-0')?'<h4 class="collection-tier">'+rarities[s.tier]+' <span>'+data.owned.filter(id=>skins.find(item=>item.id===id)?.tier===s.tier).length+' / '+skinNames[s.tier].length+'</span></h4>':'';return heading+'<button class="skin-card '+(owned?'owned':'locked')+(equipped?' equipped':'')+'" data-tier="'+s.tier+'" data-equip="'+s.id+'" '+(!owned?'disabled':'')+' style="--rarity:'+(s.tier<0?'#8edcff':rarityColors[s.tier])+'" aria-pressed="'+equipped+'" aria-label="'+s.name+', '+(s.tier<0?'starter':rarities[s.tier])+', '+(equipped?'equipped':owned?'equip skin':'locked')+'">'+ship(s)+'<b>'+s.name+'</b><span class="skin-description">'+(s.description||'Original frame')+'</span><small>'+(equipped?'EQUIPPED':owned?'TAP TO EQUIP':rarities[s.tier]+' · LOCKED')+'</small></button>'}).join('');
}
function random(){if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296}return Math.random()}
function rollTier(box){let roll=random()*100;for(let i=0;i<box.odds.length;i++){roll-=box.odds[i];if(roll<0)return i}return box.odds.length-1}
function showReward(outcome){const reward=skins.find(s=>s.id===outcome.id),{tier,duplicate,refund}=outcome,result=$('loot-result');result.hidden=false;result.dataset.tier=tier;result.style.setProperty('--rarity',rarityColors[tier]);result.innerHTML='<div class="reward-art" style="--rarity:'+rarityColors[tier]+'">'+ship(reward,92)+'</div><p class="reward-rarity">'+rarities[tier]+'</p><h3>'+reward.name+'</h3><p class="skin-description">'+reward.description+'</p><p>'+(duplicate?'Already collected · +'+refund+' coins refunded':'New skin added to your collection')+'</p><button class="reward-equip" data-equip="'+reward.id+'">'+(data.equipped===reward.id?'EQUIPPED':'EQUIP SKIN')+'</button>';result.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});result.querySelector?.('button')?.focus();$('shop-announcement').textContent=rarities[tier]+' '+reward.name+(duplicate?', duplicate. '+refund+' coins refunded.':', new skin unlocked.')}
function reelLayout(width,winner,bias){const card=width<330?88:104,stride=card+8;return {card,stride,start:width/2-(3*stride+card/2),end:width/2-(winner*stride+card/2+bias*card)}}
function finishOpening(){if(!opening)return;const completed=opening;opening=null;if(reelFrame!==null)cancelAnimationFrame(reelFrame);reelFrame=null;$('case-opening').hidden=true;$('case-opening').inert=true;$('shop-panel').inert=false;render();showReward(completed.outcome);window.NeonShop?.cue?.(completed.outcome.tier>=3?1046:784,.23,'triangle',.045)}
function beginOpening(outcome,box,index){const winner=42,reward=skins.find(s=>s.id===outcome.id);const cards=Array.from({length:54},(_,i)=>{if(i===winner)return reward;const tier=rollTier(box),pool=skins.filter(s=>s.tier===tier);return pool[Math.floor(random()*pool.length)]});
 opening={outcome,winner,bias:(random()-.5)*.4,began:null,lastTick:-1,lastCue:-1000};$('loot-result').hidden=true;render();$('case-label').textContent=rarities[index]+' LOOTBOX';$('case-opening').style.setProperty('--case-color',rarityColors[index]);$('case-opening').dataset.tier=index;$('case-track').innerHTML=cards.map((skin,i)=>'<div class="reel-card" data-tier="'+skin.tier+'" '+(i===winner?'data-winner="true"':'')+' style="--rarity:'+rarityColors[skin.tier]+'">'+ship(skin,62)+'<b>'+skin.name+'</b><small>'+rarities[skin.tier]+'</small></div>').join('');$('shop-panel').inert=true;$('case-opening').inert=false;$('case-opening').hidden=false;$('case-skip').focus();$('shop-announcement').textContent='Opening '+rarities[index]+' lootbox.';window.NeonShop?.cue?.(300,.08,'triangle',.03);
 const duration=5600;
 function frame(now){if(!opening)return;const spin=opening;if(spin.began===null)spin.began=now;const progress=Math.min(1,(now-spin.began)/duration),width=Math.max(180,$('case-window').clientWidth||300),layout=reelLayout(width,spin.winner,spin.bias),ease=1-Math.pow(1-progress,3),position=layout.start+(layout.end-layout.start)*ease;$('case-track').style.setProperty('--reel-card-width',layout.card+'px');$('case-track').style.transform='translate3d('+position+'px,0,0)';
  const tick=Math.floor((width/2-position)/layout.stride);if(tick!==spin.lastTick&&now-spin.lastCue>55){window.NeonShop?.cue?.(420,.022,'square',.012);spin.lastTick=tick;spin.lastCue=now}if(progress<1)reelFrame=requestAnimationFrame(frame);else finishOpening()
 }
 reelFrame=requestAnimationFrame(frame);
}
function purchase(index){if(opening)return null;read();const box=boxes[index];if(!box||data.coins<box.price){render();return null}const tier=rollTier(box),pool=skins.filter(s=>s.tier===tier),unowned=pool.filter(s=>!data.owned.includes(s.id)),choices=unowned.length?unowned:pool,reward=choices[Math.floor(random()*choices.length)],duplicate=data.owned.includes(reward.id),refund=duplicate?Math.floor(box.price*.4):0;
 data.coins-=box.price;data.coins+=refund;if(!duplicate)data.owned.push(reward.id);save();const outcome={id:reward.id,tier,duplicate,refund,price:box.price};beginOpening(outcome,box,index);return outcome}
function equip(id){if(opening)return false;read();if(!data.owned.includes(id))return false;data.equipped=id;save();render();const button=$('loot-result').querySelector?.('[data-equip]');if(button)button.textContent=data.equipped===button.dataset.equip?'EQUIPPED':'EQUIP SKIN';$('shop-announcement').textContent=selected().name+' equipped for the main game.';return true}
function earnings(stats){const whole=v=>Number.isFinite(v)?Math.max(0,Math.floor(v)):0;const parts={score:Math.floor(whole(stats.score)/10),sparks:whole(stats.sparks)*2,gates:whole(stats.gates),survival:Math.floor(whole(stats.seconds)/10)*5,record:stats.record&&whole(stats.score)>=100?25:0};return {...parts,total:Object.values(parts).reduce((a,b)=>a+b,0)}}
function awardRun(stats){read();const earned=earnings(stats);data.coins+=earned.total;data.runs++;save();$('run-coins').hidden=false;$('run-coin-total').textContent='+'+earned.total.toLocaleString()+' COINS';$('run-coin-detail').textContent=earned.score+' score · '+earned.sparks+' sparks · '+earned.gates+' gates · '+earned.survival+' survival'+(earned.record?' · +25 record':'');return earned}
function open(){if(opening)return;if(document.body.getAttribute('data-view')==='playing'||document.body.getAttribute('data-view')==='paused')return;read();render();$('loot-result').hidden=true;lastFocus=document.activeElement;const panel=$('shop-panel');panel.hidden=false;panel.scrollTop=0;for(const child of panel.parentElement.children)if(child!==panel)child.inert=true;$('shop-close').focus()}
function close(){if(opening)return;const panel=$('shop-panel');panel.hidden=true;for(const child of panel.parentElement.children)if(child!==panel)child.inert=false;lastFocus?.focus?.()}
$('case-skip').onclick=finishOpening;$('case-opening').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finishOpening()}else if(e.key==='Tab'){e.preventDefault();$('case-skip').focus()}});$('shop-open').onclick=open;$('shop-close').onclick=close;$('shop-panel').addEventListener('click',e=>{const button=e.target.closest('button');if(button?.dataset.buy!==undefined)purchase(Number(button.dataset.buy));else if(button?.dataset.equip)equip(button.dataset.equip)});
$('shop-panel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}if(e.key==='Tab'){const focus=[...$('shop-panel').querySelectorAll('button:not(:disabled),summary')].filter(el=>!el.closest('[hidden]'));const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
window.addEventListener('storage',e=>{if(e.key===KEY){read();refreshWallet();if(!$('shop-panel').hidden)render()}});
read();refreshWallet();window.NeonShop={awardRun,color,drawSkin,drawTrail,glow:()=>selected().tier===5?48:selected().tier<0?25:25+selected().tier*3,detailColor:fallback=>selected().tier>=2?'#ffffff':fallback};
})();
