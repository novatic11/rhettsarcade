import {env} from 'cloudflare:workers';
import catalog from '../../../../playtest/catalog.json';
import {handlePlaytest} from '../../../../lib/playtest.mjs';
export function GET(request:Request){return handlePlaytest(request,env,catalog);}
export function POST(request:Request){return handlePlaytest(request,env,catalog);}
