import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/build-preview.mjs'], {cwd:'frontend',stdio:'inherit'});
