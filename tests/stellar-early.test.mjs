import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../public/games/stellar-forge/index.html',import.meta.url),'utf8');
const model=html.split('// EARLY_START_MODEL_BEGIN')[1].split('// EARLY_START_MODEL_END')[0];
const E=vm.runInNewContext(model+';EarlyStart');
const options={active:true,eligible:true,power:1};
const home={totalEarned:25,generators:[{id:'scout',owned:1}],clickUpgrades:[{id:'drill1',owned:1}]};
const clone=x=>JSON.parse(JSON.stringify(x));
test('veins require three taps, pay once, and remain cracked through a save round trip',()=>{
  let s=E.fresh();for(let i=0;i<15;i++)assert.equal(E.tick(s,.5,options),false);
  assert.equal(E.tick(s,.5,options),true);assert.equal(s.vein.reward,8);
  assert.equal(E.hit(s,false).hit,false);assert.equal(E.hit(s,true).reward,0);
  s=E.normalize(clone(s));assert.equal(s.vein.hits,1);
  assert.equal(E.hit(s,true).reward,0);assert.equal(E.hit(s,true).reward,8);
  assert.equal(E.hit(s,true).reward,0);assert.equal(s.opened,1);assert.equal(s.cooldown,40);
  for(let i=0;i<79;i++)E.tick(s,.5,options);assert.equal(s.vein,null);
  E.tick(s,.5,options);assert.equal(s.vein.position,1);
});
test('veins pause outside active Homeworld play, do not expire, and cannot produce late-game windfalls',()=>{
  const s=E.fresh();for(let i=0;i<100;i++){E.tick(s,3600,{...options,active:false});E.tick(s,.5,{...options,eligible:false});}
  assert.equal(s.cooldown,8);
  E.tick(s,3600,options);assert.equal(s.cooldown,7.5);
  for(let i=0;i<15;i++)E.tick(s,.5,{...options,power:1e12});
  assert.equal(s.vein.reward,40);for(let i=0;i<100;i++)E.tick(s,500,options);
  assert.equal(s.vein.hits,0);assert.equal(E.hit(s,true).reward,0);
});
test('starter jobs can be collected in any order exactly once and retain earned milestones after rebirth',()=>{
  let s=E.fresh();E.observe(s,home);
  assert.equal(E.claim(s,'drill',false),0);assert.equal(E.claim(s,'drill',true),25);
  assert.equal(E.claim(s,'crew',true),0);assert.equal(E.claim(s,'unknown',true),0);
  s=E.normalize(clone(s));E.observe(s,{totalEarned:0,generators:[],clickUpgrades:[]});
  assert.equal(E.claim(s,'drill',true),0);assert.equal(E.claim(s,'scout',true),15);
  assert.equal(E.claim(s,'dust',true),10);assert.equal(E.claim(s,'dust',true),0);
  E.observe(s,{...home,generators:[{id:'scout',owned:2},{id:'probe',owned:1}]});
  assert.equal(E.claim(s,'crew',true),40);assert.equal(E.claim(s,'vein',true),0);
  s.opened=1;E.observe(s,home);assert.equal(E.claim(s,'vein',true),20);
  assert.equal(s.claimed.length,5);assert.equal(E.jobs.reduce((n,j)=>n+j.reward,0),110);
});
test('malformed optional data cannot break a valid existing save',()=>{
  const s=E.normalize({claimed:['dust','dust','alien'],progress:{dust:Infinity,crew:500},cooldown:-5,opened:-1,vein:{hits:3,reward:1000}});
  assert.deepEqual(clone(s.claimed),['dust']);assert.equal(s.progress.dust,0);assert.equal(s.progress.crew,3);assert.equal(s.vein,null);
});

