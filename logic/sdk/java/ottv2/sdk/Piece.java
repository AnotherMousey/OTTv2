package ottv2.sdk;

import java.util.Objects;

public final class Piece {
  private final String id;
  private final String color;
  private final String type;
  private final String square;

  public Piece(String id, String color, String type, String square) {
    this.id = Objects.requireNonNull(id);
    this.color = Objects.requireNonNull(color);
    this.type = Objects.requireNonNull(type);
    this.square = Objects.requireNonNull(square);
  }

  public String getId() { return id; }
  public String getColor() { return color; }
  public String getType() { return type; }
  public String getSquare() { return square; }
}
