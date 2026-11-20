import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {createRealSolarSystem} from '../public/games/rustbound-2/real-solar-system.js';
import {universeURL} from '../public/games/rustbound-2/universe.js';
test('the playable Solar System includes eight planets, five recognized dwarfs and the requested moon families',()=>{
 const {bodies:b,systems}=createRealSolarSystem(),list=Object.values(b);assert.equal(list.length,46);assert.equal(list.filter(b=>b.category==='moon').length,32);assert.equal(list.filter(b=>['terrestrial','gas-giant','ice-giant'].includes(b.category)).length,8);assert.deepEqual(list.filter(b=>b.category==='dwarf').map(b=>b.id),['ceres','pluto','haumea','makemake','eris']);
 for(const [parent,ids]of Object.entries({earth:['moon'],mars:['phobos','deimos'],jupiter:['io','europa','ganymede','callisto'],saturn:['titan','enceladus','mimas','iapetus'],uranus:['ariel','titania','oberon','miranda'],neptune:['triton','nereid','proteus'],pluto:['charon'],eris:['dysnomia']}))for(const id of ids)assert.equal(b[id].parent,parent);
 assert(b.earth.position.every(x=>x===0));assert(systems.solar.extent<5000000);assert(b.saturn.rings);assert(b.uranus.giantStyle.tilt>1.5);assert(b.triton.orbit.inclination>Math.PI/2);
 for(const body of list){assert(body.position.every(Number.isFinite));if(body.star)continue;const parent=b[body.parent],peri=body.orbitRadius*(1-body.orbit.eccentricity);assert(peri>parent.radius*(parent.rings?.outer||1)+body.radius+1000,body.id+' parent/ring clearance');}
 for(let i=0;i<list.length;i++)for(let j=0;j<i;j++)assert(Math.hypot(...list[i].position.map((x,k)=>x-list[j].position[k]))>list[i].radius+list[j].radius+500,list[i].id+' / '+list[j].id);
 assert.equal(new URL(universeURL(true,'https://arcade.test/games/rustbound-2/?example=1#menu')).searchParams.get('universe'),'solar');assert.equal(universeURL(false,'https://arcade.test/games/rustbound-2/?universe=solar'),'https://arcade.test/games/rustbound-2/');
});
test('Solar gameplay, saves, production, construction, stations, science, footsteps and guided flights work independently',{timeout:300000},()=>{
 const result=execFileSync(process.execPath,[new URL('./rb2-solar-fixture.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],{encoding:'utf8',timeout:290000});assert.match(result,/Solar gameplay checks passed/);
});
