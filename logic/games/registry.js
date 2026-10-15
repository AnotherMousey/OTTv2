// Only operator-installed code can become a game plugin. Requests never load paths.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const plugins = new Map();

function registerGame(plugin, files = []) {
  const requiredMethods = [
    'configure',
    'score',
    'validate',
    'run',
    'specification',
    'deadlineMs',
  ];

  if (
    !plugin?.identity ||
    typeof plugin.identity.id !== 'string' ||
    !requiredMethods.every(method => typeof plugin[method] === 'function')
  ) {
    throw Error('Invalid game plugin contract.');
  }

  if (plugins.has(plugin.identity.id)) {
    throw Error('Duplicate game plugin.');
  }

  const hash = crypto.createHash('sha256');

  for (const file of [...files, ...(plugin.artifacts || [])]) {
    const bytes = fs.readFileSync(file);

    hash.update(String(bytes.length) + ':');
    hash.update(bytes);
  }

  if (!files.length && !plugin.artifacts?.length) {
    for (const method of requiredMethods) {
      hash.update(plugin[method].toString());
    }
  }

  plugins.set(plugin.identity.id, {
    ...plugin,
    identity: {
      ...plugin.identity,
      libraryDigest: hash.digest('hex'),
    },
  });
}

registerGame(
  require('./ottv2/plugin.cjs'),
  [
    './ottv2/plugin.cjs',
    './ottv2/engine.js',
    './ottv2/config.js',
    './ottv2/utils.js',
    './ottv2/constants.js',
    '../grader.js',
    '../protocol.js',
    '../replay-log.js',
  ].map(file => path.resolve(__dirname, file)),
);

if (process.env.GAME_PLUGIN_MODULE) {
  const file = path.resolve(process.env.GAME_PLUGIN_MODULE);

  registerGame(require(file), [file]);
}

function resolveGame(gameId = 'ottv2') {
  const plugin = plugins.get(gameId);

  if (!plugin) {
    throw Error(`Unsupported judge game: ${gameId}`);
  }

  return plugin;
}

// Compatibility API retained for legacy room consumers.
function resolveConfig(mapId, config, mode) {
  try { return resolveGame().configure(
    {
      ...config,
      ...(mapId ? { mapId } : {}),
    },
    mode,
  ); } catch(error) { error.status=400; throw error; }
}

function specification(gameId = 'ottv2') {
  return resolveGame(gameId).specification();
}

module.exports = {
  resolveGame,
  resolveConfig,
  specification,
  registerGame,
};