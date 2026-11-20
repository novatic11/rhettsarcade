import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function setup(){const nodes=new Map(),events={},timeouts=[];const node=k=>{if(!nodes.has(k))nodes.set(k,{style:{setProperty(){}},classList:{toggle(){}},replaceChildren(){},setAttribute(){},removeAttribute(){}});return nodes.get(k);};let now=Date.parse('2026-10-26T05:00:00Z');class Clock extends Date{static now(){return now;}}
 const ctx={Date:Clock,Intl,document:{querySelector:node,createTextNode:s=>s,addEventListener:(key,fn)=>events[key]=fn,hidden:false},window:{addEventListener:(key,fn)=>events[key]=fn},setInterval:fn=>events.tick=fn,setTimeout:(fn,delay)=>{timeouts.push({fn,delay});return timeouts.length;},clearTimeout(){},element:()=>({}),catalog:JSON.parse(fs.readFileSync(new URL('../public/games.json',import.meta.url),'utf8'))};vm.createContext(ctx);vm.runInContext(source.slice(0,source.indexOf('let storageWorks')),ctx);vm.runInContext('games=catalog',ctx);return {ctx,node,events,timeouts,setNow:n=>now=Date.parse(n)};}
test('Central midnight boundaries remain exact across standard time, daylight time, DST, leap day and New Year',()=>{const {ctx}=setup();for(const [at,start,end] of [
 ['2026-10-26T19:40:00Z','2026-10-26T05:00:00Z','2026-10-27T05:00:00Z'],
 ['2026-01-15T18:00:00Z','2026-01-15T06:00:00Z','2026-01-16T06:00:00Z'],
 ['2026-03-08T12:00:00Z','2026-03-08T06:00:00Z','2026-03-09T05:00:00Z'],
 ['2026-11-01T12:00:00Z','2026-11-01T05:00:00Z','2026-11-02T06:00:00Z'],
 ['2028-02-29T12:00:00Z','2028-02-29T06:00:00Z','2028-03-01T06:00:00Z'],
 ['2026-12-31T23:59:00Z','2026-12-31T06:00:00Z','2027-01-01T06:00:00Z']]){const day=ctx.choiceSchedule(Date.parse(at));assert.equal(day.start,Date.parse(start));assert.equal(day.next,Date.parse(end));assert.equal(ctx.choiceSchedule(day.next-1).day,day.day);assert.equal(ctx.choiceSchedule(day.next).day,day.day+1);}});
test('progress, open-tab rollover and resume use the same daily schedule without a visible countdown',()=>{const {ctx,node,events,timeouts,setNow}=setup();setNow('2026-11-01T05:00:00Z');ctx.syncFeatured();assert.equal(timeouts.at(-1).delay,25*3600000);const first=node('.feature-actions .primary').href;
 setNow('2026-11-02T05:59:59Z');events.tick();assert.equal(node('.feature-actions .primary').href,first);
 setNow('2026-11-02T06:00:00Z');events.tick();assert.notEqual(node('.feature-actions .primary').href,first);assert.equal(node('.choice-progress span').style.width,'0%');
 setNow('2026-11-04T18:00:00Z');events.visibilitychange();assert.equal(node('.choice-progress span').style.width,'50%');assert.equal(timeouts.at(-1).delay,12*3600000);events.pageshow();
 setNow('2026-03-08T06:00:00Z');ctx.syncFeatured();assert.equal(timeouts.at(-1).delay,23*3600000);
});

test('the daily choice has no visible countdown or midnight label',()=>{const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert(!html.includes('choice-countdown'));assert(!html.includes('MIDNIGHT CT'));});
