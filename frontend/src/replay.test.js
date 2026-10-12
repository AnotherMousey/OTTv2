import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoReplay, parseReplay } from './replay.js';
import { recordingToReplay } from './api/replayAdapter.js';

test('original demo fixture imports without frontend combat execution', () => {
 assert.deepEqual(parseReplay(JSON.stringify(demoReplay)), demoReplay);
});
test('second game and board dimensions work through the same parser', () => {
 const sample = JSON.parse(fs.readFileSync(new URL('../samples/grid-demo.json', import.meta.url)));
 assert.equal(parseReplay(JSON.stringify(sample)).boardSize, 8);
 const rectangular = structuredClone(sample);
 rectangular.board.width = 10; rectangular.board.height = 8;
 rectangular.frames[0].pieces[0].x = 9;
 assert.equal(parseReplay(JSON.stringify(rectangular)).board.width, 10);
 rectangular.frames[0].pieces[0].x = 10;
 assert.throws(() => parseReplay(JSON.stringify(rectangular)), /Invalid/);
});
test('unsupported game and renderer fail clearly, malformed snapshots are rejected', () => {
 assert.throws(() => parseReplay('{}'), /Unsupported game/);
 const r = structuredClone(demoReplay);
 r.rendererVersion = '99';
 assert.throws(() => parseReplay(JSON.stringify(r)), /renderer/);
 delete r.rendererVersion;
 r.frames[0].pieces[1].x = r.frames[0].pieces[0].x;
 assert.throws(() => parseReplay(JSON.stringify(r)), /overlapping/);
});
test('legacy room API still decodes canonical squares through its game adapter', () => {
 const board = Array.from({length:9}, () => Array(9).fill(null));
 board[8][0] = {id:'p1', color:'white', type:'rock', square:'a1'};
 const r = recordingToReplay({roomId:'OTT-X',matchId:'M1',frames:[{state:{board,currentTurn:'white',status:'active',whiteTimeMs:300000,blackTimeMs:300000},event:'start',moveNumber:0}]});
 assert.deepEqual(r.frames[0].pieces[0], {id:'p1',side:'white',type:'rock',x:0,y:8});
});
