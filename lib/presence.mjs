import { readGameRelease, releaseableGame } from './playtest-releases.mjs';

const lifetime = 35_000;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const reply = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' }
});

async function readPresence(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      bytes += value.byteLength;
      if (bytes > 512) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handlePresence(request, db, publicGames, playtest) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site' || (origin && origin !== url.origin)) {
    return reply({ error: 'Open the arcade to view online players.' }, 403);
  }
  const report = await readPresence(request);
  if (report?.version !== 2 || typeof report.session !== 'string' || !uuid.test(report.session) ||
      typeof report.visitor !== 'string' || !uuid.test(report.visitor)) {
    return reply({ error: 'Invalid presence session.' }, 400);
  }
  if (!db) return reply({ error: 'Online count is unavailable.' }, 503);

  const now = Date.now();
  try {
    if (report.leave === true) {
      await db.prepare('DELETE FROM arcade_presence WHERE session_id=? AND visitor_id=?')
        .bind(report.session, report.visitor).run();
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    let gameId = publicGames.has(report.game) ? report.game : null;
    if (!gameId && typeof report.game === 'string') {
      const entry = playtest.get(report.game);
      if (releaseableGame(entry)) {
        const release = await readGameRelease(db, entry.id);
        if (release && release.release_at <= now) gameId = entry.id;
      }
    }
    const [, , totals] = await db.batch([
      db.prepare('DELETE FROM arcade_presence WHERE expires_at<=?').bind(now),
      db.prepare(`INSERT INTO arcade_presence (session_id, visitor_id, game_id, expires_at)
        VALUES (?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET
        game_id=excluded.game_id, expires_at=excluded.expires_at
        WHERE arcade_presence.visitor_id=excluded.visitor_id`)
        .bind(report.session, report.visitor, gameId, now + lifetime),
      db.prepare(`SELECT game_id, COUNT(DISTINCT visitor_id) AS players
        FROM arcade_presence WHERE expires_at>? GROUP BY game_id
        UNION ALL SELECT '', COUNT(DISTINCT visitor_id)
        FROM arcade_presence WHERE expires_at>?`).bind(now, now),
    ]);
    const rows = totals.results || [];
    return reply({
      online: rows.find(row => row.game_id === '')?.players ?? 0,
      games: rows.filter(row => row.game_id && row.players > 0)
        .map(row => ({ title: (publicGames.get(row.game_id) || playtest.get(row.game_id))?.title, players: row.players }))
        .filter(game => game.title)
        .sort((a, b) => b.players - a.players || a.title.localeCompare(b.title)),
    });
  } catch {
    return reply({ error: 'Online count is unavailable.' }, 503);
  }
}
