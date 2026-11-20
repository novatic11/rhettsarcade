import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { centralReleaseTimes } from '../public/release-clock.js';
import { handlePlaytestReleases } from '../lib/playtest-releases.mjs';
import { handlePlaytest, servePlaytestAsset } from '../lib/playtest.mjs';

test('Central Time rejects skipped hours and resolves both occurrences of a repeated hour', () => {
  assert.deepEqual(centralReleaseTimes('2027-03-14T02:15'), []);
  assert.deepEqual(centralReleaseTimes('2027-02-30T09:30'), []);
  assert.deepEqual(centralReleaseTimes('2027-11-07T01:15').map(time => new Date(time).toISOString()), [
    '2027-11-07T06:15:00.000Z', '2027-11-07T07:15:00.000Z'
  ]);
});

test('only Rhett can schedule and place a release, and the game unlocks at the Central Time deadline', async t => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE arcade_release_games (game_id TEXT PRIMARY KEY, metadata TEXT NOT NULL)');
  t.after(() => db.close());
  const DB = {
    exec: sql => sql.split('\n').filter(Boolean).forEach(statement => db.exec(statement)),
    prepare: sql => ({
      all: () => ({ results: db.prepare(sql).all() }),
      bind: (...args) => ({
        first: () => db.prepare(sql).get(...args),
        all: () => db.prepare(sql).all(...args)
      })
    }),
    batch: statements => {
      db.exec('BEGIN');
      try {
        const results = statements.map(statement => ({ results: statement.all() }));
        db.exec('COMMIT');
        return results;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  };
  const root = 'https://arcade.example/api/playtest/';
  const env = { DB, REQUEST_ADMIN_EMAILS: 'owner@example.test' };
  const owner = { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@example.test' };
  const game = { id: 'demo', title: 'Demo', url: '/api/playtest/game/demo/index.html', cover: '/api/playtest/game/demo/cover.svg' };
  const catalog = [game], main = [{ id: 'first' }, { id: 'second' }];
  const assets = { 'demo/index.html': btoa('<h1>Demo</h1>'), 'demo/cover.svg': btoa('<svg/>') };
  const releaseAt = Date.parse('2027-08-10T23:30:00Z');
  let now = releaseAt - 60000;
  t.mock.method(Date, 'now', () => now);
  const list = async () => (await handlePlaytestReleases(new Request(root + 'releases'), env, catalog, main, [])).json();
  const change = (body, headers = owner) => handlePlaytestReleases(new Request(root + 'releases', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  }), env, catalog, main, []);
  const file = path => servePlaytestAsset(new Request(root + 'game/demo/' + path), env, assets, catalog);
  const payload = { action: 'schedule', gameId: 'demo', localTime: '2027-08-10T18:30', occurrence: 0, beforeId: 'second' };
  assert.equal((await file('cover.svg')).status, 401);
  assert.equal((await change(payload, {})).status, 403);
  assert.equal((await change(payload, { ...owner, Origin: 'https://example.net' })).status, 403);
  assert.equal((await change({ ...payload, beforeId: 'missing' })).status, 400);
  const access = await handlePlaytest(new Request(root + 'catalog', { headers: owner }), env, catalog);
  assert.equal((await access.json()).owner, true);
  assert.equal((await change(payload)).status, 200);
  let card = (await list()).games[0];
  assert.equal(card.beforeId, 'second');
  assert.equal(card.upcoming, true);
  assert.equal(card.url, undefined);
  assert.equal((await file('cover.svg')).status, 200);
  assert.equal((await file('index.html')).status, 401);
  assert.equal((await change({ action: 'cancel', gameId: 'demo' })).status, 200);
  assert.deepEqual((await list()).games, []);
  assert.equal((await file('cover.svg')).status, 401);
  assert.equal((await change(payload)).status, 200);
  now = releaseAt;
  card = (await list()).games[0];
  assert.equal(card.beforeId, 'second');
  assert.equal(card.upcoming, false);
  assert.equal(card.url, game.url);
  assert.equal(await (await file('index.html')).text(), '<h1>Demo</h1>');
  const afterCatalogRemoval = await handlePlaytestReleases(new Request(root + 'releases'), env, [], main, []);
  assert.equal((await afterCatalogRemoval.json()).games[0].url, game.url);
  assert.equal((await servePlaytestAsset(new Request(root + 'game/demo/index.html'), env, assets, [])).status, 200);
  assert.equal((await change({ action: 'cancel', gameId: 'demo' })).status, 409);
  assert.equal((await change({ ...payload, localTime: '2027-08-11T18:30' })).status, 409);
});
