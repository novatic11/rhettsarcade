// Additional landable worlds, kept as data so system.js can establish their
// parent-relative positions before it builds the body and navigation lists.
export const EXTRA_WORLDS=[
 {
  id:'vanta',name:'Vanta',system:'vesper',parent:'vesper',radius:1360,gravity:2.8,color:'#50565f',theme:'basalt',orbitRadius:500000,phase:5.62,atmosphere:45,mineral:'iridium',
  role:'Black basalt stairways and wind-polished crater mazes',region:'Blackstep labyrinth',relay:'Basalt watch mast',artifact:'Obsidian compass'
 },
 {
  id:'cauter',name:'Cauter',system:'vesper',parent:'kiln',radius:590,gravity:.85,color:'#8e5144',theme:'volcanic',orbitRadius:22000,phase:2.72,atmosphere:12,mineral:'iron',
  role:'Rust-red slag needles above cooled lava tunnels',region:'Emberneedle caldera',relay:'Kilnside borehole relay',artifact:'Cooled heart lattice'
 },
 {
  id:'rill',name:'Rill',system:'vesper',parent:'dusk',radius:730,gravity:.68,color:'#b2946b',theme:'haze',orbitRadius:31000,phase:5.48,atmosphere:65,mineral:'copper',
  role:'Copper salt fans cut by narrow amber ravines',region:'Copperwind narrows',relay:'Saltwind receiver',artifact:'Copper tide vane'
 },
 {
  id:'fervor',name:'Fervor',system:'amber',parent:'amber',radius:1660,gravity:4.2,color:'#9c5440',theme:'volcanic',orbitRadius:720000,phase:.20,atmosphere:38,mineral:'iron',
  role:'Iron-red clinker fields and long, collapsed lava tubes',region:'Rustpipe trench',relay:'Clinker field observatory',artifact:'Iron furnace seal'
 },
 {
  id:'tessera',name:'Tessera',system:'amber',parent:'saffron',radius:620,gravity:.55,color:'#b5a081',theme:'shard',orbitRadius:18000,phase:3.82,atmosphere:0,mineral:'crystal',
  role:'Golden glass mosaics scattered around shallow impact bowls',region:'Golden mosaic basin',relay:'Silica survey tripod',artifact:'Golden hinge prism'
 },
 {
  id:'briar',name:'Briar',system:'amber',parent:'moss',radius:890,gravity:1.55,color:'#546760',theme:'basalt',orbitRadius:34000,phase:5.03,atmosphere:22,mineral:'cobalt',
  role:'Black mineral columns tangled with green copper seams',region:'Greenvein colonnade',relay:'Verdant fault receiver',artifact:'Briar coil'
 },
 {
  id:'halcyon',name:'Halcyon',system:'aster',parent:'aster',radius:1620,gravity:3.9,color:'#86a99d',theme:'verdigris',orbitRadius:1070000,phase:5.97,atmosphere:240,mineral:'copper',
  role:'Jade escarpments, pale chalk shelves and turquoise sinkholes',region:'Jade sinkhole rim',relay:'Chalk basin monitoring tower',artifact:'Chalkwater lens'
 },
 {
  id:'flint',name:'Flint',system:'aster',parent:'vitria',radius:550,gravity:.43,color:'#8d9296',theme:'iron',orbitRadius:21000,phase:3.46,atmosphere:0,mineral:'cobalt',
  role:'Pitted nickel-iron plates and oxidized impact splinters',region:'Nickel impact shelf',relay:'Metalgrain listening post',artifact:'Nickel tuning fork'
 },
 {
  id:'morrow',name:'Morrow',system:'aster',parent:'silva',radius:910,gravity:.91,color:'#c2d4d5',theme:'plon',orbitRadius:32000,phase:1.39,atmosphere:6,mineral:'ice',
  role:'White ice rafts split by long graphite-dark faults',region:'White raft fault',relay:'Ice raft triangulation mast',artifact:'Raft keeper'
 },
 {
  id:'eidolon',name:'Eidolon',system:'abyss',parent:'abyss',radius:1450,gravity:2.6,color:'#8e5f70',theme:'shard',orbitRadius:850000,phase:5.79,atmosphere:0,mineral:'iridium',
  role:'Wine-red impact glass terraces facing the accretion glow',region:'Ruby shatterfield',relay:'Red horizon spectrometer',artifact:'Ruby memory wedge'
 },
 {
  id:'censer',name:'Censer',system:'abyss',parent:'relic',radius:630,gravity:1.10,color:'#625758',theme:'volcanic',orbitRadius:24000,phase:3.21,atmosphere:18,mineral:'helium3',
  role:'Hollow scoria towers rising from soot-black volcanic pans',region:'Soot spire basin',relay:'Scoria isotope station',artifact:'Ash bell'
 },
 {
  id:'gloam',name:'Gloam',system:'abyss',parent:'veil',radius:820,gravity:.58,color:'#a0c1d0',theme:'frost',orbitRadius:30000,phase:5.66,atmosphere:0,mineral:'ice',
  role:'Blue frost ribs and star-shaped pressure ridges',region:'Blue ribbed plain',relay:'Twilight frost antenna',artifact:'Blue hour dial'
 },
 {
  id:'fulcrum',name:'Fulcrum',system:'tempest',parent:'tempest',radius:1690,gravity:4.6,color:'#6a7588',theme:'basalt',orbitRadius:800000,phase:6.05,atmosphere:45,mineral:'cobalt',
  role:'Storm-scoured basalt steps threaded with conductive dust',region:'Conductive staircase',relay:'Stormground field array',artifact:'Grounding crown'
 },
 {
  id:'skein',name:'Skein',system:'tempest',parent:'arc',radius:670,gravity:.77,color:'#a4c8d8',theme:'crystal',orbitRadius:19000,phase:3.48,atmosphere:0,mineral:'crystal',
  role:'Conductive blue crystal filaments across metal-rich gullies',region:'Filament chasm',relay:'Crystal discharge recorder',artifact:'Filament harp'
 },
 {
  id:'quench',name:'Quench',system:'tempest',parent:'surge',radius:940,gravity:1.38,color:'#bac9cf',theme:'plon',orbitRadius:33000,phase:5.73,atmosphere:8,mineral:'helium3',
  role:'Gray-white ice slabs with dark heat-fractured seams',region:'Dark seam crossing',relay:'Thermal fracture seismometer',artifact:'Cold ember knot'
 }
];
