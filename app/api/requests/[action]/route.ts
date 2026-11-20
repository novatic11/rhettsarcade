import {env} from 'cloudflare:workers';
import {handleRequests} from '../../../../lib/requests.mjs';
import playtestCatalog from '../../../../playtest/catalog.json';
export function GET(request:Request){return handleRequests(request,env);}
export function POST(request:Request){return handleRequests(request,env,playtestCatalog);}
