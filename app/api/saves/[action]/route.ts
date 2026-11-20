import { env } from "cloudflare:workers";
import { handleVault } from "../../../../lib/save-vault.mjs";
export function GET(request:Request){return handleVault(request,env);}
export function POST(request:Request){return handleVault(request,env);}
