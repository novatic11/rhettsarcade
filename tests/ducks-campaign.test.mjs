import test from 'node:test';import assert from 'node:assert/strict';import {Pond,DUCKS,STAGES} from '../public/games/ducks-vs-dogs/model.js';
function play(stage,seed){let g=new Pond(stage,seed),restored=false;
 g.place('baker',2,0);g.place('shooter',stage===0?1:0,2);g.startWave();
 for(let tick=0;tick<24000&&!g.result;tick++){
  if(tick%10===0){
   const attack=row=>g.ducks.filter(d=>d.row===row&&DUCKS[d.type].rate).length;
   const danger=row=>{const ds=g.dogs.filter(d=>d.row===row);return ds.length?10-Math.min(...ds.map(d=>d.x))+ds.reduce((n,d)=>n+d.hp,0)/300:0;};
   const rows=[0,1,2,3,4].sort((a,b)=>(danger(b)+(g.schedule.slice(g.spawnIndex).some(d=>d.lane===b)?3:0))/(attack(b)+.6)-(danger(a)+(g.schedule.slice(g.spawnIndex).some(d=>d.lane===a)?3:0))/(attack(a)+.6));
   const place=(type,row,cols)=>{for(const col of cols)if(!g.canPlace(type,row,col)){g.place(type,row,col);return true;}return false;};
   const urgent=rows.find(row=>g.dogs.some(d=>d.row===row&&d.x<4.2));
   if(urgent!==undefined&&g.dogs.some(d=>d.row===urgent&&d.x<2.5)&&!g.ducks.some(d=>d.row===urgent&&d.type==='guard'))place('guard',urgent,[3,4,5]);
   if(rows.some(row=>attack(row)===0&&(danger(row)>0||g.schedule.slice(g.spawnIndex).some(d=>d.lane===row)))){const row=rows.find(row=>attack(row)===0&&(danger(row)>0||g.schedule.slice(g.spawnIndex).some(d=>d.lane===row)));place('shooter',row,[2,1,3]);}
   else if(g.ducks.filter(d=>d.type==='baker').length<4&&g.crumbs>=50)place('baker',[0,1,3,4].find(row=>!g.ducks.some(d=>d.type==='baker'&&d.row===row))??0,[0,1]);
   else if(g.crumbs>=75){const row=rows.find(row=>attack(row)<3)??rows[0];place(g.crumbs>=150&&attack(row)>=1?'twin':'shooter',row,[2,1,3,0]);}
   if(g.crumbs>=125&&g.wave>=3){const row=rows.find(row=>!g.ducks.some(d=>d.row===row&&d.type==='frost'));if(row!==undefined)place('frost',row,[1,3,0]);}
   if(g.crumbs>=50&&g.wave>=2){const row=rows.find(row=>!g.ducks.some(d=>d.row===row&&d.type==='guard'));if(row!==undefined)place('guard',row,[5,6,4]);}
  }
  g.step(.025);
  if(!restored&&g.wave===3&&g.waveTime>8){const loaded=Pond.restore(g.serialize());if(!loaded)throw Error('Mid-game restore failed');g=loaded;restored=true;}
 }
 return {stage,seed,...g.result,time:Math.round(g.time),crumbs:g.crumbs,ducks:g.ducks.length};
}
test('all three ponds can be defended using only earned crumbs, legal placement, and mid-wave reloads',()=>{for(let stage=0;stage<STAGES.length;stage++)for(const seed of [18,123,541]){const result=play(stage,seed);assert.equal(result.won,true,JSON.stringify(result));assert.equal(result.medal,'GOLD');assert(result.time<600);}});
