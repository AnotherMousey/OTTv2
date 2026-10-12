package ottv2.sdk;

import java.util.List;

public final class Board {
  public static final int SIZE = 9;
  private final List<Piece> pieces;
  private final int size;

  public Board(List<Piece> pieces) {
    this(pieces, SIZE);
  }

  public Board(List<Piece> pieces, int size) {
    this.size = size;
    this.pieces = List.copyOf(pieces);
  }

  public int size() { return size; }

  public List<Piece> pieces() { return pieces; }

  public Piece pieceAt(String square) {
    return pieces.stream()
        .filter(piece -> piece.square().equals(square))
        .findFirst()
        .orElse(null);
  }

  public boolean containsOwnPiece(String square, String color) {
    Piece piece = pieceAt(square);
    return piece != null && piece.color().equals(color);
  }

  public boolean canStep(String from, String to, String color) {
    if (from == null || to == null || from.length() < 2 || to.length() < 2
        || from.equals(to) || !isSquare(from) || !isSquare(to)) return false;
    int fileDelta = Math.abs(from.charAt(0) - to.charAt(0));
    int rankDelta = Math.abs(Integer.parseInt(from.substring(1)) - Integer.parseInt(to.substring(1)));
    if (fileDelta > 1 || rankDelta > 1) return false;
    Piece source = pieceAt(from);
    Piece target = pieceAt(to);
    return source != null && source.color().equals(color)
        && (target == null || (!target.color().equals(color) && !target.type().equals(source.type())));
  }

  private boolean isSquare(String square) {
    if (!square.matches("[a-z][0-9]{1,2}")) return false;
    int rank=Integer.parseInt(square.substring(1));
    return square.charAt(0)>='a' && square.charAt(0)<'a'+size && rank>=1 && rank<=size;
  }
}
