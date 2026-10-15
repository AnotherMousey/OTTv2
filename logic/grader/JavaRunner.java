import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import ottv2.sdk.Move;
import ottv2.sdk.Piece;
import ottv2.sdk.RobotController;
import ottv2.sdk.Coordinate;
import ottv2.sdk.Direction;
import ottv2.sdk.GameEngine;
import ottv2.sdk.Soldier;
import ottv2.sdk.SoldierType;
import ottv2.sdk.Team;
import ottv2.sdk.TeamType;

public final class JavaRunner {
  private static final class Controller implements RobotController {
    private final BufferedReader input;
    private String color;
    private String currentTurn;
    private GameEngine engine;
    private Team team;
    private Team enemyTeam;
    private Soldier soldier;
    private Move pendingMove;
    private ottv2.sdk.GameState state;

    Controller(BufferedReader input, String firstState) {
      this.input = input;
      update(firstState);
    }

    private void update(String line) {
      String[] fields = line.split("\\|", -1);
      ArrayList<Piece> next = new ArrayList<>();
      int length = 9;
      int width = 9;
      int totalTurns = 0;
      int turnLimitMs = 1000;
      for (int i = 3; i < fields.length; i++) {
        if (fields[i].startsWith("@boardSize=")) {
          length = Integer.parseInt(fields[i].substring(11));
          width = length;
          continue;
        }
        if (fields[i].startsWith("@length=")) { length=Integer.parseInt(fields[i].substring(8)); continue; }
        if (fields[i].startsWith("@width=")) { width=Integer.parseInt(fields[i].substring(7)); continue; }
        if (fields[i].startsWith("@maxTurns=")) { totalTurns=Integer.parseInt(fields[i].substring(10)); continue; }
        if (fields[i].startsWith("@timeTurnLimit=")) { turnLimitMs=Integer.parseInt(fields[i].substring(15)); continue; }
        String[] piece = fields[i].split(",", -1);
        if (piece.length == 4) next.add(new Piece(piece[0], piece[1], piece[2], piece[3]));
      }
      color = fields[0];
      currentTurn = fields[1];
      state = new ottv2.sdk.GameState(color, currentTurn, Integer.parseInt(fields[2]), next, length, width);
      ArrayList<Soldier> all = new ArrayList<>();
      ArrayList<Soldier> mine = new ArrayList<>();
      ArrayList<Soldier> theirs = new ArrayList<>();
      TeamType myType = "white".equals(fields[0]) ? TeamType.A : TeamType.B;
      for (int i = 0; i < next.size(); i++) {
        Piece piece = next.get(i);
        String square = piece.getSquare();
        Coordinate position = new Coordinate(
            square.charAt(0) - 'a', Integer.parseInt(square.substring(1)) - 1);
        Soldier current = new Soldier(myTypeFor(piece.getColor()), soldierTypeFor(piece.getType()), i, position);
        all.add(current);
        if (piece.getColor().equals(fields[0])) mine.add(current); else theirs.add(current);
      }
      engine = new GameEngine(length, width, (totalTurns == 0 ? 20 * length * width : totalTurns), turnLimitMs, all);
      Coordinate myFlag = parseFlag(fields, "white".equals(fields[0]) ? "white" : "black", length, width);
      Coordinate enemyFlag = parseFlag(fields, "white".equals(fields[0]) ? "black" : "white", length, width);
      team = new Team(myFlag, mine);
      enemyTeam = new Team(enemyFlag, theirs);
      soldier = mine.isEmpty() ? null : mine.get(0);
    }

    private static TeamType myTypeFor(String color) { return "white".equals(color) ? TeamType.A : TeamType.B; }
    private static SoldierType soldierTypeFor(String type) {
      return "rock".equals(type) ? SoldierType.rock : "paper".equals(type) ? SoldierType.paper : SoldierType.scissor;
    }
    private static Coordinate parseFlag(String[] fields, String color, int length, int width) {
      for (String field : fields) if (field.startsWith("@flag-" + color + "=")) {
        String value = field.substring(field.indexOf('=') + 1);
        if (!value.contains(",")) return new Coordinate(value.charAt(0) - 'a', Integer.parseInt(value.substring(1)) - 1);
        String[] parts = value.split(",");
        return new Coordinate(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
      }
      return new Coordinate(color.equals("white") ? 0 : length - 1, color.equals("white") ? 0 : width - 1);
    }

    @Override public String getColor() { return color; }
    @Override public String getCurrentTurn() { return currentTurn; }
    @Override public int getTurnNumber() { return state.turnNumber(); }
    @Override public ottv2.sdk.GameState getState() { return state; }
    @Override public java.util.List<Piece> sensePieces() { return state.pieces(); }
    @Override public boolean canMove(String from, String to) { return state.canMove(from, to); }
    @Override public void move(String from, String to) { submitMove(new Move(from, to)); }
    @Override public GameEngine getGameEngine() { return engine; }
    @Override public Team getTeam() { return team; }
    @Override public Team getEnemyTeam() { return enemyTeam; }
    @Override public boolean hasMoves() { return color.equals(currentTurn); }

    @Override
    public void submitMove(Move move) {
      pendingMove = move;
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
