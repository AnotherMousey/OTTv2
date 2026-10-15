// Only operator-installed code can become a game plugin. Requests never load paths.
const plugins=new Map();
function registerGame(plugin,files=[]){
 if(!plugin?.identity||typeof plugin.identity.id!=='string'||!['configure','score','validate','run','specification','deadlineMs'].every(k=>typeof plugin[k]==='function'))throw Error('Invalid game plugin contract.');
 if(plugins.has(plugin.identity.id))throw Error('Duplicate game plugin.');
 const crypto=require('node:crypto'),fs=require('node:fs');const hash=crypto.createHash('sha256');for(const file of [...files,...(plugin.artifacts||[])]){const bytes=fs.readFileSync(file);hash.update(String(bytes.length)+':');hash.update(bytes);}
 if(!files.length&&!plugin.artifacts?.length)for(const key of ['configure','score','validate','run','specification','deadlineMs'])hash.update(plugin[key].toString());
 plugins.set(plugin.identity.id,{...plugin,identity:{...plugin.identity,libraryDigest:hash.digest('hex')}});
}
registerGame(require('./ottv2/plugin.cjs'),['./ottv2/plugin.cjs','./ottv2/engine.js','./ottv2/config.js','./ottv2/utils.js','./ottv2/constants.js','../grader.js','../protocol.js','../replay-log.js'].map(file=>require('node:path').resolve(__dirname,file)));
if(process.env.GAME_PLUGIN_MODULE){const file=require('node:path').resolve(process.env.GAME_PLUGIN_MODULE);registerGame(require(file),[file]);}
function resolveGame(gameId='ottv2'){const plugin=plugins.get(gameId);if(!plugin)throw Error(`Unsupported judge game: ${gameId}`);return plugin;}
// Compatibility API retained for legacy room consumers.
function resolveConfig(mapId,config,mode){return resolveGame().configure({...config,...(mapId?{mapId}:{})},mode);}
function specification(gameId='ottv2'){return resolveGame(gameId).specification();}
module.exports={resolveGame,resolveConfig,specification,registerGame};
