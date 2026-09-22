import { MAX_HISTORY, PIECE_LABELS, PLAYERS } from "./constants.js";
import { checkWinCondition, getPieceAt, getValidMoves, resolveBattle } from "./rules.js";
import { positionToCoordinate } from "../utils/coordinates.js";

export function getOpponent(player) {
  return player === PLAYERS.ONE ? PLAYERS.TWO : PLAYERS.ONE;
}

export function movePiece(pieces, pieceId, target) {
  const attacker = pieces[pieceId];
  if (!attacker?.alive) return { ok: false, reason: "Piece is not available." };

  const legalMove = getValidMoves(pieces, pieceId).find(
    (move) => move.row === target.row && move.col === target.col,
  );
  if (!legalMove) return { ok: false, reason: "Illegal move." };

  const from = { row: attacker.row, col: attacker.col };
  const defender = getPieceAt(pieces, target.row, target.col);
  let battle = "move";
  let captured = null;

  if (!defender) {
    attacker.row = target.row;
    attacker.col = target.col;
  } else {
    battle = resolveBattle(attacker, defender);

    if (battle === "attacker") {
      defender.alive = false;
      captured = defender;
      attacker.row = target.row;
      attacker.col = target.col;
    } else if (battle === "defender") {
      attacker.alive = false;
      captured = attacker;
    } else {
      return { ok: false, reason: "Equal pieces block each other." };
    }
  }

  return {
    ok: true,
    pieceId,
    attackerType: attacker.type,
    attackerPlayer: attacker.player,
    from,
    to: target,
    battle,
    defenderType: defender?.type ?? null,
    capturedId: captured?.id ?? null,
  };
}

export function formatMoveHistory(result, moveNumber) {
  const playerName = result.attackerPlayer === PLAYERS.ONE ? "P1" : "P2";
  const pieceName = PIECE_LABELS[result.attackerType];
  const from = positionToCoordinate(result.from.row, result.from.col);
  const to = positionToCoordinate(result.to.row, result.to.col);

  if (result.battle === "attacker") {
    return `${moveNumber}. ${playerName} ${pieceName}: ${from} × ${to} ${PIECE_LABELS[result.defenderType]}`;
  }

  if (result.battle === "defender") {
    return `${moveNumber}. ${playerName} ${pieceName}: ${from} → ${to} (lost to ${PIECE_LABELS[result.defenderType]})`;
  }

  return `${moveNumber}. ${playerName} ${pieceName}: ${from} → ${to}`;
}

export function applyTurn(draft, pieceId, target) {
  if (draft.winner || draft.status !== "playing") {
    return { ok: false, reason: "Game is not active." };
  }

  const piece = draft.pieces[pieceId];
  if (!piece || piece.player !== draft.turn) {
    return { ok: false, reason: "That piece cannot move this turn." };
  }

  const result = movePiece(draft.pieces, pieceId, target);
  if (!result.ok) return result;

  draft.moveNumber += 1;
  draft.lastMove = {
    from: result.from,
    to: result.to,
    pieceId,
  };
  draft.history.push(formatMoveHistory(result, draft.moveNumber));
  if (draft.history.length > MAX_HISTORY) {
    draft.history.splice(0, draft.history.length - MAX_HISTORY);
  }

  const win = checkWinCondition(draft.pieces);
  if (win) {
    draft.winner = win.winner;
    draft.winReason = win.reason;
    draft.status = "finished";
  } else {
    draft.turn = getOpponent(draft.turn);
  }

  return result;
}
