import { env } from 'cloudflare:workers';
import catalog from '../../../../playtest/catalog.json';
import main from '../../../../public/games.json';
import archives from '../../../../public/junkyard-games.json';
import { handlePlaytestReleases } from '../../../../lib/playtest-releases.mjs';

export function GET(request: Request) {
  return handlePlaytestReleases(request, env, catalog, main, archives);
}
export function POST(request: Request) {
  return handlePlaytestReleases(request, env, catalog, main, archives);
}
