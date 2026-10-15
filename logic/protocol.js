function metadata(game, {mode='bot-match',matchId,roomId,teams}={}) {
  const config=structuredClone(game.config);
  const width=config.length ?? config.boardSize, height=config.width ?? config.boardSize;
  const point=s=>({x:s.charCodeAt(0)-97,y:height-Number(s.slice(1))});
  return {protocolVersion:2,gameId:'ottv2',rendererVersion:'1',rulesVersion:'ottv2-rules-v1',mode,matchId,...(roomId?{roomId}:{}),mapName:config.mapName,...(width===height?{boardSize:width}:{}),board:{kind:'grid',width,height,goals:[point(config.targets.white),point(config.targets.black)],sources:{white:point(config.flags?.white ?? config.targets.black),black:point(config.flags?.black ?? config.targets.white)}},config,firstSide:config.firstSide,maxMoves:config.maxTurns,moveTimeLimitMs:config.timeTurnLimit ?? config.moveTimeLimitMs,timeLimitMs:config.timeTurnLimit ?? config.startingClockMs,teams:teams || {white:'White player',black:'Black player'}};
}
function result(game) {
  return {status:game.status,winner:game.winner,reason:game.endReason,turns:game.turnsPlayed,remaining:{white:game.countPieces('white'),black:game.countPieces('black')}};
}
module.exports={metadata,result};
