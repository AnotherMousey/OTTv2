package ottv2.sdk;

public final class Soldier {
  private final TeamType team;
  private final SoldierType soldier;
  private final int id;
  private final Coordinate position;

  public Soldier(TeamType team, SoldierType soldier, int id) {
    this(team, soldier, id, new Coordinate(0, 0));
  }

  public Soldier(TeamType team, SoldierType soldier, int id, Coordinate position) {
    this.team = team;
    this.soldier = soldier;
    this.id = id;
    this.position = position;
  }

  public TeamType getTeamType() { return team; }
  public SoldierType getSoldierType() { return soldier; }
  public int getId() { return id; }
  public Coordinate getPosition() { return position; }
  public Move moveTo(Direction direction) {
    int dx = 0;
    int dy = 0;
    switch (direction) {
      case N -> dy = 1;
      case NE -> { dx = 1; dy = 1; }
      case E -> dx = 1;
      case SE -> { dx = 1; dy = -1; }
      case S -> dy = -1;
      case SW -> { dx = -1; dy = -1; }
      case W -> dx = -1;
      case NW -> { dx = -1; dy = 1; }
    }
    Coordinate destination = new Coordinate(position.xCor() + dx, position.yCor() + dy);
    return new Move(square(position), square(destination));
  }

  private static String square(Coordinate point) {
    return String.valueOf((char) ('a' + point.xCor())) + (point.yCor() + 1);
  }
}
