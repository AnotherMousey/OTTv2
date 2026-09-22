import { BOARD_SIZE, FILES } from "../game/constants.js";

export function coordinateToPosition(coordinate) {
  const normalized = String(coordinate).trim().toLowerCase();
  const file = normalized[0];
  const row = Number(normalized.slice(1));
  const col = FILES.indexOf(file);

  if (col < 0 || row < 1 || row > BOARD_SIZE) {
    throw new Error(`Invalid coordinate: ${coordinate}`);
  }

  return { row, col };
}

export function positionToCoordinate(row, col) {
  return `${FILES[col]}${row}`;
}

export function samePosition(a, b) {
  return a.row === b.row && a.col === b.col;
}