// Run the real save writer/reader and planet swap functions against a two-world fixture.
const fn=(name,next)=>html.slice(html.indexOf('function '+name+'('),html.indexOf('function '+next+'('));
const context=vm.createContext({btoa,atob,encodeURIComponent,decodeURIComponent,escape,unescape});
vm.runInContext(model+`
const PLANETS=[{id:'home',unlockAt:0},{id:'emberholt',unlockAt:1e6}],ORIGINAL_PLANETS=PLANETS;
const CLICK_UPGRADES=[{id:'drill1'}],GENERATORS=[{id:'scout'},{id:'probe'}],BUILDING_UPGRADES=[{id:'scout_boost'}];
const PLANET_COSMETICS={home:{colors:[{id:'home_default'}]}};
let systemRegion='ignis';
const freshStation=()=>({built:false,modules:{}}),normalizeStation=x=>x||freshStation();
const normalizePrestige=x=>x||{points:0,rebirths:0,pastEarned:0,sacrificed:0};
const closeAbyssMenu=()=>{},cancelPrestige=()=>{},closeStation=()=>{},updateIntroView=()=>{},applyCosmetics=()=>{},updateSystemButton=()=>{};
const canVisitTon=()=>state.wormholeUnlocked,canVisitVigil=()=>state.vigilUnlocked;
const totalEarnedAcrossAllPlanets=()=>state.totalEarned;
const shopPrefs=()=>state.qol||{buy:'1',hideDone:false};
const currentStation=()=>state.planetSaves[state.currentPlanetId]?.station||freshStation();
function isPlanetUnlocked(id){return state.unlockedPlanets.includes(id);}
let state={early:EarlyStart.fresh(),planetSaves:{},currentPlanetId:'home',unlockedPlanets:['home'],achievements:[{id:'first',unlocked:false}]};
`+fn('freshPlanetSave','snapshotCurrentPlanet')+fn('snapshotCurrentPlanet','loadPlanetSave')+fn('loadPlanetSave','switchToPlanet')+fn('planetSaveFor','planetDotGradient')+fn('serializeState','deserializeCode')+fn('deserializeCode','applyCosmeticsPayload')+fn('applyCosmeticsPayload','applySavePayload')+fn('applySavePayload','openModal'),context);
const run=code=>vm.runInContext(code,context);
test('v9 progress migrates and v10 preserves claims, vein damage, both economies, boosts, station, and prestige',()=>{
  context.legacy={v:9,ui:true,cp:'home',pl:['home','emberholt'],prestige:{points:7,rebirths:0,pastEarned:123,sacrificed:0},ps:{
    home:{sd:200,te:1200,tc:30,cu:[['drill1',2]],gn:[['scout',3]],bu:['scout_boost'],station:{built:true,modules:{lab:2}},co:{color:'home_default',ring:'none',moon:'none',owned:['color:home_default']}},
    emberholt:{sd:900,te:1000,tc:17,cu:[],gn:[['probe',4]],bu:[]}},ac:['first']};
  run('applySavePayload(legacy);EarlyStart.observe(state.early,planetSaveFor("home"));');
  assert.equal(run('state.stardust'),200);assert.equal(run('state.early.progress.crew'),3);assert.equal(run('state.early.claimed.length'),0);
  run('EarlyStart.claim(state.early,"scout",true);state.early.cooldown=0;EarlyStart.tick(state.early,.5,{active:true,eligible:true,power:4});EarlyStart.hit(state.early,true);');
  context.code=run('serializeState()');context.payload=run('deserializeCode(code)');
  assert.equal(context.payload.v,10);assert.equal(context.payload.early.vein.hits,1);
  run('state.early=EarlyStart.fresh();applySavePayload(payload);');
  assert.equal(run('state.early.claimed.join()'),'scout');assert.equal(run('state.early.vein.reward'),24);
  assert.equal(run('state.stardust'),200);assert.equal(run('state.generators[0].owned'),3);assert.equal(run('state.buildingUpgrades[0].owned'),1);
  assert.equal(run('state.planetSaves.home.station.modules.lab'),2);assert.equal(run('state.prestige.points'),7);
  assert.equal(run('state.achievements[0].unlocked'),true);
  run('snapshotCurrentPlanet();loadPlanetSave("emberholt");');
  assert.equal(run('state.stardust'),900);assert.equal(run('state.generators[1].owned'),4);
  assert.equal(run('EarlyStart.claim(state.early,"dust",state.currentPlanetId==="home")'),0);
});
test('new save payload remains exact through the arcade password-save envelope',async()=>{
  const saveApi=await import('../public/save-code.js');
  const entries=[['stellar-forge-save',context.code]];
  const restored=await saveApi.decodeSaveCode(await saveApi.encodeSaveCode(entries));
  assert.deepEqual(restored.entries,entries);
});
