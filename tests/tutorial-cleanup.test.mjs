import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';
const source=fs.readFileSync(new URL('../public/games/rustbound/index.html',import.meta.url),'utf8');
const code=source.slice(source.indexOf('    function resetTutorialColony(){'),source.indexOf("    const guide=createQuickTutorial({title:'Rustbound'"));
const end=source.match(/onEnd:(completed=>\{if\(completed\)resetTutorialColony\(\);\})/)[1];
function setup(){let removed=0,saved=0,closed=0;const node=()=>({remove(){removed++}});const a={id:1,body:'cinder',element:node(),indicator:node(),exportButton:node()},b={id:2,body:'moon',element:node(),indicator:node()},lander={id:'lander',stock:{gas:40}},station={id:'station'},stationPeer={id:'station-peer'};
 const retained={output:{building:station},input:{building:stationPeer}},context=vm.createContext({buildings:[a,b],indicators:[lander,a,b,station],connections:[{output:{building:a},input:{building:lander}},{output:{building:lander},input:{building:b}},retained],credits:20,dragging:{building:a},wireDrag:{},millPanel:{open:true,close(){this.open=false;closed++}},activeMill:b,status:{},cancelSelection(){},redrawWires(){},refreshShop(){},updateReadouts(){},positionIndicators(){},saveGame(){saved++}});
 vm.runInContext(code+'\nvar onTutorialEnd='+end+';',context);return{context,lander,station,retained,counts:()=>({removed,saved,closed})};
}
test('completion clears placed buildings, overlays and their wires, then saves the 700-credit reset',()=>{
 const {context:c,lander,station,retained,counts}=setup();c.onTutorialEnd(true);assert.equal(c.buildings.length,0);assert.deepEqual(Array.from(c.indicators),[lander,station]);assert.deepEqual(Array.from(c.connections),[retained]);assert.equal(c.credits,700);assert.equal(c.activeMill,null);assert.equal(c.dragging,null);assert.equal(c.wireDrag,null);assert.equal(c.millPanel.open,false);assert.equal(lander.stock.gas,40);assert.deepEqual(counts(),{removed:5,saved:1,closed:1});
});
test('skipping leaves the colony, money, and connections untouched',()=>{
 const {context:c,counts}=setup();c.onTutorialEnd(false);assert.equal(c.buildings.length,2);assert.equal(c.credits,20);assert.equal(c.connections.length,3);assert.equal(c.millPanel.open,true);assert.deepEqual(counts(),{removed:0,saved:0,closed:0});
});
