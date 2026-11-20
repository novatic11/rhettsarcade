import { env } from 'cloudflare:workers';
import main from '../../../public/games.json';
import archives from '../../../public/junkyard-games.json';
import playtest from '../../../playtest/catalog.json';
import { handlePresence } from '../../../lib/presence.mjs';

const publicGames = new Map([...main, ...archives].map(game => [game.id, game]));
const playtestGames = new Map(playtest.map(game => [game.id, game]));

export function POST(request: Request) {
  return handlePresence(request, env.DB, publicGames, playtestGames);
}
