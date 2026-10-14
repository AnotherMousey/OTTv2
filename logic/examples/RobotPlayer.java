import ottv2.sdk.Direction;
import ottv2.sdk.RobotController;

public final class RobotPlayer {
  public static void run(RobotController controller) throws Exception {
    while (true) {
      if (controller.hasMoves() && !controller.getTeam().getSoldiers().isEmpty()) {
        controller.submitMove(
            controller.getTeam().getSoldiers().get(0).moveTo(Direction.NE));
      }
      controller.yieldTurn();
    }
  }
}
