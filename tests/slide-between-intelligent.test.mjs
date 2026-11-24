import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import * as THREE from '../public/games/slide-between/vendor/three.module.js';
import {COURSES} from '../public/games/slide-between/courses.js';
const html=fs.readFileSync(new URL('../public/games/slide-between/index.html',import.meta.url),'utf8');
const core=html.slice(html.indexOf('const V3 = THREE.Vector3'),html.indexOf('const openingCourse'));
const ctx=vm.createContext({THREE,COURSES,localStorage:{getItem:()=>null,setItem(){}},Math,Float32Array,Float64Array,Map,Infinity});
vm.runInContext(core+'\nthis.api={useCourse,newBody,aiNew,aiStep,crossesFinish,DIFFS,robotThrustFor,get course(){return course;},get FIN_IDX(){return FIN_IDX;},get REF_TIME(){return REF_TIME;}};',ctx);
const sb=ctx.api;
function race(idx){
  sb.useCourse(idx);const b=sb.newBody();Object.assign(b,{u:2.2,v:8,jumpCd:0,takeoffS:8,nrm:new THREE.Vector3(0,1,0)});
  const ai=sb.aiNew();let t=0,jumps=0,resets=0;
  while(t<200){const ps=b.s,ev=sb.aiStep(b,ai,1/120,sb.FIN_IDX,false);t+=1/120;if(ev==='jump')jumps++;if(ev==='reset')resets++;
    if(b.mode==='ground'?ps<sb.course.finishS&&b.s>=sb.course.finishS:sb.crossesFinish(b.prev,b.pos))return {t,cuts:ai.cuts,jumps,resets};}
  return {t:Infinity,cuts:ai.cuts,jumps,resets};
}
test('Intelligent is a menu difficulty with no thrust advantage',()=>{assert(sb.DIFFS.intelligent.smart);assert.equal(sb.robotThrustFor('intelligent'),0);assert(html.includes('data-d="intelligent"'));});
test('Intelligent robot jumps, takes shortcuts, never misses a landing and beats Hard',()=>{
  for(const idx of [1,30,64,99]){const r=race(idx);
    assert(Number.isFinite(r.t),'course '+idx+' unfinished');assert.equal(r.resets,0,'missed landing on course '+idx);
    assert(r.jumps>=3,'too few jumps on course '+idx);assert(r.cuts>=2,'too few shortcuts on course '+idx);
    assert(r.t<sb.REF_TIME*0.85,'slower than Hard on course '+idx);}
});
