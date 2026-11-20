import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveQueue} from '../public/save-queue.js';

test('exit saves capture final progress after an in-flight autosave, without overlapping writes',async()=>{
  let progress='earlier',release,started;
  const writes=[],gate=new Promise(r=>release=r),began=new Promise(r=>started=r);
  const save=createSaveQueue(async()=>{const snapshot=progress;if(!writes.length){started();await gate;}writes.push(snapshot);return true;});
  const background=save();await began;
  assert.equal(save(),background);
  progress='final game progress';const exit=save(true);
  assert.deepEqual(writes,[]);release();assert.equal(await exit,true);
  assert.deepEqual(writes,['earlier','final game progress']);assert.equal(save.pending,false);
});
test('a failed background upload does not prevent the queued exit retry',async()=>{
  let attempts=0;
  const save=createSaveQueue(async()=>{if(++attempts===1)throw Error('offline');return 'saved';});
  const background=save();const exit=save(true);
  await assert.rejects(background,/offline/);
  assert.equal(await exit,'saved');assert.equal(save.pending,false);
});
