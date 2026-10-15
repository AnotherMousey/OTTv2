// Starter bots shown to players. Bots receive only the game engine.
export const pythonExample = `from ottv2 import *

# Aggressive example: capture when the capture wins, otherwise step towards
# the enemy flag. Works as either colour and on any map size.
BEATS = {rock: scissor, scissor: paper, paper: rock}
STEPS = {N: (0, 1), NE: (1, 1), E: (1, 0), SE: (1, -1), S: (0, -1), SW: (-1, -1), W: (-1, 0), NW: (-1, 1)}


def choose_move(game):
    target = game.getEnemyFlag()
    occupied = {(s.getPosition().getXCor(), s.getPosition().getYCor()): s for s in game.getSoldiers()}
    best, best_score = None, None

    for soldier in game.getTeam().getSoldiers():
        x, y = soldier.getPosition().getXCor(), soldier.getPosition().getYCor()
        for direction, (dx, dy) in STEPS.items():
            nx, ny = x + dx, y + dy
            if not (0 <= nx < game.getLength() and 0 <= ny < game.getWidth()):
                continue
            other = occupied.get((nx, ny))
            if other is not None and other.getTeamType() == soldier.getTeamType():
                continue
            if other is not None and BEATS[soldier.getSoldierType()] != other.getSoldierType():
                continue
            score = max(abs(nx - target.getXCor()), abs(ny - target.getYCor()))
            if other is not None:
                score -= 1000  # Winning captures come first.
            if best_score is None or score < best_score:
                best, best_score = soldier.moveTo(direction), score

    # An empty move only if no legal move exists; the turn is skipped.
    return best or ("", "")`;
export const cppExample = `#include "ottv2.hpp"
#include <algorithm>
#include <cstdlib>
#include <limits>

using namespace ottv2;

// Aggressive example: capture when the capture wins, otherwise step towards
// the enemy flag. Works as either colour and on any map size.
namespace {
bool beats(SoldierType attacker, SoldierType defender) {
  return (attacker == SoldierType::rock && defender == SoldierType::scissor)
      || (attacker == SoldierType::scissor && defender == SoldierType::paper)
      || (attacker == SoldierType::paper && defender == SoldierType::rock);
}

const Soldier* soldier_at(const GameEngine& game, int x, int y) {
  for (const auto& soldier : game.getSoldiers()) {
    if (soldier.getPosition().getXCor() == x && soldier.getPosition().getYCor() == y) return &soldier;
  }
  return nullptr;
}
}

Move choose_move(const GameEngine& game) {
  // Same order as Direction: N, NE, E, SE, S, SW, W, NW.
  static constexpr int dx[] = {0, 1, 1, 1, 0, -1, -1, -1};
  static constexpr int dy[] = {1, 1, 0, -1, -1, -1, 0, 1};
  const Coordinate target = game.getEnemyFlag();
  Move best{"", ""};
  int best_score = std::numeric_limits<int>::max();

  for (const auto& soldier : game.getTeam().getSoldiers()) {
    for (int d = 0; d < 8; ++d) {
      const int x = soldier.getPosition().getXCor() + dx[d];
      const int y = soldier.getPosition().getYCor() + dy[d];
      if (x < 0 || x >= game.getLength() || y < 0 || y >= game.getWidth()) continue;

      const Soldier* other = soldier_at(game, x, y);
      if (other && other->getTeamType() == soldier.getTeamType()) continue;
      if (other && !beats(soldier.getSoldierType(), other->getSoldierType())) continue;

      int score = std::max(std::abs(x - target.getXCor()), std::abs(y - target.getYCor()));
      if (other) score -= 1000;  // Winning captures come first.
      if (score < best_score) {
        best_score = score;
        best = soldier.moveTo(static_cast<Direction>(d));
      }
    }
  }
  return best;  // An empty move only if no legal move exists; the turn is skipped.
}`;
export const javaExample = `import ottv2.sdk.Coordinate;
import ottv2.sdk.Direction;
import ottv2.sdk.GameEngine;
import ottv2.sdk.Move;
import ottv2.sdk.RobotController;
import ottv2.sdk.Soldier;

public final class RobotPlayer {
  public static void run(RobotController controller) throws Exception {
    while (true) {
      if (controller.hasMoves()) {
        Move best = null;
        int bestDistance = Integer.MAX_VALUE;
        GameEngine game = controller.getGameEngine();
        Coordinate target = game.getEnemyFlag();
        // Step towards the enemy flag; works as either colour.
        for (Soldier soldier : controller.getTeam().getSoldiers()) {
          for (Direction direction : Direction.values()) {
            Move move = soldier.moveTo(direction);
            if (!controller.canMove(move.from(), move.to())) continue;
            int x = move.to().charAt(0) - 'a', y = Integer.parseInt(move.to().substring(1)) - 1;
            int distance = Math.max(Math.abs(x - target.xCor()), Math.abs(y - target.yCor()));
            if (distance < bestDistance) {
              best = move;
              bestDistance = distance;
            }
          }
        }
        if (best != null) controller.submitMove(best);
      }
      controller.yieldTurn();
    }
  }
}`;
