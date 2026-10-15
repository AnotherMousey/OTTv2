const PIECE_TYPES = ['rock', 'paper', 'scissors'];
const MIN_SIZE = 9;
const MAX_SIZE = 20;
const LEGACY_WHITE = [['b1','rock'],['c1','paper'],['d1','scissors'],['b2','paper'],['c2','scissors'],['d2','rock'],['b3','scissors'],['c3','rock'],['d3','paper']];
const LEGACY_BLACK = [['f7','paper'],['g7','rock'],['h7','scissors'],['f8','rock'],['g8','scissors'],['h8','paper'],['f9','scissors'],['g9','paper'],['h9','rock']];

function squareToPoint(square) {
  const match = /^([a-z]+)(\d+)$/.exec(square);
  return {x: match[1].charCodeAt(0) - 97, y: Number(match[2]) - 1};
}

function buildConfig(input = {}, mode = 'room') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('config must be an object.');
  const length = input.length ?? input.boardLength ?? input.boardSize ?? 9;
  const width = input.width ?? input.boardWidth ?? input.boardSize ?? 9;
  if (!Number.isInteger(length) || length < MIN_SIZE || length > MAX_SIZE) throw Error('length must be an integer from 9 to 20.');
  if (!Number.isInteger(width) || width < MIN_SIZE || width > MAX_SIZE) throw Error('width must be an integer from 9 to 20.');
  const firstSide = input.firstSide ?? 'white';
  if (!['white','black'].includes(firstSide)) throw Error('Invalid firstSide.');
  const maxTurns = 4 * length * width;
  const timeTurnLimit = input.timeTurnLimit ?? input.moveTimeLimitMs ?? 1000;
  if (!Number.isInteger(timeTurnLimit) || timeTurnLimit < 1 || timeTurnLimit > 10000) throw Error('timeTurnLimit must be an integer from 1 to 10000 ms.');
  const targets = input.targets ?? {white:`${String.fromCharCode(96+length)}${width}`, black:'a1'};
  const validSquare = s => { const m=typeof s==='string' && /^([a-z])([1-9]\d?)$/.exec(s); return Boolean(m && m[1].charCodeAt(0)-97<length && +m[2]<=width); };
  if (!validSquare(targets.white) || !validSquare(targets.black) || targets.white === targets.black) throw Error('Invalid target squares.');
  let pieces = input.initialPieces;
  if (pieces === undefined && length === 9 && width === 9) pieces = [...LEGACY_WHITE.map(([square,type])=>({color:'white',square,type})),...LEGACY_BLACK.map(([square,type])=>({color:'black',square,type}))];
  if (!Array.isArray(pieces) || !pieces.length || pieces.length > length*width) throw Error('Custom boards require initialPieces.');
  const cells=new Set(), ids=new Set();
  pieces = pieces.map((p,i)=>{
    if (!p || !['white','black'].includes(p.color) || !PIECE_TYPES.includes(p.type) || !validSquare(p.square) || cells.has(p.square)) throw Error('Invalid or overlapping initial piece.');
    const sideIndex = pieces.slice(0,i).filter(q=>q.color===p.color).length;
    const id = p.id ?? `${p.color}-${p.type}-${sideIndex}`;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(id) || ids.has(id)) throw Error('Invalid or duplicate piece ID.');
    cells.add(p.square); ids.add(id); return {id,color:p.color,type:p.type,square:p.square};
  });
  for (const side of ['white','black']) {
    if (!pieces.some(p=>p.color===side)) throw Error('Both sides require pieces.');
    if (pieces.some(p=>p.color===side && p.square===targets[side])) throw Error('A piece cannot start on its own victory target.');
  }
  const flags = input.flags ?? {white: targets.black, black: targets.white};
  if (!validSquare(flags.white) || !validSquare(flags.black) || flags.white === flags.black) throw Error('Invalid flag squares.');
  return {
    length, width, boardSize: length === width ? length : undefined,
    firstSide, maxTurns, timeTurnLimit, moveTimeLimitMs:timeTurnLimit, targets:{...targets}, flags:{...flags},
    initialPieces:pieces, mapName:String(input.mapName || `OTTv2 ${length}×${width}`).slice(0,100),
  };
}
module.exports = {buildConfig,normalizeConfig:buildConfig,PIECE_TYPES,MIN_SIZE,MAX_SIZE,squareToPoint};
