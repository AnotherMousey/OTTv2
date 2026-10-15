package ottv2.sdk;

import java.util.List;

public final class GameState {
  private final String color;
  private final String currentTurn;
  private final int turnNumber;
  private final Board board;

  public GameState(String color, String currentTurn, int turnNumber, List<Piece> pieces) {
    this(color,currentTurn,turnNumber,pieces,Board.SIZE);
  }

  public GameState(String color, String currentTurn, int turnNumber, List<Piece> pieces, int size) {
    this(color,currentTurn,turnNumber,pieces,size,size);
  }

  public GameState(String color, String currentTurn, int turnNumber, List<Piece> pieces, int length, int width) {
    this.color = color;
    this.currentTurn = currentTurn;
    this.turnNumber = turnNumber;
    this.board = new Board(pieces,length,width);
  }

  public String color() { return color; }
  public String currentTurn() { return currentTurn; }
  public int turnNumber() { return turnNumber; }
  public Board board() { return board; }
  public List<Piece> pieces() { return board.pieces(); }
  public boolean hasMoves() { return color.equals(currentTurn); }
  public boolean canMove(String from, String to) {
    return hasMoves() && board.canStep(from, to, color);
  }
}
