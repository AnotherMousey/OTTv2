const TYPES = ['rock', 'paper', 'scissors'];
const LEGACY_WHITE = [['b1','rock'],['c1','paper'],['d1','scissors'],['b2','paper'],['c2','scissors'],['d2','rock'],['b3','scissors'],['c3','rock'],['d3','paper']];
const LEGACY_BLACK = [['f7','paper'],['g7','rock'],['h7','scissors'],['f8','rock'],['g8','scissors'],['h8','paper'],['f9','scissors'],['g9','paper'],['h9','rock']];
function normalizeConfig(input = {}, mode = 'room') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('config must be an object.');
  const size = input.boardSize ?? 9;
  if (!Number.isInteger(size) || size < 5 || size > 26) throw Error('boardSize must be an integer from 5 to 26.');
  const firstSide = input.firstSide ?? 'white';
  if (!['white','black'].includes(firstSide)) throw Error('Invalid firstSide.');
  const maxTurns = input.maxTurns === undefined ? (mode === 'bot' ? 31 : null) : input.maxTurns;
  if (maxTurns !== null && (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 10000)) throw Error('maxTurns must be null or 1–10000.');
  // Bot jobs always have a finite bound; unlimited rooms retain legacy behavior.
  if (mode === 'bot' && maxTurns === null) throw Error('Bot matches require a finite maxTurns.');
  const moveTimeLimitMs = input.moveTimeLimitMs ?? 2000;
  if (!Number.isInteger(moveTimeLimitMs) || moveTimeLimitMs < 100 || moveTimeLimitMs > 10000) throw Error('moveTimeLimitMs must be 100–10000.');
  const startingClockMs = input.startingClockMs ?? 300000;
  if (!Number.isInteger(startingClockMs) || startingClockMs < 1 || startingClockMs > 86400000) throw Error('Invalid startingClockMs.');
  const elimination = input.elimination ?? 'all-pieces';
  if (!['all-pieces','one-type'].includes(elimination)) throw Error('Invalid elimination rule.');
  const limitPolicy = input.limitPolicy ?? 'more-pieces';
  if (!['more-pieces','draw'].includes(limitPolicy)) throw Error('Invalid limitPolicy.');
  const targets = input.targets ?? {white:`${String.fromCharCode(96+size)}${size}`, black:'a1'};
  const validSquare = s => { const m=/^([a-z])(\d{1,2})$/.exec(s || ''); return Boolean(m && m[1].charCodeAt(0)-97<size && +m[2]>=1 && +m[2]<=size); };
  if (!validSquare(targets.white) || !validSquare(targets.black) || targets.white === targets.black) throw Error('Invalid target squares.');
  let pieces = input.initialPieces;
  if (pieces === undefined && size === 9) pieces = [...LEGACY_WHITE.map(([square,type])=>({color:'white',square,type})),...LEGACY_BLACK.map(([square,type])=>({color:'black',square,type}))];
  if (!Array.isArray(pieces) || !pieces.length || pieces.length > size*size) throw Error('Custom boards require initialPieces.');
  const cells=new Set(), ids=new Set();
  pieces = pieces.map((p,i)=>{
    if (!p || !['white','black'].includes(p.color) || !TYPES.includes(p.type) || !validSquare(p.square) || cells.has(p.square)) throw Error('Invalid or overlapping initial piece.');
    const sideIndex = pieces.slice(0,i).filter(q=>q.color===p.color).length;
    const id = p.id ?? `${p.color}-${p.type}-${sideIndex}`;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw Error('Invalid or duplicate piece ID.');
    cells.add(p.square); ids.add(id); return {id,color:p.color,type:p.type,square:p.square};
  });
  for (const side of ['white','black']) {
    if (!pieces.some(p=>p.color===side)) throw Error('Both sides require pieces.');
    if (elimination==='one-type' && TYPES.some(t=>!pieces.some(p=>p.color===side && p.type===t))) throw Error('one-type elimination requires each side to start with every type.');
    if (pieces.some(p=>p.color===side && p.square===targets[side])) throw Error('A piece cannot start on its own victory target.');
  }
  return {boardSize:size,firstSide,maxTurns,moveTimeLimitMs,startingClockMs,elimination,limitPolicy,targets:{...targets},initialPieces:pieces,mapName:String(input.mapName || `OTTv2 ${size}×${size}`).slice(0,100)};
}
module.exports = {normalizeConfig,TYPES};
