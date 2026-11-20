import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordGameUpdate} from '../scripts/sync-games.mjs';

test('unchanged checks preserve the date; changes move it once',()=>{
  const entry={id:'game',buildSha256:'old',updatedAt:'2026-10-01T00:00:00Z'};
  assert.equal(recordGameUpdate(entry,{id:'game',changed:false,sha256:'old'}),false);
  assert.equal(entry.updatedAt,'2026-10-01T00:00:00Z');
  assert.equal(recordGameUpdate(entry,{id:'game',changed:true,sha256:'new'},'2026-10-02T00:00:00Z'),true);
  assert.equal(entry.updatedAt,'2026-10-02T00:00:00Z');
  assert.equal(recordGameUpdate(entry,{id:'game',changed:false,sha256:'new'},'2026-10-03T00:00:00Z'),false);
  assert.equal(entry.updatedAt,'2026-10-02T00:00:00Z');
});
test('a retry recovers an already-copied build; failed and unrelated checks cannot replace it',()=>{
  const entry={id:'game',buildSha256:'old',updatedAt:'2026-10-01T00:00:00Z'};
  assert.equal(recordGameUpdate(entry,{id:'game',changed:false,sha256:'copied'},'2026-10-02T00:00:00Z'),true);
  const before={...entry};
  assert.equal(recordGameUpdate(entry,{id:'game',error:'Invalid export',sha256:'bad'}),false);
  assert.equal(recordGameUpdate(entry,{id:'other',changed:true,sha256:'different'}),false);
  assert.deepEqual(entry,before);
});
