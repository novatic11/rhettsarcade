import { isArcadeOwner } from './arcade-owner.mjs';
import { centralReleaseTimes } from '../public/release-clock.js';

const schema = 'CREATE TABLE IF NOT EXISTS arcade_playtest_releases (game_id TEXT PRIMARY KEY, release_at INTEGER NOT NULL, before_id TEXT, updated_at INTEGER NOT NULL)';
const response = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
});
const select = 'SELECT game_id, release_at, before_id, updated_at FROM arcade_playtest_releases';

export async function releasedGameMetadata(db, gameId) {
  if (!db) return null;
  const row = await db.prepare('SELECT metadata FROM arcade_release_games WHERE game_id=?').bind(gameId).first();
  if (!row) return null;
  try {
    const game = JSON.parse(row.metadata);
    return game.id === gameId && releaseableGame(game) ? game : null;
  } catch {
    return null;
  }
}

async function saveCatalogSnapshots(db, catalog) {
  const statements = catalog.filter(releaseableGame).map(game =>
    db.prepare(`INSERT INTO arcade_release_games (game_id,metadata)
      SELECT ?,? WHERE EXISTS (SELECT 1 FROM arcade_playtest_releases WHERE game_id=?)
      ON CONFLICT(game_id) DO UPDATE SET metadata=excluded.metadata`)
      .bind(game.id, JSON.stringify(game), game.id)
  );
  if (statements.length) await db.batch(statements);
}

export function releaseableGame(game) {
  return Boolean(game?.url?.startsWith('/api/playtest/game/' + game.id + '/')
    && game.status !== 'coming-soon');
}
export async function readGameRelease(db, gameId) {
  if (!db) return null;
  try {
    return await db.prepare(select + ' WHERE game_id=?').bind(gameId).first();
  } catch {
    // A fresh site has no releases until the schedule table is initialized.
    return null;
  }
}
function publicGame(game, row, now) {
  const released = row.release_at <= now;
  return {
    id: game.id, title: game.title, description: game.description || '',
    genre: game.genre || 'Playtest', controls: game.controls || '',
    cover: game.cover, coverAlt: game.coverAlt, color: game.color, accent: game.accent,
    mobileFriendly: game.mobileFriendly,
    beforeId: row.before_id, releaseAt: row.release_at, upcoming: !released,
    ...(released ? {
      url: game.url, status: 'released',
      releasedAt: new Date(row.release_at).toISOString(),
      updatedAt: new Date(row.release_at).toISOString()
    } : {})
  };
}
async function smallJson(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let body = '', bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 2048) { await reader.cancel(); return null; }
      body += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handlePlaytestReleases(request, env, catalog, main, archives) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== url.origin)) {
    return response({ message: 'Open Playtest from the arcade.' }, 403);
  }
  const writing = request.method === 'POST';
  if (writing && !isArcadeOwner(request, env)) {
    return response({ message: 'Sign in with Rhett’s owner account to manage releases.' }, 403);
  }
  const db = env.DB;
  if (!db) return response({ message: 'Release scheduling is temporarily unavailable.' }, 503);
  const taken = new Set([...main, ...archives].map(game => game.id));
  const eligible = new Map(catalog.filter(game => releaseableGame(game) && !taken.has(game.id)).map(game => [game.id, game]));
  try {
    await db.exec(schema);
    await saveCatalogSnapshots(db, catalog);
    if (!writing) {
      const { results } = await db.prepare(select + ' ORDER BY updated_at, game_id').all();
      const now = Date.now();
      const games = [];
      for (const row of results || []) {
        if (taken.has(row.game_id)) continue;
        const game = eligible.get(row.game_id) || await releasedGameMetadata(db, row.game_id);
        if (game) games.push(publicGame(game, row, now));
      }
      return response({ now, games });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return response({ message: 'Use the release scheduler in Playtest.' }, 415);
    }
    const body = await smallJson(request);
    if (!eligible.has(body?.gameId)) return response({ message: 'Choose an unreleased hosted Playtest game.' }, 400);
    const now = Date.now();
    if (body.action === 'cancel') {
      const row = await db.prepare('DELETE FROM arcade_playtest_releases WHERE game_id=? AND release_at>? RETURNING game_id')
        .bind(body.gameId, now).first();
      if (!row) return response({ message: 'This countdown is gone or the game has already released.' }, 409);
      return response({ ok: true });
    }
    if (body.action !== 'schedule') return response({ message: 'Choose a release action.' }, 400);
    if (body.beforeId !== null && !main.some(game => game.id === body.beforeId)) {
      return response({ message: 'Choose a position in the main collection.' }, 400);
    }
    const choices = centralReleaseTimes(body.localTime);
    if (!choices.length) return response({ message: 'Choose a valid date and time in Central Time.' }, 400);
    if (!Number.isInteger(body.occurrence) || choices[body.occurrence] === undefined) {
      return response({ message: 'Choose which occurrence of that Central Time to use.' }, 400);
    }
    const releaseAt = choices[body.occurrence];
    if (releaseAt <= now) return response({ message: 'Choose a release time in the future.' }, 400);
    const schedule = db.prepare(`INSERT INTO arcade_playtest_releases (game_id, release_at, before_id, updated_at)
      VALUES (?,?,?,?) ON CONFLICT(game_id) DO UPDATE SET
      release_at=excluded.release_at, before_id=excluded.before_id, updated_at=excluded.updated_at
      WHERE arcade_playtest_releases.release_at>? RETURNING game_id`)
      .bind(body.gameId, releaseAt, body.beforeId, now, now);
    const snapshot = db.prepare(`INSERT INTO arcade_release_games (game_id,metadata) VALUES (?,?)
      ON CONFLICT(game_id) DO UPDATE SET metadata=excluded.metadata`)
      .bind(body.gameId, JSON.stringify(eligible.get(body.gameId)));
    const [result] = await db.batch([schedule, snapshot]);
    const row = result.results?.[0];
    if (!row) return response({ message: 'This game has already released.' }, 409);
    return response({ ok: true, releaseAt });
  } catch (error) {
    console.error('Playtest release scheduling database error:', error);
    return response({ message: 'Release scheduling is temporarily unavailable. Please try again.' }, 503);
  }
}
