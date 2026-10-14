package ottv2.sdk;

import java.util.List;

public final class GameEngine {
  private final Coordinate size;
  private final int length;
  private final int width;
  private final int totalTurns;
  private final int timeTurnLimit;
  private final List<Soldier> soldiers;

  public GameEngine(int length, int width, int totalTurns, int timeTurnLimit, List<Soldier> soldiers) {
    this(new Coordinate(length, width), totalTurns, timeTurnLimit, soldiers);
  }

  public GameEngine(Coordinate size, int totalTurns, int timeTurnLimit, List<Soldier> soldiers) {
    this.size = size;
    this.length = size.xCor();
    this.width = size.yCor();
    this.totalTurns = totalTurns;
    this.timeTurnLimit = timeTurnLimit;
    this.soldiers = List.copyOf(soldiers);
  }

  public Coordinate getSize() { return size; }
  public int getLength() { return length; }
  public int getWidth() { return width; }
  public int getTotalTurns() { return totalTurns; }
  public int getTimeTurnLimit() { return timeTurnLimit; }
  public List<Soldier> getSoldiers() { return soldiers; }
}
