import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {matchLogToReplay,positionToSquare} from './games/ottv2/legacyAdapter.js';import {mapMoveLimit,supportedMaps} from './games/ottv2/settings.js';
const require=createRequire(import.meta.url),Engine=require('../../logic/games/ottv2/engine'),{metadata}=require('../../logic/protocol');
test('new rectangular engine snapshots render through the existing replay adapter',()=>{
 const game=new Engine({length:10,width:12,initialPieces:[{color:'white',type:'rock',square:'b10'},{color:'black',type:'paper',square:'j12'}]});const replay=matchLogToReplay({...metadata(game,{matchId:'rectangle'}),frames:[{state:game.getPublicState(),event:'start',moveNumber:0}]});assert.equal(replay.board.width,10);assert.equal(replay.board.height,12);assert.ok(replay.frames[0].pieces.some(p=>p.side==='white'&&p.x===1&&p.y===2));assert.equal(positionToSquare(9,0,10,12),'j12');
});
test('settings show map-derived limits and do not offer unsupported historical maps',()=>{
 const maps=supportedMaps([{id:'old',config:{boardSize:5}},{id:'rectangle',config:{length:10,width:12}}]);assert.equal(maps.length,1);assert.equal(mapMoveLimit(maps,'rectangle'),480);
});
