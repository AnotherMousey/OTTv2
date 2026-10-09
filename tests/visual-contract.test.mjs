import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const expected=JSON.parse(fs.readFileSync(new URL('../VISUAL_BASELINE.json',import.meta.url)));
test('protected visual source and fonts remain byte-identical',()=>{
 for(const [file,hash] of Object.entries(expected))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../frontend/'+file,import.meta.url))).digest('hex'),hash,file);
});
