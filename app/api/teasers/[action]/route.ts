import {env} from 'cloudflare:workers';
import {handleTeasers} from '../../../../lib/teasers.mjs';
export function GET(request:Request){return handleTeasers(request,env);}
export function POST(request:Request){return handleTeasers(request,env);}
