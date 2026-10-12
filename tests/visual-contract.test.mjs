import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
const expected=JSON.parse(fs.readFileSync(new URL('../VISUAL_BASELINE.json',import.meta.url)));
const changed=new Set(['src/style.css','src/Board.jsx','src/replay.js','src/replay.test.js','src/Pixel.jsx']);
test('unchanged visual assets and relocated OTT sprites preserve baseline hashes',()=>{
 for(const [file,hash] of Object.entries(expected)) {
  if(changed.has(file))continue;
  const target=file==='src/Pixel.jsx'?'src/games/ottv2/Pixel.jsx':file;
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../frontend/'+target,import.meta.url))).digest('hex'),hash,target);
 }
});

test('original piece and interface sprite definitions are preserved',()=>{
 const text=fs.readFileSync(new URL('../frontend/src/games/ottv2/Pixel.jsx',import.meta.url),'utf8');
 const sprites=text.split('const sprites = ')[1].split('  flag:')[0];
 assert.equal(crypto.createHash('sha256').update(sprites).digest('hex'),'f92a0575ba135058f6bc2321a8fbd146d478ac9853f8d21f6bd91029e6848d13');
});
