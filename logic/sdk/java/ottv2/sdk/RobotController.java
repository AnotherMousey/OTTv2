package ottv2.sdk;

public interface RobotController {
  GameEngine getGameEngine();
  Team getTeam();
  Team getEnemyTeam();
  boolean hasMoves();
  void submitMove(Move move);

  // Ends the current turn and waits for the next state from the grader.
  void yieldTurn() throws InterruptedException;
}
