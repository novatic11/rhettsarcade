import test from 'node:test';
import assert from 'node:assert/strict';
import {DEVICE_KEY,DEVICE_PRESETS,rememberedDevice,saveDeviceChoice} from '../public/games/rustbound-2/device-picker.js';
import {QUALITY,SETTINGS_KEY,readSettings} from '../public/games/rustbound-2/release-state.js';
import {saveGroup} from '../public/save-code.js';
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};

test('three device presets reduce rendering work in order and PC keeps its current graphics',()=>{
 assert.deepEqual(Object.keys(DEVICE_PRESETS),['chromebook','mobile','pc']);
 const [low,medium,pc]=Object.values(DEVICE_PRESETS).map(p=>QUALITY[p.quality]);
 assert(low.pixelRatio<medium.pixelRatio&&medium.pixelRatio<pc.pixelRatio);assert(low.segments*low.rows<medium.segments*medium.rows&&medium.segments*medium.rows<pc.segments*pc.rows);
 assert.equal(low.shadows,false);assert.equal(low.atmospheres,false);assert.equal(medium.atmospheres,false);assert.equal(medium.shadows,true);assert(medium.shadowSize<pc.shadowSize);
 assert.deepEqual(pc,{name:'Balanced',pixelRatio:1.15,shadows:true,shadowSize:1024,segments:128,rows:72,warp:120,atmospheres:true});assert.equal(readSettings({quality:'mobile'}).quality,'mobile');
});
test('choosing without Remember applies graphics but asks again on the next launch',()=>{
 const storage=store(),settings={quality:'high',volume:.35,sensitivity:1.4,cinematic:false};
 const result=saveDeviceChoice(storage,'mobile',false,settings);assert(result.saved);assert.equal(result.settings.quality,'mobile');assert.equal(rememberedDevice(storage),null);
 assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_KEY)),{...settings,quality:'mobile'});assert.equal(settings.quality,'high','A cancelled panel must not alter the caller’s settings');
});
test('Remember survives a fresh reader and can be changed or cleared without touching saves',()=>{
 const storage=store();storage.setItem('rustbound-2-demo-v1','expedition');storage.setItem('other-game','keep');
 assert(saveDeviceChoice(storage,'chromebook',true,readSettings()).saved);assert.equal(rememberedDevice({...storage}),'chromebook');
 assert(saveDeviceChoice(storage,'pc',true,readSettings()).saved);assert.equal(rememberedDevice(storage),'pc');
 assert(saveDeviceChoice(storage,'mobile',false,readSettings()).saved);assert.equal(rememberedDevice(storage),null);assert.equal(storage.getItem('rustbound-2-demo-v1'),'expedition');assert.equal(storage.getItem('other-game'),'keep');
 assert.equal(saveGroup(DEVICE_KEY),undefined,'A Chromebook choice must not become another device’s password-save preference');
});
test('invalid and unavailable preferences cannot select an arbitrary preset or block a launch',()=>{
 const storage=store();storage.setItem(DEVICE_KEY,'constructor');assert.equal(rememberedDevice(storage),null);assert.throws(()=>saveDeviceChoice(storage,'constructor',true,readSettings()));
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('full');},removeItem(){throw Error('blocked');}};assert.equal(rememberedDevice(blocked),null);
 const result=saveDeviceChoice(blocked,'pc',true,readSettings({volume:.2}));assert.equal(result.saved,false);assert.equal(result.settings.quality,'balanced');assert.equal(result.settings.volume,.2);
});
