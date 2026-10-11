#pragma once
#include <sstream>
#include <string>
#include <vector>
#include <iostream>
#include <utility>

namespace ottv2 {
struct Piece { std::string id, color, type, square; };
struct State {
  std::string color, current_turn;
  int turn_number{};
  std::vector<Piece> pieces;
  bool has_moves() const { return color == current_turn; }
};
struct Move { std::string from, to; };

inline State read_state(std::istream& input) {
  std::string line;
  if (!std::getline(input, line)) return {};
  State state;
  std::stringstream fields(line);
  std::string field;
  std::vector<std::string> values;
  while (std::getline(fields, field, '|')) values.push_back(field);
  if (values.size() < 3) return {};
  state.color = values[0]; state.current_turn = values[1];
  state.turn_number = std::stoi(values[2]);
  for (size_t i = 3; i < values.size(); ++i) {
    std::stringstream piece(values[i]);
    std::vector<std::string> parts;
    while (std::getline(piece, field, ',')) parts.push_back(field);
    if (parts.size() == 4) state.pieces.push_back({parts[0], parts[1], parts[2], parts[3]});
  }
  return state;
}
inline Move move(std::string from, std::string to) { return {std::move(from), std::move(to)}; }
inline void yield_turn(const Move& next) {
  std::cout << next.from << ' ' << next.to << '\n' << std::flush;
}
}
