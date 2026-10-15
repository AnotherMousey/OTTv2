const fs=require('fs'),path=require('path');
const Engine=require('../logic/engine');
const {metadata,result}=require('../logic/protocol');
const {capture}=require('../logic/replay-log');
const root=path.resolve(__dirname,'..');
// Reproducible scripted fixtures: moves are judged normally; wall-clock time is fixed.
const realNow=Date.now; Date.now=()=>1700000000000;
const write=(name,data)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');};
const types=['rock','paper','scissors'];
function map(size,depth,name) {
 const initialPieces=[];
 for(const color of ['white','black'])for(let y=0;y<depth;y++)for(let x=0;x<3;x++) {
  const col=color==='white'?x:size-3+x;
  const rank=color==='white'?y+1:size-y;
  initialPieces.push({color,type:types[(x+y)%3],square:`${String.fromCharCode(97+col)}${rank}`});
 }
 return {mapName:name,boardSize:size,initialPieces};
}
const maps=[['small-5',map(5,1,'Small 5×5 — 3 pieces per side')],['standard-9',map(9,3,'Standard 9×9 — 9 pieces per side')],['large-13',map(13,6,'Large 13×13 — 18 pieces per side')]];
for(const [id,config] of maps)write(`samples/maps/${id}.json`,config);
function p(color,type,square){return{color,type,square};}
const scenarios=[];
const add=(id,title,config,moves,winner,reason)=>scenarios.push({id,title,config,moves,expected:{winner,reason}});
add('01-white-enemy-source','White reaches Black source i9', {boardSize:9,maxTurns:20,initialPieces:[p('white','rock','f6'),p('white','paper','b1'),p('white','scissors','c1'),p('black','rock','a5'),p('black','paper','b5'),p('black','scissors','c5')]},[['f6','g7'],['a5','a6'],['g7','h8'],['a6','a5'],['h8','i9']],'white','enemy-source-reached');
add('02-black-enemy-source','Black reaches White source a1', {boardSize:9,maxTurns:20,firstSide:'black',initialPieces:[p('black','rock','d4'),p('black','paper','g9'),p('black','scissors','h9'),p('white','rock','i5'),p('white','paper','h5'),p('white','scissors','g5')]},[['d4','c3'],['i5','i6'],['c3','b2'],['i6','i5'],['b2','a1']],'black','enemy-source-reached');
add('03-limit-white-more-pieces','Limit reached after a capture: White 4, Black 3', {boardSize:9,maxTurns:4,initialPieces:[p('white','rock','d4'),p('white','rock','b1'),p('white','paper','c1'),p('white','scissors','d1'),p('black','scissors','e5'),p('black','rock','g9'),p('black','paper','h9'),p('black','scissors','f9')]},[['d4','e5'],['g9','g8'],['e5','e6'],['g8','g9']],'white','move-limit-more-pieces');
add('04-limit-black-more-pieces','Limit reached after a capture: Black 4, White 3', {boardSize:9,maxTurns:4,firstSide:'black',initialPieces:[p('black','rock','e5'),p('black','rock','g9'),p('black','paper','h9'),p('black','scissors','f9'),p('white','scissors','d4'),p('white','rock','b1'),p('white','paper','c1'),p('white','scissors','d1')]},[['e5','d4'],['b1','b2'],['d4','d5'],['b2','b1']],'black','move-limit-more-pieces');
add('05-limit-equal-draw','Equal piece counts at limit: draw', {boardSize:9,maxTurns:4},[['b1','a2'],['h9','i8'],['a2','b1'],['i8','h9']],null,'move-limit-draw');
add('06-small-5-finished','Smaller map: 5×5, 6 initial pieces, terminal draw', {...maps[0][1],maxTurns:4},[['b1','a2'],['b5','a4'],['a2','b1'],['a4','b5']],null,'move-limit-draw');
add('07-large-13-finished','Larger map: 13×13, 36 initial pieces, terminal draw', {...maps[2][1],maxTurns:4},[['b1','a2'],['j13','m12'],['a2','b1'],['m12','j13']],null,'move-limit-draw');
// Large-map moves must be one square; use the edge of the black deployment.
scenarios.at(-1).moves=[['b1','a2'],['l13','m12'],['a2','b1'],['m12','l13']];
add('08-one-type-eliminated','Optional one-type elimination rule', {boardSize:9,maxTurns:20,elimination:'one-type',initialPieces:[p('white','rock','d4'),p('white','paper','b1'),p('white','scissors','c1'),p('black','scissors','e5'),p('black','rock','g9'),p('black','paper','h9')]},[['d4','e5']],'white','type-eliminated');
add('09-all-pieces-eliminated','Legacy all-piece elimination', {boardSize:9,maxTurns:20,initialPieces:[p('white','rock','d4'),p('white','paper','b1'),p('white','scissors','c1'),p('black','scissors','e5')]},[['d4','e5']],'white','all-pieces-eliminated');
const catalog=[];
for(const scenario of scenarios) {
 const game=new Engine({...scenario.config,mapName:scenario.title},'bot');
 const log={...metadata(game,{matchId:scenario.id,mode:'sample-match'}),format:'ottv2-log-v1',frames:[capture(game,'Judge initialized map')]};
 for(const [from,to] of scenario.moves) {game.movePiece(from,to);log.frames.push(capture(game,`${game.history.at(-1).player}: ${from} → ${to}`,game.history.at(-1)));}
 if(game.status!=='finished'||game.winner!==scenario.expected.winner||game.endReason!==scenario.expected.reason)throw Error(`Sample ${scenario.id} did not reach expected terminal state.`);
 log.result=result(game);log.frames.push(capture(game,`Match finished: ${game.endReason}. Winner: ${game.winner||'draw'}.`));
 // Normalized render replay remains compatible with the established viewer schema.
 const replay={...log,schemaVersion:1,frames:log.frames.map(({state,event,move,moveNumber})=>({event,moveNumber,pieces:state.board.flat().filter(Boolean).map(piece=>({id:piece.id,side:piece.color,type:piece.type,x:piece.square.charCodeAt(0)-97,y:game.size-Number(piece.square.slice(1))})),side:move?.player||state.currentTurn,...(move?{from:move.from,to:move.to}:{}),status:state.status,winner:state.winner,endReason:state.endReason,currentTurn:state.currentTurn,clocks:{white:state.whiteTimeMs,black:state.blackTimeMs}}))};
 write(`samples/scenarios/${scenario.id}.json`,scenario);
 write(`samples/matches/${scenario.id}.json`,replay);
 catalog.push({id:scenario.id,title:scenario.title,replay});
}
write('samples/catalog.json',catalog.map(({id,title,replay})=>({id,title,file:`matches/${id}.json`,boardSize:replay.boardSize,pieces:replay.frames[0].pieces.length,result:replay.result})));
// Embedded samples are usable in file:// preview and deployed Vercel pages.
write('frontend/src/games/samples.json',catalog);
write('frontend/src/games/maps.json',maps.map(([id,config])=>({id,config})));
Date.now=realNow;
console.log(`Generated ${maps.length} maps and ${catalog.length} engine-verified finished matches.`);
