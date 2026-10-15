#include <iostream>
#include "ottv2.hpp"

// The bot implements this. It receives only the game engine.
ottv2::Move choose_move(const ottv2::gameEngine&);

int main() {
  while (std::cin.good()) {
    auto state = ottv2::detail::read_state(std::cin);
    if (state.getColor().empty()) break;
    ottv2::detail::yield_turn(choose_move(state.getGameEngine()));
  }
}
