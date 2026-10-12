function metadata(game, {mode='bot-match',matchId,roomId,teams}={}) {
  const config=structuredClone(game.config), size=config.boardSize;
  const point=s=>({x:s.charCodeAt(0)-97,y:size-Number(s.slice(1))});
  return {protocolVersion:2,gameId:'ottv2',rendererVersion:'1',rulesVersion:'ottv2-configurable-v2',mode,matchId,...(roomId?{roomId}:{}),mapName:config.mapName,boardSize:size,board:{kind:'grid',width:size,height:size,goals:[point(config.targets.white),point(config.targets.black)],sources:{white:point(config.targets.black),black:point(config.targets.white)}},config,firstSide:config.firstSide,maxMoves:config.maxTurns,timeLimitMs:config.startingClockMs,teams:teams || {white:'White player',black:'Black player'}};
}
function result(game) {
  return {status:game.status,winner:game.winner,reason:game.endReason,turns:game.turnsPlayed,remaining:{white:game.countPieces('white'),black:game.countPieces('black')}};
}
module.exports={metadata,result};
