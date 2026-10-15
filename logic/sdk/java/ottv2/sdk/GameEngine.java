package ottv2.sdk;

import java.util.List;

public final class GameEngine {
  private final Coordinate size;
  private final int length;
  private final int width;
  private final int totalTurns;
  private final int timeTurnLimit;
  private final List<Soldier> soldiers;
  private final Coordinate flag;
  private final Coordinate enemyFlag;
  private final int turnNumber;

  public GameEngine(int length, int width, int totalTurns, int timeTurnLimit, List<Soldier> soldiers) {
    this(new Coordinate(length, width), totalTurns, timeTurnLimit, soldiers);
  }

  public GameEngine(Coordinate size, int totalTurns, int timeTurnLimit, List<Soldier> soldiers) {
    this(size, totalTurns, timeTurnLimit, soldiers, null, null, 0);
  }

  public GameEngine(Coordinate size, int totalTurns, int timeTurnLimit, List<Soldier> soldiers,
                    Coordinate flag, Coordinate enemyFlag, int turnNumber) {
    this.size = size;
    this.length = size.xCor();
    this.width = size.yCor();
    this.totalTurns = totalTurns;
    this.timeTurnLimit = timeTurnLimit;
    this.soldiers = List.copyOf(soldiers);
    this.flag = flag;
    this.enemyFlag = enemyFlag;
    this.turnNumber = turnNumber;
  }

  public Coordinate getSize() { return size; }
  public int getLength() { return length; }
  public int getWidth() { return width; }
  public int getTotalTurns() { return totalTurns; }
  public int getTimeTurnLimit() { return timeTurnLimit; }
  public List<Soldier> getSoldiers() { return soldiers; }
  // Your own flag; the enemy wins by reaching it.
  public Coordinate getFlag() { return flag; }
  // The enemy flag; you win by reaching it.
  public Coordinate getEnemyFlag() { return enemyFlag; }
  // Turns already played in this match.
  public int getTurnNumber() { return turnNumber; }
}
