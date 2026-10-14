#include <iostream>
#include "ottv2.hpp"

ottv2::Move choose_move(const ottv2::State&);

int main() {
  while (std::cin.good()) {
    auto state = ottv2::read_state(std::cin);
    if (state.getColor().empty()) break;
    ottv2::yield_turn(choose_move(state));
  }
}
