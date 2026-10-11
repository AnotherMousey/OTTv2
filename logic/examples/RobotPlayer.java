import ottv2.sdk.Piece;
import ottv2.sdk.RobotController;
import java.util.List;

public final class RobotPlayer {
  public static void run(RobotController rc) throws Exception {
    Strategy strategy = new GreedyStrategy();
    while (true) {
      if (rc.hasMoves()) {
        strategy.playTurn(rc);
      }
      rc.yieldTurn();
    }
  }

  private interface Strategy {
    void playTurn(RobotController controller);
  }

  private static final class GreedyStrategy implements Strategy {
    @Override
    public void playTurn(RobotController controller) {
      List<Piece> pieces = controller.sensePieces();
      for (Piece piece : pieces) {
        if (!piece.color().equals(controller.getColor())) continue;

        for (int fileStep = -1; fileStep <= 1; fileStep++) {
          for (int rankStep = -1; rankStep <= 1; rankStep++) {
            if (fileStep == 0 && rankStep == 0) continue;
            String destination = adjacentSquare(piece.square(), fileStep, rankStep);
            Piece target = controller.getState().board().pieceAt(destination);

            // The engine rejects same-type captures, so do not submit them.
            if (target != null && (target.color().equals(controller.getColor())
                || !beats(piece.type(), target.type()))) {
              continue;
            }
            if (controller.canMove(piece.square(), destination)) {
              controller.move(piece.square(), destination);
              return;
            }
          }
        }
      }
    }

    private static String adjacentSquare(String square, int fileStep, int rankStep) {
      return String.valueOf((char) (square.charAt(0) + fileStep))
          + (char) (square.charAt(1) + rankStep);
    }

    private static boolean beats(String attacker, String defender) {
      return ("rock".equals(attacker) && "scissors".equals(defender))
          || ("scissors".equals(attacker) && "paper".equals(defender))
          || ("paper".equals(attacker) && "rock".equals(defender));
    }
  }
}
