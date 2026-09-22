import { useMemo, useState } from "react";
import Square from "./Square.jsx";
import { BOARD_SIZE } from "../game/constants.js";
import { getPieceAt, getValidMoves } from "../game/rules.js";

export default function Board({ game, role, onMove, orientation = "white" }) {
  const [selectedPieceId, setSelectedPieceId] = useState(null);

  const selectedPiece = selectedPieceId ? game.pieces[selectedPieceId] : null;
  const validMoves = useMemo(
    () => (selectedPiece?.alive ? getValidMoves(game.pieces, selectedPieceId) : []),
    [game.pieces, selectedPieceId, selectedPiece?.alive],
  );

  const validMoveMap = useMemo(() => {
    const map = new Map();
    validMoves.forEach((move) => map.set(`${move.row}:${move.col}`, move));
    return map;
  }, [validMoves]);

  function handleSquareClick(row, col) {
    if (game.status !== "playing" || game.winner) return;
    if (role !== game.turn) return;

    const clickedPiece = getPieceAt(game.pieces, row, col);

    if (clickedPiece?.player === role) {
      setSelectedPieceId(clickedPiece.id);
      return;
    }

    if (!selectedPieceId) return;
    const move = validMoveMap.get(`${row}:${col}`);
    if (!move) return;

    onMove(selectedPieceId, { row, col });
    setSelectedPieceId(null);
  }

  const rows = orientation === "black"
    ? Array.from({ length: BOARD_SIZE }, (_, index) => index + 1)
    : Array.from({ length: BOARD_SIZE }, (_, index) => BOARD_SIZE - index);
  const cols = orientation === "black"
    ? Array.from({ length: BOARD_SIZE }, (_, index) => BOARD_SIZE - 1 - index)
    : Array.from({ length: BOARD_SIZE }, (_, index) => index);

  return (
    <div className="board-shell">
      <div className="board" role="grid" aria-label="OTT V2 board">
        {rows.flatMap((row) =>
          cols.map((col) => {
            const piece = getPieceAt(game.pieces, row, col);
            return (
              <Square
                key={`${row}-${col}`}
                row={row}
                col={col}
                piece={piece}
                selected={piece?.id === selectedPieceId}
                validMove={validMoveMap.get(`${row}:${col}`)}
                lastMove={game.lastMove}
                onClick={() => handleSquareClick(row, col)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
