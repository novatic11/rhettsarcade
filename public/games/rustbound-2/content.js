// Frontier Works: functional surface hardware and its material economy.
export const NEW_MATERIALS={silicon:{name:'Silicon',color:'#a5bcc4'},ceramics:{name:'Heat-resistant ceramics',color:'#d3c5ae'},polymers:{name:'Polymers',color:'#97bca8'},food:{name:'Colony provisions',color:'#abc38c'},data:{name:'Survey records',color:'#8fbdd3'},antimatter:{name:'Antimatter',color:'#c0b2e6'}};
export const CONTENT_TYPES={
 wind:{name:'Wind Turbine',radius:4,cost:220,power:28,group:'Power',description:'Up to 28 energy/s from atmospheric wind. Works through the night; requires an atmosphere.'},
 geothermal:{name:'Geothermal Plant',radius:3.5,cost:650,power:24,group:'Power',description:'24 steady energy/s, or 48 on volcanic worlds. No fuel; works through the night.'},
 solarfarm:{name:'Large Solar Farm',radius:6,cost:420,power:126,group:'Power',description:'Seven basic arrays in one installation: 126 energy/s in full daylight.'},
 megabattery:{name:'Grid Battery Vault',radius:4,cost:430,storage:3000,group:'Power',description:'Stores 3,000 energy. Start empty, charge from your connected generators.'},
 smelter:{name:'Industrial Smelter',radius:4,demand:24,cost:700,group:'Production',description:'Efficient bulk alloy and heat-resistant ceramics. Select a recipe and connect ingredient pipes.'},
 electronicsfab:{name:'Electronics Foundry',radius:3.5,demand:22,cost:850,group:'Production',description:'Turn refined silicon and copper into flight electronics at twice the batch yield.'},
 chemicalplant:{name:'Chemical Plant',radius:4,demand:18,cost:550,group:'Production',description:'Combine piped gas and water ice into polymers for advanced machinery.'},
 waterextractor:{name:'Water Recovery Plant',radius:3,demand:12,cost:280,group:'Fuel',description:'Condense and process subsurface gas into water ice. Gas input and solid ice output.'},
 oreseparator:{name:'Crystal Separator',radius:3.5,demand:15,cost:460,group:'Production',description:'Refine crystal into silicon for electronics, ceramics and station construction.'},
 machineworks:{name:'Heavy Machine Works',radius:4,demand:26,cost:950,group:'Production',description:'Build mechanical components from alloy and polymers with a high-output assembly line.'},
 greenhouse:{name:'Hydroponic Greenhouse',radius:4,demand:9,cost:500,group:'Colony',description:'Water ice grows provisions. Supply station habitats or export provisions through a Trade Terminal.'},
 observatory:{name:'Surface Observatory',radius:4,demand:16,cost:780,group:'Science',description:'Use crystal and electronics to produce survey records. Records fund research supply orders and trade.'},
 antimatterlab:{name:'Antimatter Laboratory',radius:4,demand:110,cost:4200,group:'Science',description:'A late-game containment facility: Helium-3 and electronics become valuable antimatter. Requires a strong grid.'},
 tradehub:{name:'Trade Terminal',radius:4,demand:8,cost:800,group:'Colony',description:'Exports finished goods for credits. Choose a product in the building inspector; connect its input pipe.'}
};
export const CONTENT_RECIPES={
 bulkAlloy:{name:'Bulk alloy',machine:'smelter',seconds:8,input:{iron:3,copper:1},output:{alloy:3}},
 ceramics:{name:'Thermal ceramics',machine:'smelter',seconds:10,input:{silicon:2,iron:1},output:{ceramics:2}},
 silicon:{name:'Refined silicon',machine:'oreseparator',seconds:6,input:{crystal:2},output:{silicon:2}},
 chips:{name:'Flight electronics',machine:'electronicsfab',seconds:6,input:{silicon:1,copper:1},output:{electronics:2}},
 polymers:{name:'Structural polymers',machine:'chemicalplant',seconds:8,input:{gas:2,ice:1},output:{polymers:2}},
 recoveredWater:{name:'Recovered water ice',machine:'waterextractor',seconds:8,input:{gas:2},output:{ice:1}},
 assemblies:{name:'Precision assemblies',machine:'machineworks',seconds:8,input:{alloy:2,polymers:1},output:{components:3}},
 provisions:{name:'Hydroponic provisions',machine:'greenhouse',seconds:20,input:{ice:1},output:{food:2}},
 surveyRecords:{name:'Long-baseline survey',machine:'observatory',seconds:24,input:{crystal:1,electronics:.25},output:{data:1}},
 antimatter:{name:'Contained antimatter',machine:'antimatterlab',seconds:15,input:{helium3:1,electronics:1},output:{antimatter:.1}}
};
export const TRADE_PRICES={alloy:15,components:45,electronics:65,silicon:22,ceramics:40,polymers:32,food:28,data:160,antimatter:3200};
export const CONTENT_ORDERS=[
 {id:'silicon-age',name:'The silicon age',cost:{silicon:10,electronics:6},reward:2200},
 {id:'orbital-foundry',name:'Orbital construction supply',cost:{alloy:30,ceramics:8,components:10},reward:5000},
 {id:'life-support',name:'Life beyond the surface',cost:{food:20,polymers:10},reward:3200},
 {id:'stellar-observatory',name:'A clearer universe',cost:{data:8,electronics:10},reward:6000},
 {id:'containment',name:'Containment breakthrough',cost:{antimatter:1,ceramics:12},reward:10500}
];
export function surfaceGeneration(type,body,light,time=0){
 if(type==='solar')return 18*light;
 if(type==='solarfarm')return 126*light;
 if(type==='geothermal')return body.theme==='volcanic'?48:24;
 if(type==='wind')return body.atmosphere>40?28*(.62+.25*Math.sin(time*.007+body.radius)) : 0;
 return 0;
}
