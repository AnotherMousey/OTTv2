#include "ottv2.hpp"
#include <algorithm>
#include <cstdlib>
#include <limits>
#include <string>

namespace {
bool beats(const std::string& attacker, const std::string& defender) {
  return (attacker == "rock" && defender == "scissors")
      || (attacker == "scissors" && defender == "paper")
      || (attacker == "paper" && defender == "rock");
}

const ottv2::Piece* piece_at(const ottv2::State& state, const std::string& square) {
  for (const auto& piece : state.getPieces()) {
    if (piece.getSquare() == square) return &piece;
  }
  return nullptr;
}

std::string square_at(const std::string& square, int file_step, int rank_step) {
  const int rank = std::stoi(square.substr(1)) + rank_step;
  return std::string(1, static_cast<char>(square[0] + file_step)) + std::to_string(rank);
}

bool valid_square(const std::string& square, const ottv2::State& state) {
  if (square.size() < 2 || square[0] < 'a' || square[0] >= 'a' + state.getLength()) return false;
  const int rank = std::stoi(square.substr(1));
  return rank >= 1 && rank <= state.getWidth();
}

int distance_to_target(const std::string& square, const std::string& color) {
  const int target_file = color == "white" ? 'i' : 'a';
  const int target_rank = color == "white" ? '9' : '1';
  return std::abs(square[0] - target_file) + std::abs(square[1] - target_rank);
}
}

ottv2::Move choose_move(const ottv2::State& state) {
  struct Candidate {
    ottv2::Move move;
    int score;
  };
  Candidate best{{"", ""}, std::numeric_limits<int>::max()};

  for (const auto& piece : state.getPieces()) {
    if (piece.getColor() != state.getColor()) continue;
    for (int file_step = -1; file_step <= 1; ++file_step) {
      for (int rank_step = -1; rank_step <= 1; ++rank_step) {
        if (file_step == 0 && rank_step == 0) continue;
        const std::string destination = square_at(piece.getSquare(), file_step, rank_step);
        if (!valid_square(destination, state)) continue;

        const auto* target = piece_at(state, destination);
        if (target && target->getColor() == state.getColor()) continue;
        if (target && !beats(piece.getType(), target->getType())) continue;

        int score = distance_to_target(destination, state.getColor());
        if (target) score -= 1000; // Captures have priority over quiet moves.
        if (score < best.score) best = {{piece.getSquare(), destination}, score};
      }
    }
  }

  return best.move;
}
