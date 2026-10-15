package ottv2.sdk;

import java.util.List;

public final class Team {
  private final Coordinate flag;
  private final List<Soldier> soldiers;

  public Team(Coordinate flag, List<Soldier> soldiers) {
    this.flag = flag;
    this.soldiers = List.copyOf(soldiers);
  }

  public Coordinate getFlag() { return flag; }
  public List<Soldier> getSoldiers() { return soldiers; }
}
