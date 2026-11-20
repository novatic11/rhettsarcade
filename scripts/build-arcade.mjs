import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareArcadeBuild} from './arcade-pages.mjs';
const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run-framework.mjs',import.meta.url)),'build'],{stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
prepareArcadeBuild();
