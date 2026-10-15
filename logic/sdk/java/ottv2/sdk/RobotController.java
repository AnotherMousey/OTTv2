package ottv2.sdk;

public interface RobotController {
  String getColor();
  String getCurrentTurn();
  int getTurnNumber();
  GameState getState();
  java.util.List<Piece> sensePieces();
  boolean canMove(String from, String to);
  void move(String from, String to);
  GameEngine getGameEngine();
  Team getTeam();
  Team getEnemyTeam();
  boolean hasMoves();
  void submitMove(Move move);

  // Ends the current turn and waits for the next state from the grader.
  void yieldTurn() throws InterruptedException;
}
