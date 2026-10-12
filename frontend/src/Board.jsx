import React from 'react';
import { resolveGame } from './games/registry.js';
export function Board(props) {
  const game = resolveGame(props.replay || {gameId: 'ottv2'});
  const Renderer = game.Board;
  return <Renderer {...props} />;
}
