const Engine = require('./ottv2/engine');
const {buildConfig} = require('./ottv2/config');
const fs = require('fs');
const path = require('path');
function resolveGame(gameId='ottv2') {
  if (gameId !== 'ottv2') throw Error(`Unsupported judge game: ${gameId}`);
  return {create:(config={},mode='room')=>new Engine(config,mode)};
}
function maps() {
  const dir=path.resolve(__dirname,'../../samples/maps');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(file=>({id:file.replace(/\.json$/,''),config:JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))}));
}
function resolveConfig(mapId,config,mode) {
  let base={};
  if (mapId) {const map=maps().find(m=>m.id===mapId);if(!map)throw Error('Map not found.');base=map.config;}
  return buildConfig({...base,...(config || {})},mode);
}
function specification() {
  return {protocolVersion:2,gameId:'ottv2',rendererVersion:'1',rulesVersion:'ottv2-rules-v1',title:'OTTv2',board:{kind:'grid',minLength:9,maxLength:20,minWidth:9,maxWidth:20},pieceTypes:['rock','paper','scissors'],players:['white','black'],languages:['java','cpp','python'],defaultBotConfig:buildConfig({},'bot'),maps:maps(),rules:{movement:'one-square-eight-directions',capture:'rock > scissors > paper > rock; same type blocks',victory:'Reach the enemy flag or eliminate all enemy soldiers',limit:'count, nearest Manhattan distance, total Manhattan distance, then rock-paper-scissors',turn:'one second; invalid moves do not end the turn'}};
}
module.exports={resolveGame,resolveConfig,specification};
