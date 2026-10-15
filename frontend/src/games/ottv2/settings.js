// Display adapter for OTTv2's published configuration; platform code owns no rules.
export function supportedMaps(maps) {
  return maps.filter(({config={}})=>{
    const length=config.length??config.boardSize, width=config.width??config.boardSize;
    return Number.isInteger(length)&&Number.isInteger(width)&&length>=9&&length<=20&&width>=9&&width<=20;
  });
}
export function mapMoveLimit(maps,id) {
  const config=maps.find(map=>map.id===id)?.config;
  if(!config)return 0;
  return config.maxTurns??20*(config.length??config.boardSize)*(config.width??config.boardSize);
}
