// Explicit powered-colony fixture for tests that begin after base restoration.
export function powerStarter(c){const base=c.bases.cinder;if(base.buildings.some(b=>b.type==='solar'))return c;const panel={id:'cinder-solar',type:'solar',x:-25,z:15,yaw:0,paid:0};base.buildings.push(panel);c.industry.state('cinder',panel);const warehouse=base.buildings.find(b=>b.type==='warehouse');if(warehouse)c.industry.state('cinder',warehouse).charge=90;for(const b of base.buildings.filter(b=>b!==panel))c.industry.connect('cinder',{building:panel.id,port:'power'},{building:b.id,port:'power'});c.industry.aggregate('cinder');return c;}

// Flight tests start after the normal solar-charging wait. This uses the
// actual electricity model and never adds charge to production game code.
export function chargeShip(d){d.power.update(600,{vehicle:d.vehicle,improved:d.campaign.progress.has('power'),sunlight:1});return d;}
