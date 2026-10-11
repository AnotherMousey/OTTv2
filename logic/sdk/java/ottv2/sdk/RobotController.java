package ottv2.sdk;

import java.util.List;

public interface RobotController {
  String getColor();
  String getCurrentTurn();
  int getTurnNumber();
  GameState getState();
  List<Piece> sensePieces();
  boolean hasMoves();
  boolean canMove(String from, String to);
  void move(String from, String to);

  // Ends the current turn and waits for the next state from the grader.
  void yieldTurn() throws InterruptedException;
}
