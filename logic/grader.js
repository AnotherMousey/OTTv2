const {metadata,result} = require('./protocol');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { capture } = require('./replay-log');

const {requireRuntime}=require('./runtime');
const TURN_TIMEOUT_MS = 2000;
const COMPILE_TIMEOUT_MS = 15000;

const RUNNER = path.join(__dirname, 'grader', 'JavaRunner.java');
const SDK = path.join(__dirname, 'sdk', 'java');
const CPP_SDK = path.join(__dirname, 'sdk', 'cpp');
const CPP_RUNNER = path.join(__dirname, 'grader', 'cpp_runner.cpp');
const PYTHON_RUNNER = path.join(__dirname, 'grader', 'python_runner.py');

function runCommand(command, args, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error(`${command} timed out.`));
    }, timeoutMs);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    child.stdout?.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr?.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => finish(new Error(`Could not start ${command}: ${error.message}`)));
    child.on('close', code => {
      if (code !== 0) {
        finish(new Error(stderr.trim() || `${command} exited with code ${code}.`));
      } else {
        finish(null, { child, stdout, stderr });
      }
    });
  });
}

async function compilePlayer(source, language, matchId, color) {
  const runtime=requireRuntime(language);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ottv2-grader-'));
  const filenames = { java: 'RobotPlayer.java', cpp: 'player.cpp', python: 'player.py' };
  const sourcePath = path.join(directory, filenames[language]);
  await fs.writeFile(sourcePath, source, 'utf8');
  try {
    if (language === 'python') {
      const sdkPath = path.join(directory, 'ottv2.py');
      await fs.copyFile(path.join(__dirname, 'sdk', 'python', 'ottv2.py'), sdkPath);
      const processHandle = spawn(runtime.command, [PYTHON_RUNNER, sourcePath], {
        cwd: directory, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      });
      return makePlayer(processHandle, directory);
    }
    if (language === 'cpp') {
      const executable = path.join(directory, process.platform === 'win32' ? 'player.exe' : 'player');
      await runCommand(runtime.command, ['-std=c++20', '-O2', '-I', CPP_SDK, sourcePath, CPP_RUNNER, '-o', executable],
        { stdio: ['ignore', 'pipe', 'pipe'] }, COMPILE_TIMEOUT_MS);
      return makePlayer(spawn(executable, [color], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      }), directory);
    }
    const sdkFiles = [
      ...require('fs').readdirSync(path.join(SDK, 'ottv2', 'sdk'))
        .filter(file => file.endsWith('.java'))
        .map(file => path.join(SDK, 'ottv2', 'sdk', file)),
    ];
    await runCommand(runtime.compiler, [
      '-encoding', 'UTF-8', '-d', directory,
      ...sdkFiles, RUNNER, sourcePath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] }, COMPILE_TIMEOUT_MS);
    const processHandle = spawn(runtime.command, ['-cp', directory, 'JavaRunner', color], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return makePlayer(processHandle, directory);
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw new Error(`${color} ${language} compilation failed: ${error.message}`);
  }
}

function makePlayer(child, directory, output = '', errors = '') {
  child.on('error', error => { errors += `Could not start player: ${error.message}`; });
  child.stdout.on('data', chunk => { output += chunk.toString(); if(output.length>1024*1024){errors+=' Player output exceeded limit.';child.kill();} });
  child.stderr.on('data', chunk => { errors = (errors + chunk.toString()).slice(-65536); });
  return {
    child,
    get output() { return output; },
    set output(value) { output = value; },
    get errors() { return errors; },
    directory,
  };
}

async function requestMove(player, state) {
  if (player.child.exitCode !== null) {
    throw new Error(`Player process exited with code ${player.child.exitCode}. ${player.errors}`.trim());
  }
  player.child.stdin.write(state);

  const started = Date.now();
  while (Date.now() - started < TURN_TIMEOUT_MS) {
    if (player.child.exitCode !== null || player.child.killed || player.errors.startsWith('Could not start player')) throw Error(`Player process stopped. ${player.errors}`.trim());
    const newline = player.output.indexOf('\n');
    if (newline >= 0) {
      const line = player.output.slice(0, newline).trim();
      player.output = player.output.slice(newline + 1);
      const [from, to] = line.split(/\s+/);
      if (!from || !to) throw new Error('Player returned an invalid move.');
      return { from, to };
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Player did not return a move before the timeout. ${player.errors}`.trim());
}

async function stopPlayer(player) {
  if (!player) return;
  const child = player.child;
  if (child.exitCode === null && !child.killed) {
    child.kill();
  }
  if (child.exitCode === null) {
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 1000);
      child.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
  await fs.rm(player.directory, { recursive: true, force: true });
}

async function runMatch({
  matchId, whiteSource, blackSource, whiteLanguage = 'java', blackLanguage = 'java', game,
}) {
  const replay = {
    ...metadata(game,{matchId,mode:'bot-match'}),
    format: 'ottv2-log-v1',
    frames: [capture(game, 'match-start')],
  };
  const players = {};
  try {
    players.white = await compilePlayer(whiteSource, whiteLanguage, matchId, 'white');
    players.black = await compilePlayer(blackSource, blackLanguage, matchId, 'black');
    for (let turn = 0; turn < game.config.maxTurns && game.status === 'active'; turn += 1) {
      const color = game.currentTurn;
      try {
        const move = await requestMove(players[color], game.serializeBotState(color));
        try {
          game.movePiece(move.from, move.to);
          replay.frames.push(capture(game, `${color}-move`, game.history.at(-1)));
        } catch (error) {
          if (game.status !== 'active') throw error;
          game.skipTurn();
          replay.frames.push(capture(
            game,
            `${color}-invalid-move: ${move.from} → ${move.to}; turn forfeited: ${error.message}`,
            { player: color, from: move.from, to: move.to, result: 'invalid' },
          ));
        }
      } catch (error) {
        game.forfeit(color, 'bot-error');
        replay.frames.push(capture(game, `${color}-forfeit: ${error.message}`));
        break;
      }
    }
    if (game.status === 'active') {
      game.finishAtLimit();
    }
    replay.result = result(game);
    replay.frames.push(capture(game, `Match finished: ${game.endReason || 'finished'}. Winner: ${game.winner || 'draw'}.`));
    return replay;
  } finally {
    await Promise.all(Object.values(players).map(stopPlayer));
  }
}

module.exports = { runMatch };
