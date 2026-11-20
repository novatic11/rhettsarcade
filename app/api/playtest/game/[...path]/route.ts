import {env} from 'cloudflare:workers';
import catalog from '../../../../../playtest/catalog.json';
// The worker build embeds these files; they never enter the public asset directory.
// @ts-ignore Virtual module supplied by the Playtest Vite plugin.
import assets from 'virtual:arcade-playtest-assets';
import {servePlaytestAsset} from '../../../../../lib/playtest.mjs';
export function GET(request:Request){return servePlaytestAsset(request,env,assets,catalog);}
