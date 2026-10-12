import { Board as OttBoard } from './ottv2/Board.jsx';
import { Board as GridBoard } from './grid-demo/Board.jsx';
import { Pixel } from './ottv2/Pixel.jsx';
import React from 'react';
const games = {
  ottv2: {title: 'OTTv2', Board: OttBoard, Piece: Pixel, types: ['rock','paper','scissors'], reasonLabel: reason => ({'enemy-source-reached':'Enemy source reached','move-limit-more-pieces':'Turn limit — more pieces','move-limit-draw':'Turn limit — draw','all-pieces-eliminated':'All enemy pieces eliminated','type-eliminated':'Enemy piece type eliminated','timeout':'Player clock expired','forfeit':'Player forfeited','bot-error':'Bot failed'}[reason] || reason), label: t => t === 'rock' ? 'Hammer' : t},
  'grid-demo': {title: 'Grid Demo', Board: GridBoard, Piece: ({side}) => React.createElement('span', {style:{color:side === 'black' ? '#458de0' : '#f5a641'}}, '●'), types:['token'], label:t=>t},
};
export function resolveGame(replay) {
  const game = games[replay.gameId];
  if (!game || (replay.rendererVersion ?? '1') !== '1') throw Error('Unsupported game renderer.');
  return game;
}
