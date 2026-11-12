import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { brainConfig } from './ai-provider.js';
import { ensureOllama } from './local-runtime.js';
const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);
try { await fs.copyFile(path.join(root,'.env.example'),path.join(root,'.env'),fs.constants.COPYFILE_EXCL); } catch(e) { if(e.code !== 'EEXIST')throw e; }
await import('dotenv/config');
const config=brainConfig();
if(config.provider==='ollama')await ensureOllama(root,config);
await import('./server.js');
