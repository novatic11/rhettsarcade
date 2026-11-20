import fs from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../public/save-code.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Storage{
  constructor(entries=[]){this.map=new Map(entries);this.failOn=null;}
  get length(){return this.map.size;}key(i){return [...this.map.keys()][i]??null;}getItem(k){return this.map.get(k)??null;}
  removeItem(k){this.map.delete(k);}setItem(k,v){if(this.failOn===k){this.failOn=null;throw Error('QuotaExceeded');}this.map.set(k,String(v));}
}
const fixtures=[['square-off-best','42'],['square-off-music','off'],['neon-slip-best','1234'],['neon-slip-classic-best','999'],['neon-slip-collection-v1','{"coins":500,"ship":"✨"}'],['rustbound-save-v1',JSON.stringify({version:1,world:'Cinder 🌌',buildings:Array.from({length:200},(_,id)=>({id,name:'Reactor',stock:{energy:100}}))})],['trb:index','[{"id":"test-world","name":"A long walk"}]'],['trb:world:test-world','{"world":"A long walk"}'],['trb:backup:test-world','{"world":"Earlier"}'],['stellar-forge-save','{"stars":["☀"]}'],['undercroft-save','{"embers":123,"best":15}'],['rhetts-arcade','{"favorites":["rustbound"]}']];
const from=new Storage([...fixtures,['unrelated-private-key','must stay private']]);
const entries=api.collectSaves(from);assert.equal(entries.length,fixtures.length);assert(!entries.some(([key])=>key==='unrelated-private-key'));
for(const compress of [false,true]){const code=await api.encodeSaveCode(entries,{compress});assert(code.startsWith(compress?'RA1.G.':'RA1.J.'));const decoded=await api.decodeSaveCode(' \n'+code.replace(/\./g,'.\n')+'\n');assert.deepEqual(decoded.entries,entries);assert.equal(decoded.groups.length,7);const damaged=code.replace(/\.[a-f0-9]{64}\./,'.'+'0'.repeat(64)+'.');await assert.rejects(()=>api.decodeSaveCode(damaged),/damaged/);}
await assert.rejects(()=>api.encodeSaveCode([['access-token','secret']]),/unsupported/);
await assert.rejects(()=>api.encodeSaveCode([['__proto__','{}']]),/unsupported/);
await assert.rejects(()=>api.encodeSaveCode([['square-off-best','1'],['square-off-best','2']]),/unsupported/);
await assert.rejects(()=>api.decodeSaveCode('RA2.J.bad.data'),/complete/);
const original=[['rustbound-save-v1','old'],['trb:world:extra','old orphan'],['trb:index','[]'],['square-off-best','7'],['unrelated-private-key','untouched']];
const to=new Storage(original);let durable;
const imported=await api.decodeSaveCode(await api.encodeSaveCode(entries));
await api.restoreSaves(to,imported,async backup=>{assert.deepEqual([...to.map],original);durable=structuredClone(backup);});
assert.equal(to.getItem('rustbound-save-v1'),from.getItem('rustbound-save-v1'));assert.equal(to.getItem('trb:world:extra'),null);assert.equal(to.getItem('unrelated-private-key'),'untouched');
api.undoRestore(to,durable);assert.deepEqual([...to.map].sort(),original.sort());assert.equal(to.getItem('neon-slip-best'),null);
const blocked=new Storage(original);await assert.rejects(()=>api.restoreSaves(blocked,imported,async()=>{throw Error('backup failed');}),/backup failed/);assert.deepEqual([...blocked.map].sort(),original.sort());
const full=new Storage(original);full.failOn='rustbound-save-v1';await assert.rejects(()=>api.restoreSaves(full,imported,async()=>{}),/previous saves were restored/);assert.deepEqual([...full.map].sort(),original.sort());
const partial=new Storage(original);await api.restoreSaves(partial,{entries:[['undercroft-save','new']]},async()=>{});assert.equal(partial.getItem('rustbound-save-v1'),'old');assert.equal(partial.getItem('square-off-best'),'7');
// A compressed expansion larger than the format limit must be rejected.
const large=new TextEncoder().encode('x'.repeat(8*1024*1024+1));const zipped=new Uint8Array(await new Response(new Blob([large]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
const hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',large)).toString('hex');await assert.rejects(()=>api.decodeSaveCode('RA1.G.'+hash+'.'+Buffer.from(zipped).toString('base64url')),/too much/);
assert.equal(api.SAVE_GROUPS.filter(g=>g.id!=='library').length,JSON.parse(fs.readFileSync(new URL('../public/games.json',import.meta.url),'utf8')).length+JSON.parse(fs.readFileSync(new URL('../public/junkyard-games.json',import.meta.url),'utf8')).length+JSON.parse(fs.readFileSync(new URL('../public/secret-games.json',import.meta.url),'utf8')).filter(g=>g.status!=='coming-soon').length);
console.log('PASS: all six games, Unicode/exact strings, plain+compressed round trips, corruption/unknown/duplicate key rejection, private data exclusion, durable backup before writes, quota rollback, undo, partial import, bounded decompression.');
