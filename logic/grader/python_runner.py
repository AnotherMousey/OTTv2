import importlib.util
import sys
from ottv2 import read_state, yield_turn

spec = importlib.util.spec_from_file_location("player", sys.argv[1])
player = importlib.util.module_from_spec(spec)
spec.loader.exec_module(player)

while True:
    state = read_state()
    if state is None:
        break
    yield_turn(player.choose_move(state))
