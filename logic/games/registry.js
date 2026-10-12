const Engine = require('./ottv2/engine');
const {normalizeConfig} = require('./ottv2/config');
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
  return normalizeConfig({...base,...(config || {})},mode);
}
function specification() {
  return {protocolVersion:2,gameId:'ottv2',rendererVersion:'1',rulesVersion:'ottv2-configurable-v2',title:'OTTv2',board:{kind:'grid',minSize:5,maxSize:26},pieceTypes:['rock','paper','scissors'],players:['white','black'],languages:['java','cpp','python'],defaultBotConfig:normalizeConfig({},'bot'),maps:maps(),rules:{movement:'one-square-eight-directions',capture:'rock > scissors > paper > rock; same type blocks',victory:'Reach opponent source or eliminate pieces according to config',limit:'More remaining pieces wins; equal counts draw',invalidBotMove:'Consumes one turn; room invalid moves are rejected without consuming a turn'}};
}
module.exports={resolveGame,resolveConfig,specification};
