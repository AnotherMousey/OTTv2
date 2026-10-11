package ottv2.sdk;

import java.util.Objects;

public final class Move {
  private final String from;
  private final String to;

  public Move(String from, String to) {
    this.from = Objects.requireNonNull(from);
    this.to = Objects.requireNonNull(to);
  }

  public String from() { return from; }
  public String to() { return to; }
  public boolean isEmpty() { return from.isEmpty() || to.isEmpty(); }
}
