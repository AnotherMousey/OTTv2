import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import ottv2.sdk.Move;
import ottv2.sdk.Piece;
import ottv2.sdk.GameState;
import ottv2.sdk.RobotController;

public final class JavaRunner {
  private static final class Controller implements RobotController {
    private final BufferedReader input;
    private GameState state;
    private Move pendingMove;

    Controller(BufferedReader input, String firstState) {
      this.input = input;
      update(firstState);
    }

    private void update(String line) {
      String[] fields = line.split("\\|", -1);
      ArrayList<Piece> next = new ArrayList<>();
      int size = 9;
      for (int i = 3; i < fields.length; i++) {
        if (fields[i].startsWith("@boardSize=")) { size=Integer.parseInt(fields[i].substring(11)); continue; }
        String[] piece = fields[i].split(",", -1);
        if (piece.length == 4) next.add(new Piece(piece[0], piece[1], piece[2], piece[3]));
      }
      state = new GameState(fields[0], fields[1], Integer.parseInt(fields[2]), next, size);
    }

    @Override public String getColor() { return state.color(); }
    @Override public String getCurrentTurn() { return state.currentTurn(); }
    @Override public int getTurnNumber() { return state.turnNumber(); }
    @Override public GameState getState() { return state; }
    @Override public List<Piece> sensePieces() { return state.pieces(); }
    @Override public boolean hasMoves() { return state.hasMoves(); }

    @Override
    public boolean canMove(String from, String to) {
      return state.canMove(from, to);
    }

    @Override
    public void move(String from, String to) {
      pendingMove = new Move(from, to);
    }

    @Override
    public void yieldTurn() throws InterruptedException {
      Move move = pendingMove == null ? new Move("", "") : pendingMove;
      pendingMove = null;
      System.out.println(move.from() + " " + move.to());
      System.out.flush();
      String next;
      try {
        next = input.readLine();
      } catch (java.io.IOException error) {
        InterruptedException interrupted = new InterruptedException("grader input failed");
        interrupted.initCause(error);
        throw interrupted;
      }
      if (next == null) throw new InterruptedException("grader closed input");
      update(next);
    }

  }

  public static void main(String[] args) throws Exception {
    if (args.length != 1) throw new IllegalArgumentException("color is required");
    BufferedReader input = new BufferedReader(new InputStreamReader(System.in));
    String firstState = input.readLine();
    if (firstState == null) return;
    Controller controller = new Controller(input, firstState);
    Class<?> player = Class.forName("RobotPlayer");
    player.getMethod("run", RobotController.class).invoke(null, controller);
  }
}
